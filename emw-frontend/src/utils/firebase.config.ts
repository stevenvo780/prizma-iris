/**
 * Obtener URL de API del backend desde variables de entorno
 * Centralizado para evitar hardcodeos en múltiples archivos
 */
const getApiUrl = (): string => {
  // Preferir variable de entorno (configurable por entorno)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback a localhost solo en desarrollo
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Si estamos en producción (run.app, iris-frontend, prizma.cloud), exigir NEXT_PUBLIC_API_URL
    if (hostname.includes('run.app') || hostname.includes('iris-frontend') || hostname.includes('prizma.cloud')) {
      console.error('ERROR: NEXT_PUBLIC_API_URL no está configurado. Por favor, configurar en variables de entorno.');
      // Retornar fallback temporal, pero esto debería fallar en producción
      return 'http://localhost:3001/api';
    }
  }

  // Localhost solo en dev local
  return 'http://localhost:3001/api';
};

const API_URL = getApiUrl();

let authMode = 'mock';

const getAuthMode = async () => {
  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/api/health`);
    const config = await response.json();

    if (process.env.NEXT_PUBLIC_AUTH_MODE) {
      authMode = process.env.NEXT_PUBLIC_AUTH_MODE;
    } else if (config?.authMode) {
      authMode = config.authMode;
    } else {
      authMode = 'mock';
    }

    return authMode;
  } catch (error) {
    console.warn('Could not fetch auth mode, using mock');
    return 'mock';
  }
};

getAuthMode();

const getStoredTokenLocal = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('iris_token');
  }
  return null;
};

export const auth = {
  currentUser: {
    getIdToken: async (forceRefresh: boolean = false) => {
      return getStoredTokenLocal() || 'mock-token-123';
    },
    uid: 'mock-user-123',
    email: 'mock@example.com',
  },
  onAuthStateChanged: (callback: any) => {
    setTimeout(() => callback(null), 100);
    return () => {};
  },
  signInWithEmailAndPassword: async (email: string, password: string) => {
    if (authMode === 'firebase') {
      throw new Error('Firebase mode detected - use Firebase SDK for authentication');
    }

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('iris_token', data.token);
        }
        return {
          user: {
            uid: data.user?.id || 'mock-uid',
            email,
            getIdToken: async () => data.token || 'mock-token-123',
          },
        };
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  },
  signInWithPopup: async (provider: any) => {
    return {
      user: {
        uid: 'mock-provider-uid',
        email: 'provider@example.com',
        getIdToken: async () => 'mock-provider-token-123',
      },
    };
  },
  createUserWithEmailAndPassword: async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ) => {
    try {
      const requestBody: any = { email, password };
      if (firstName && lastName) {
        requestBody.firstName = firstName;
        requestBody.lastName = lastName;
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          user: {
            uid: data.user?.id || 'mock-uid',
            email,
            getIdToken: async () => data.token || 'mock-token-123',
          },
        };
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    }
  },
  sendPasswordResetEmail: async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Password reset failed');
      }
    } catch (error) {
      throw error;
    }
  },
  signOut: async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('iris_token');
    }
  },
};

export const EmailAuthProvider = {
  credential: (email: string, password: string) => ({
    email,
    password,
    providerId: 'password',
  }),
};

export const compatAuth = auth;

export const reauthenticateWithCredential = async (user: any, credential: any) => {
  return Promise.resolve();
};

export const updatePassword = async (user: any, newPassword: string) => {
  return Promise.resolve();
};

export const uploadString = async (ref: any, data: string, format?: string) => {
  return Promise.resolve();
};

export const providers = {
  google: {
    providerId: 'google.com',
    addScope: () => {},
    setCustomParameters: () => {},
  },
  apple: {
    providerId: 'apple.com',
    addScope: () => {},
    setCustomParameters: () => {},
  },
  facebook: {
    providerId: 'facebook.com',
    addScope: () => {},
    setCustomParameters: () => {},
  },
  microsoft: {
    providerId: 'microsoft.com',
    addScope: () => {},
    setCustomParameters: () => {},
  },
} as const;

export type ProviderName = keyof typeof providers;

export const firestore = {
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ data: () => ({}) }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
    }),
  }),
};

export const storage = {
  ref: (path?: string) => ({
    put: () => Promise.resolve(),
    getDownloadURL: () => Promise.resolve(''),
  }),
  app: {} as any,
  maxUploadRetryTime: 120000,
  maxOperationRetryTime: 120000,
};

export const ref = (storage: any, path: string) => ({
  put: () => Promise.resolve(),
  getDownloadURL: () => Promise.resolve(''),
});

export const database = {
  ref: (path: string) => ({
    set: () => Promise.resolve(),
    once: () => Promise.resolve({ val: () => ({}) }),
    on: (eventType: string, callback: Function, errorCallback?: Function) => {
      setTimeout(() => callback({ val: () => null }), 100);
      return () => {};
    },
    off: () => {},
  }),
};

export const getStoredToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('iris_token');
  }
  return null;
};

export const isAuthenticated = () => {
  return !!getStoredToken();
};

export const getAuthHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default auth;

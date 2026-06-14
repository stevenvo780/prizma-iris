import { getAuthHeaders } from './firebase.config';

const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname.includes('run.app') || hostname.includes('emw-frontend')) {
      return 'https://emw-backend-6dalnsowyq-uc.a.run.app/api';
    }
  }

  return 'http://localhost:3001/api';
};

const API_URL = getApiUrl();

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint}`;
  const authHeaders = getAuthHeaders();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authHeaders.Authorization && { Authorization: authHeaders.Authorization }),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
};

export const authAPI = {
  login: async (email: string, password: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (email: string, password: string, name: string) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  getUser: async () => {
    return apiCall('/user');
  },

  updateUser: async (userData: any) => {
    return apiCall('/user', {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  },
};

export const whatsappAPI = {
  getAccounts: async () => {
    return apiCall('/whatsapp-accounts');
  },

  createAccount: async (phone: string, name: string) => {
    return apiCall('/whatsapp-accounts', {
      method: 'POST',
      body: JSON.stringify({ phone, name }),
    });
  },
};

export const customerAPI = {
  getCustomers: async () => {
    return apiCall('/customers');
  },

  createCustomer: async (customerData: any) => {
    return apiCall('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },
};

export const templateAPI = {
  getTemplates: async () => {
    return apiCall('/templates');
  },

  createTemplate: async (templateData: any) => {
    return apiCall('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  },
};

export const messageAPI = {
  getMessages: async () => {
    return apiCall('/messages');
  },

  sendMessage: async (to: string, message: string, template_id?: string) => {
    return apiCall('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ to, message, template_id }),
    });
  },
};

export const configAPI = {
  getConfig: async () => {
    const baseUrl = API_URL.replace('/api', '');
    const response = await fetch(`${baseUrl}/api/config`);
    return response.json();
  },

  getHealth: async () => {
    const baseUrl = API_URL.replace('/api', '');
    const response = await fetch(`${baseUrl}/health`);
    return response.json();
  },
};

const apiExports = {
  apiCall,
  authAPI,
  whatsappAPI,
  customerAPI,
  templateAPI,
  messageAPI,
  configAPI,
};

export default apiExports;

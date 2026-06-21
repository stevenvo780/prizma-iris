/**
 * Firebase Client SDK — Configuración real para EMW
 *
 * Se usa SOLO para Firestore real-time (chat).
 * La autenticación sigue siendo JWT contra el backend NestJS.
 * Todas las claves públicas vienen de variables de entorno.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'prizma-iris-dev.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'prizma-iris-dev',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'prizma-iris-dev.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '369749545791',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:369749545791:web:2d3c0c99f27a8db56c398a',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-66SX7TWSET',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://prizma-iris-dev-default-rtdb.firebaseio.com',
};

// Singleton: no reinicializar si ya existe
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore para chat real-time
export const db = getFirestore(app);

export default app;

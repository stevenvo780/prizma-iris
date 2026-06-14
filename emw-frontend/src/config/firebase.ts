/**
 * Firebase Client SDK — Configuración real para EMW
 *
 * Se usa SOLO para Firestore real-time (chat).
 * La autenticación sigue siendo JWT contra el backend NestJS.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBINnlK1IDUfXPwZJ3EjPCQdScja4DL04Y',
  authDomain: 'emw-dev.firebaseapp.com',
  projectId: 'emw-dev',
  storageBucket: 'emw-dev.firebasestorage.app',
  messagingSenderId: '369749545791',
  appId: '1:369749545791:web:2d3c0c99f27a8db56c398a',
  measurementId: 'G-66SX7TWSET',
  databaseURL: 'https://emw-dev-default-rtdb.firebaseio.com',
};

// Singleton: no reinicializar si ya existe
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore para chat real-time
export const db = getFirestore(app);

export default app;

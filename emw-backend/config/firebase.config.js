'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.initializeFirebase = initializeFirebase;
exports.verifyFirebaseToken = verifyFirebaseToken;
const admin = __importStar(require('firebase-admin'));
function initializeFirebase(config) {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.project_id,
          clientEmail: config.client_email,
          privateKey: config.private_key.replace(/\\n/g, '\n'),
        }),
        databaseURL:
          config.database_url || `https://${config.project_id}-default-rtdb.firebaseio.com`,
        storageBucket: config.storage_bucket || `${config.project_id}.appspot.com`,
      });
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw error;
    }
  }
  return admin;
}
async function verifyFirebaseToken(token) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);

    const expectedAudience = process.env.FIREBASE_PROJECT_ID || process.env.project_id;
    if (expectedAudience && decodedToken.aud !== expectedAudience) {
      throw new Error(`Invalid audience. Expected ${expectedAudience} but got ${decodedToken.aud}`);
    }
    return decodedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid Firebase token');
  }
}
exports.default = { initializeFirebase, verifyFirebaseToken };

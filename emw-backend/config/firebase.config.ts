import * as admin from 'firebase-admin';

export interface FirebaseConfig {
  project_id: string;
  private_key: string;
  client_email: string;
  database_url?: string;
  storage_bucket?: string;
}

export function initializeFirebase(config: FirebaseConfig) {
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

export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken> {
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

export default { initializeFirebase, verifyFirebaseToken };

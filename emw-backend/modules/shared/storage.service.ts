import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private bucket: admin.storage.Storage | null = null;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length === 0) {
        // En producción, __dirname es /app/dist/modules/shared
        // El config está en /app/config/
        const serviceAccountPath = path.join(process.cwd(), 'config/firebase-service-account.json');
        this.logger.log(`Loading Firebase credentials from: ${serviceAccountPath}`);
        const serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
        });

        this.logger.log(`Firebase initialized with bucket: ${serviceAccount.project_id}.firebasestorage.app`);
      }

      this.bucket = admin.storage();
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Storage:', error);
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ url: string; filename: string }> {
    if (!this.bucket) {
      throw new Error('Firebase Storage not initialized');
    }

    const bucket = admin.storage().bucket();
    const extension = path.extname(originalName);
    const filename = `uploads/${uuidv4()}${extension}`;

    const file = bucket.file(filename);

    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
      },
      public: true,
    });

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    this.logger.log(`File uploaded: ${publicUrl}`);

    return {
      url: publicUrl,
      filename: originalName,
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.bucket) {
      throw new Error('Firebase Storage not initialized');
    }

    try {
      const bucket = admin.storage().bucket();
      // Extract filename from URL
      const urlParts = fileUrl.split('/');
      const filename = urlParts.slice(-2).join('/'); // uploads/uuid.ext

      await bucket.file(filename).delete();
      this.logger.log(`File deleted: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${fileUrl}`, error);
    }
  }
}

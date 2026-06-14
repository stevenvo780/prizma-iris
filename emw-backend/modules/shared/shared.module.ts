import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { FirestoreService } from './firestore.service';

@Global()
@Module({
  providers: [StorageService, FirestoreService],
  exports: [StorageService, FirestoreService],
})
export class SharedModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { WhatsAppValidatorService } from './services/whatsapp-validator.service';
import { WhatsAppAccount } from './entities/whatsapp-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WhatsAppAccount])],
  controllers: [AccountsController],
  providers: [AccountsService, WhatsAppValidatorService],
  exports: [AccountsService, WhatsAppValidatorService],
})
export class AccountsModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { MessagesModule } from '../messages/messages.module';
import { WhatsAppAccount } from '../accounts/entities/whatsapp-account.entity';
import { MessageLog } from '../messages/entities/message-log.entity';
import { Template } from '../templates/entities/template.entity';
import { ConfigModule } from '@nestjs/config';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhatsAppAccount, MessageLog, Template]),
    ConfigModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => TemplatesModule),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}

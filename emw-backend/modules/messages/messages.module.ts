import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PendingMessagesService } from './services/pending-messages.service';
import { MessageLog } from './entities/message-log.entity';
import { PendingMessage } from './entities/pending-message.entity';
import { MessageTemplate } from './entities/message-template.entity';
import { WhatsAppAccount } from '../accounts/entities/whatsapp-account.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomersModule } from '../customers/customers.module';
import { TemplatesModule } from '../templates/templates.module';
import { WebhookModule } from '../webhook/webhook.module';
import { WhatsAppService } from './services/whatsapp.service';
import { User } from '../auth/entities/user.entity';

import { Template } from '../templates/entities/template.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([MessageLog, PendingMessage, MessageTemplate, WhatsAppAccount, Customer, Template, User]),
    forwardRef(() => WebhookModule),
    forwardRef(() => CustomersModule),
    TemplatesModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, PendingMessagesService, WhatsAppService],
  exports: [MessagesService, PendingMessagesService, WhatsAppService],
})
export class MessagesModule {}

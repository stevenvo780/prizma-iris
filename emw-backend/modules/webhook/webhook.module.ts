import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { WhatsappWebhookService } from './services/whatsapp-webhook.service';
import { WebhookEventService } from './services/webhook-event.service';
import { MessageLog } from '../messages/entities/message-log.entity';
import { WhatsAppAccount } from '../accounts/entities/whatsapp-account.entity';
import { Customer } from '../customers/entities/customer.entity';
import { MessagesModule } from '../messages/messages.module';
import { CustomersModule } from '../customers/customers.module';
import { WebhookService } from './webhook.service';
import { User } from '../auth/entities/user.entity';
import { TemplatesModule } from '../templates/templates.module';
import { Template } from '../templates/entities/template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageLog, WhatsAppAccount, Customer, User, Template]),
    forwardRef(() => MessagesModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => TemplatesModule),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WhatsappWebhookService, WebhookEventService],
  exports: [WebhookService, WhatsappWebhookService, WebhookEventService],
})
export class WebhookModule {}

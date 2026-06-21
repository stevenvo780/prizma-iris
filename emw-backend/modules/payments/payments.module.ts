import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { HubPaymentsWebhookController } from './hub-payments-webhook.controller';
import { WebhookLockService } from './webhook-lock.service';
import { User } from '../auth/entities/user.entity';
import { Payment } from './entities/payment.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { Customer } from '../customers/entities/customer.entity';
import { MessageLog } from '../messages/entities/message-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Payment, IdempotencyKey, Customer, MessageLog])],
  controllers: [PaymentsController, HubPaymentsWebhookController],
  providers: [PaymentsService, WebhookLockService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

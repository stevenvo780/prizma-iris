import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { User } from '../auth/entities/user.entity';
import { Template } from '../templates/entities/template.entity';
import { CustomerTagAssignment } from '../customer-tags/entities/customer-tag-assignment.entity';
import { CustomerTag } from '../customer-tags/entities/customer-tag.entity';
import { MessageLog } from '../messages/entities/message-log.entity';
import { WhatsAppAccount } from '../accounts/entities/whatsapp-account.entity';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      User,
      Template,
      CustomerTagAssignment,
      CustomerTag,
      MessageLog,
      WhatsAppAccount,
    ]),
    forwardRef(() => MessagesModule),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}

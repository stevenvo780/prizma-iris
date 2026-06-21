import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { MessagesModule } from './modules/messages/messages.module';
import { CustomersModule } from './modules/customers/customers.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { CustomerTagsModule } from './modules/customer-tags/customer-tags.module';
import { RobotModule } from './modules/robot/robot.module';
import { WppmsModule } from './modules/wppms/wppms.module';
import { OptInModule } from './modules/opt-in/opt-in.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SharedModule } from './modules/shared/shared.module';
import { ChatModule } from './modules/chat/chat.module';
import { PrizmaModule } from './modules/prizma/prizma.module';
import { NotificationAPIModule } from './modules/NotificationAPI';
import { DatabaseConfig } from './config/database.config';
import { Controller, Get } from '@nestjs/common';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return { status: 'healthy', service: 'iris' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    MessagesModule,
    CustomersModule,
    TemplatesModule,
    WebhookModule,
    AccountsModule,
    MetricsModule,
    CustomerTagsModule,
    RobotModule,
    WppmsModule,
    OptInModule,
    PaymentsModule,
    SharedModule,
    ChatModule,
    PrizmaModule,
    NotificationAPIModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MessageLog } from '../messages/entities/message-log.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Template } from '../templates/entities/template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageLog, Customer, Template])],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptInController } from './opt-in.controller';
import { OptInService } from './opt-in.service';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [OptInController],
  providers: [OptInService],
  exports: [OptInService],
})
export class OptInModule {}

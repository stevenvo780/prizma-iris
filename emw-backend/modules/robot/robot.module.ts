import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RobotController } from './robot.controller';
import { RobotService } from './robot.service';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [RobotController],
  providers: [RobotService],
  exports: [RobotService],
})
export class RobotModule {}

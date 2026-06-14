import { Module } from '@nestjs/common';
import { WppmsController } from './wppms.controller';
import { WppmsService } from './wppms.service';

@Module({
  controllers: [WppmsController],
  providers: [WppmsService],
  exports: [WppmsService],
})
export class WppmsModule {}

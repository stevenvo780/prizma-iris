import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('performance')
  async getPerformanceMetrics(@Request() req: any) {
    return this.metricsService.getPerformanceMetrics(req.user.id);
  }

  @Get('messages')
  async getMessageMetrics(@Request() req: any, @Query('period') period?: string) {
    return this.metricsService.getMessageMetrics(req.user.id, period);
  }
}

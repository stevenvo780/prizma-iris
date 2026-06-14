import { Controller, Get, Post, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WppmsService } from './wppms.service';

@ApiTags('WhatsApp MS')
@Controller('wppMS')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WppmsController {
  constructor(private readonly wppmsService: WppmsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get WhatsApp MS status' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp MS status retrieved successfully',
  })
  async getStatus() {
    return this.wppmsService.getStatus();
  }

  @Get('stop')
  @ApiOperation({ summary: 'Stop WhatsApp MS' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp MS stopped successfully',
  })
  async stop() {
    return this.wppmsService.stop();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get WhatsApp MS logs' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp MS logs retrieved successfully',
  })
  async getLogs(@Query('limit') limit?: string) {
    const logLimit = limit ? parseInt(limit) : 100;
    return this.wppmsService.getLogs(logLimit);
  }
}

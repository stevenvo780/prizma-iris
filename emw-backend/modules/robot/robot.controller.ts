import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RobotService, AutoReplyConfig } from './robot.service';

@ApiTags('Robot')
@Controller('robot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RobotController {
  constructor(private readonly robotService: RobotService) {}

  @Get('auto-reply')
  @ApiOperation({ summary: 'Get auto-reply configuration' })
  @ApiResponse({
    status: 200,
    description: 'Auto-reply configuration retrieved successfully',
  })
  async getAutoReplyConfig(@Req() req: any) {
    return this.robotService.getAutoReplyConfig(req.user.id);
  }

  @Put('auto-reply')
  @ApiOperation({ summary: 'Update auto-reply configuration' })
  @ApiResponse({
    status: 200,
    description: 'Auto-reply configuration updated successfully',
  })
  async updateAutoReplyConfig(
    @Req() req: any,
    @Body() config: AutoReplyConfig,
  ) {
    return this.robotService.updateAutoReplyConfig(req.user.id, config);
  }
}

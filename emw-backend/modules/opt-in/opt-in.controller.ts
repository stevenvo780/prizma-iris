import { Controller, Get, Post, Param, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptInService } from './opt-in.service';

@ApiTags('Opt-In')
@Controller('opt-in')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OptInController {
  constructor(private readonly optInService: OptInService) {}

  @Get(':phoneNumber')
  @ApiOperation({ summary: 'Get opt-in status for phone number' })
  @ApiResponse({
    status: 200,
    description: 'Opt-in status retrieved successfully',
  })
  async getOptInStatus(@Param('phoneNumber') phoneNumber: string, @Request() req) {
    return this.optInService.getOptInStatus(phoneNumber, req.user.id);
  }

  @Post(':phoneNumber')
  @ApiOperation({ summary: 'Set opt-in status for phone number' })
  @ApiResponse({
    status: 200,
    description: 'Opt-in status updated successfully',
  })
  async setOptInStatus(
    @Param('phoneNumber') phoneNumber: string,
    @Body() data: { optIn?: boolean; response?: string; source?: string },
    @Request() req
  ) {

    let optIn = data.optIn;
    if (data.response !== undefined) {
      const affirmativeResponses = ['sí', 'si', 'yes', 'y', 'acepto', 'aceptar', 'ok', 'okay'];
      optIn = affirmativeResponses.includes(data.response.toLowerCase().trim());
    }

    if (optIn === undefined) {
      throw new BadRequestException('Either optIn boolean or response string must be provided');
    }

    return this.optInService.setOptInStatus(phoneNumber, optIn, req.user.id, data.source);
  }
}

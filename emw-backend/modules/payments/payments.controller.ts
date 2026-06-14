import { Controller, Post, Get, Body, UseGuards, Request, Query, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService, CreatePreferenceDto } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Mercado Pago Checkout Pro endpoints ───

  @Post('create-preference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Mercado Pago Checkout Pro preference' })
  @ApiResponse({ status: 200, description: 'Preference created successfully' })
  async createPreference(@Body() dto: CreatePreferenceDto, @Request() req) {
    return this.paymentsService.createPreference(dto, req.user.id);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Mercado Pago webhook for payment notifications' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async webhook(@Body() body: any, @Query() query: any) {
    // MP puede enviar data en body o query
    const data = body?.data?.id ? body : { type: query.type || body.type, data: { id: query['data.id'] || body?.data?.id } };
    return this.paymentsService.handleWebhook(data);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for the current user' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved' })
  async getPaymentHistory(@Request() req) {
    return this.paymentsService.getPaymentHistory(req.user.id);
  }

  @Get('status/:preferenceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status by preference ID' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async getPaymentStatus(@Param('preferenceId') preferenceId: string, @Request() req) {
    return this.paymentsService.getPaymentStatus(preferenceId, req.user.id);
  }

  // ─── Legacy endpoints (backwards compatibility) ───

  @Post('pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process user payment (legacy)' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async payUsers(@Body() details: any, @Request() req) {
    return this.paymentsService.processPayment(details, req.user.id);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate payment (legacy)' })
  @ApiResponse({ status: 200, description: 'Payment validated successfully' })
  async validatePay(@Request() req) {
    return this.paymentsService.validatePayment(req.user.id);
  }

  @Get('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelSubscription(@Request() req) {
    return this.paymentsService.cancelSubscription(req.user.id);
  }

  @Get('limits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current usage limits for the user plan' })
  @ApiResponse({ status: 200, description: 'Usage limits retrieved' })
  async getUsageLimits(@Request() req) {
    return this.paymentsService.getUsageLimits(req.user.id);
  }

  @Get('subscription/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription status including expiry and renewal info' })
  @ApiResponse({ status: 200, description: 'Subscription status retrieved' })
  async getSubscriptionStatus(@Request() req) {
    return this.paymentsService.getSubscriptionStatus(req.user.id);
  }

  @Post('admin/check-expired')
  @ApiOperation({ summary: 'Force check and process expired subscriptions (cron / admin)' })
  @ApiResponse({ status: 200, description: 'Expired subscriptions processed' })
  async forceCheckExpired(@Headers('x-cron-secret') cronSecret: string) {
    const expectedSecret = this.configService.get<string>('CRON_SECRET') || 'emw-cron-secret-2026';
    if (cronSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    await this.paymentsService.handleExpiredSubscriptions();
    return { success: true, message: 'Expired subscriptions check completed' };
  }
}

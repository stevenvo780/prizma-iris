import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { WebhookService } from './webhook.service';
import { WhatsappWebhookService } from './services/whatsapp-webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly whatsappWebhookService: WhatsappWebhookService,
  ) { }

  /**
   * GET /webhook/whatsapp
   * Meta (WhatsApp Cloud API) te pega aquí para validar el webhook.
   */
  @Get('whatsapp')
  async verifyWhatsAppWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') verifyToken: string,
  ): Promise<string> {
    this.logger.log(
      `WhatsApp webhook verification: mode=${mode}, token=${verifyToken}`,
    );

    if (mode !== 'subscribe') {
      throw new HttpException('Invalid hub mode', HttpStatus.BAD_REQUEST);
    }

    const isValid = await this.whatsappWebhookService.validateVerifyToken(
      verifyToken,
    );

    if (!isValid) {
      this.logger.error(
        'WhatsApp webhook verification failed: invalid token',
      );
      throw new HttpException('Invalid verify token', HttpStatus.FORBIDDEN);
    }

    this.logger.log('WhatsApp webhook verification successful');
    return challenge;
  }

  /**
   * POST /webhook/whatsapp
   * Meta manda todos los mensajes entrantes y updates aquí.
   *
   * Nota clave:
   * - Ya NO hacemos extractConsentDecisions aquí.
   * - Toda la lógica de:
   *   - detectar "SI"
   *   - registrar opt-in
   *   - drenar cola
   * vive dentro de WhatsappWebhookService.processWebhookEvents()
   */
  @Post('whatsapp')
  async handleWhatsAppWebhook(
    @Body() webhookData: any,
    @Headers('x-hub-signature-256') signature: string,
    @Headers() allHeaders: Record<string, string>,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ status: string; processed: number }> {
    try {
      this.logger.log('🎯 ===== WEBHOOK WHATSAPP RECIBIDO =====');
      this.logger.log('📨 Received WhatsApp webhook event');
      this.logger.log('📋 Headers:', JSON.stringify(allHeaders, null, 2));
      this.logger.log('📋 Body completo:', JSON.stringify(webhookData, null, 2));
      this.logger.log('🔒 Signature:', signature);

      if (!webhookData || typeof webhookData !== 'object') {
        throw new HttpException('Invalid payload', HttpStatus.BAD_REQUEST);
      }

      // Obtener el rawBody capturado por el middleware
      const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(webhookData);
      this.logger.log(`📦 RawBody disponible: ${!!req.rawBody}`);

      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          'Skipping WhatsApp webhook signature validation (development mode)',
        );
      } else {
        const result = await this.whatsappWebhookService.validateSignature(
          rawBody,
          signature,
        );

        if (result.status === 'invalid') {
          // FAIL-CLOSED: hay un appSecret configurado y la firma NO coincide
          // (o falta). Rechazamos para evitar opt-ins/colas forzados por payloads
          // falsos. Antes esto se logueaba y se continuaba (fail-open).
          this.logger.error(
            '⛔ WhatsApp webhook signature INVALID with secret configured - rejecting (403)',
          );
          throw new HttpException('Invalid webhook signature', HttpStatus.FORBIDDEN);
        } else if (result.status === 'no-secret') {
          // No hay secreto configurado: no se puede validar. Permitido per Meta docs,
          // pero en producción se registra como error para que se configure.
          this.logger.error(
            '⚠️ WhatsApp webhook sin appSecret configurado - no se valida la firma (configurar WHATSAPP_APP_SECRET)',
          );
        } else {
          this.logger.log('✅ Signature validation passed');
        }
      }

      const processed = await this.whatsappWebhookService.processWebhookEvents(
        webhookData,
      );

      this.logger.log(
        `✅ Processed ${processed} webhook events (incluyendo opt-in/cola si aplicó)`,
      );
      this.logger.log('🎯 ===== FIN PROCESAMIENTO WEBHOOK =====');

      return {
        status: 'success',
        processed,
      };
    } catch (error) {
      this.logger.error('❌ Error processing WhatsApp webhook:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        this.logger.error('❌ Error stack:', error.stack);
      }

      throw new HttpException(
        'Error processing webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /webhook/:provider
   * Webhook genérico p.ej. telegram, etc.
   */
  @Post(':provider')
  async handleGenericWebhook(
    @Body() webhookData: any,
    @Headers() headers: Record<string, string>,
    @Param('provider') provider: string,
  ): Promise<{ status: string; message: string }> {
    try {
      this.logger.log(`Received webhook from provider: ${provider}`);

      await this.webhookService.processGenericWebhook(
        provider,
        webhookData,
        headers,
      );

      return {
        status: 'success',
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error(`Error processing ${provider} webhook:`, error);
      throw new HttpException(
        'Error processing webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /webhook/health
   * Para monitoreo.
   */
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /webhook/test
   * Para debug manual en dev.
   */
  @Post('test')
  async testWebhook(
    @Body() testData: any,
  ): Promise<{ status: string; received: any }> {
    this.logger.log('Test webhook received:', testData);

    return {
      status: 'test_received',
      received: testData,
    };
  }
}

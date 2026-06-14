import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { WhatsAppAccount } from '../accounts/entities/whatsapp-account.entity';
import {
  MessageLog,
} from '../messages/entities/message-log.entity';
import { WhatsappWebhookService } from './services/whatsapp-webhook.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WhatsAppAccount)
    private readonly whatsappAccountRepository: Repository<WhatsAppAccount>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,

    private readonly whatsappWebhookService: WhatsappWebhookService,
  ) {}

  /**
   * Procesamiento genérico por proveedor
   * - Para WhatsApp: DELEGAR al WhatsappWebhookService (coherente con el controlador)
   * - Para otros providers (telegram, etc.): manejar aquí o delegar a sus servicios.
   */
  async processGenericWebhook(
    provider: string,
    data: any,
    headers: Record<string, string>,
  ): Promise<void> {
    const prov = (provider || '').toLowerCase().trim();
    this.logger.log(`[Generic] Webhook provider=${prov}`);

    switch (prov) {
      case 'whatsapp': {

        await this.whatsappWebhookService.processWebhookEvents(data);
        break;
      }

      case 'telegram': {
        await this.processTelegramWebhook(data);
        break;
      }

      default: {
        this.logger.warn(`Unknown webhook provider: ${provider}`);
        break;
      }
    }
  }

  private async processTelegramWebhook(data: any): Promise<void> {
    this.logger.debug(`[Telegram] Payload: ${JSON.stringify(data).slice(0, 1000)}...`);

  }

  /**
   * Verifica la firma estilo "x-hub-signature-256".
   * Útil si tienes otros proveedores que también firman con HMAC SHA256.
   * Para WhatsApp Cloud API, el controlador usa WhatsappWebhookService.validateSignature().
   */
  async validateWebhookSignature(
    signatureHeader: string | undefined,
    rawBody: string,
    appSecret: string | undefined,
  ): Promise<boolean> {
    try {
      if (!signatureHeader || !appSecret) return false;

      const provided = signatureHeader.startsWith('sha256=')
        ? signatureHeader.slice('sha256='.length)
        : signatureHeader;

      const expected = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody, 'utf8')
        .digest('hex');

      const a = Buffer.from(provided, 'hex');
      const b = Buffer.from(expected, 'hex');
      if (a.length !== b.length) return false;

      return crypto.timingSafeEqual(a, b);
    } catch (err) {
      this.logger.error(`validateWebhookSignature error: ${(err as Error).message}`);
      return false;
    }
  }
}

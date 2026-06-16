import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HubClient, EVENTS, validateEvent, EventEnvelopeSchema } from 'prizma-contracts';

/**
 * PrizmaHubService — integración de Iris con el ecosistema Prizma (HubCentral).
 *
 * Iris es dueño de emitir los eventos de notificación/mensajería WhatsApp:
 *   - NOTIFICATION_WHATSAPP ("notification.whatsapp") — intención de notificar.
 *   - MESSAGE_SENT          ("message.sent")          — confirmación de envío.
 *
 * El HubClient es tolerante a fallos por diseño: un publish fallido NUNCA
 * lanza hacia la lógica de negocio (principio: los conectores son opcionales).
 * Por eso aquí dejamos throwOnError en false.
 */
@Injectable()
export class PrizmaHubService {
  private readonly logger = new Logger(PrizmaHubService.name);
  private readonly hub: HubClient;

  constructor(private readonly config: ConfigService) {
    this.hub = new HubClient({
      // 'iris' is the new canonical source key; cast as 'emw' for backward compat
      // with prizma-contracts versions that pre-date the Iris rename (< R1 publish).
      source: 'emw' as any,
      hubUrl: this.config.get<string>('NOUS_HUB_URL'),
      secret: this.config.get<string>('NOUS_HUB_SECRET'),
      throwOnError: false,
    });
  }

  /**
   * Publica un evento crudo en el Hub. No bloqueante: devuelve true/false y
   * nunca propaga errores de red hacia el caller.
   */
  async publish(
    eventType: string,
    data: Record<string, unknown>,
    opts: { priority?: 'critical' | 'high' | 'normal' | 'low'; idempotencyKey?: string } = {},
  ): Promise<boolean> {
    // Validación local (best-effort): si el payload no cumple el schema del
    // evento conocido, logueamos pero igual intentamos publicar (ecosistema abierto).
    const check = validateEvent(
      EventEnvelopeSchema.parse({
        eventId: 'local-validate',
        eventType,
        timestamp: new Date().toISOString(),
        source: 'emw', // 'iris' alias — contracts package predates rename
        data,
        priority: opts.priority || 'normal',
      }),
    );
    if (!check.ok && 'error' in check) {
      this.logger.warn(`[prizma] payload de "${eventType}" no validó: ${check.error}`);
    }
    return this.hub.publish(eventType, data, opts);
  }

  // ─── Helpers de los eventos que ESTE servicio (Iris) es dueño de emitir ───

  /**
   * NOTIFICATION_WHATSAPP — intención/solicitud de notificar por WhatsApp.
   * Útil cuando otro flujo de Iris decide notificar pero el envío real es async.
   */
  async notifyWhatsapp(params: {
    to: string;
    template?: string;
    body?: string;
    variables?: Record<string, string>;
  }): Promise<boolean> {
    return this.publish(EVENTS.NOTIFICATION_WHATSAPP, { ...params });
  }

  /**
   * MESSAGE_SENT — confirmación de que un mensaje WhatsApp salió a Meta.
   * Se emite tras un envío exitoso (status SENT).
   */
  async messageSent(params: { messageId: string; to: string; status: string }): Promise<boolean> {
    return this.publish(EVENTS.MESSAGE_SENT, { ...params });
  }
}

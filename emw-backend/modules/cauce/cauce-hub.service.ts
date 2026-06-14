import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HubClient, EVENTS, validateEvent, EventEnvelopeSchema } from '@olympo/contracts';

/**
 * OlympoHubService — integración de EMW con el ecosistema Olympo (HubCentral).
 *
 * EMW es dueño de emitir los eventos de notificación/mensajería WhatsApp:
 *   - NOTIFICATION_WHATSAPP ("notification.whatsapp") — intención de notificar.
 *   - MESSAGE_SENT          ("message.sent")          — confirmación de envío.
 *
 * El HubClient es tolerante a fallos por diseño: un publish fallido NUNCA
 * lanza hacia la lógica de negocio (principio: los conectores son opcionales).
 * Por eso aquí dejamos throwOnError en false.
 */
@Injectable()
export class OlympoHubService {
  private readonly logger = new Logger(OlympoHubService.name);
  private readonly hub: HubClient;

  constructor(private readonly config: ConfigService) {
    this.hub = new HubClient({
      source: 'emw',
      hubUrl: this.config.get<string>('CAUCE_HUB_URL'),
      secret: this.config.get<string>('CAUCE_HUB_SECRET'),
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
        source: 'emw',
        data,
        priority: opts.priority || 'normal',
      }),
    );
    if (!check.ok && 'error' in check) {
      this.logger.warn(`[cauce] payload de "${eventType}" no validó: ${check.error}`);
    }
    return this.hub.publish(eventType, data, opts);
  }

  // ─── Helpers de los eventos que ESTE servicio (EMW) es dueño de emitir ───

  /**
   * NOTIFICATION_WHATSAPP — intención/solicitud de notificar por WhatsApp.
   * Útil cuando otro flujo de EMW decide notificar pero el envío real es async.
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

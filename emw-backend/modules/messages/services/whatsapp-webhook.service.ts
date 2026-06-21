import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  MessageLog,
  MessageStatus,
  MessageType,
  MessageDirection,
} from '../../messages/entities/message-log.entity';

import { Customer, CustomerStatus } from '../../customers/entities/customer.entity';

import {
  WhatsAppAccount,
} from '../../accounts/entities/whatsapp-account.entity';

import { MessagesService } from '../../messages/messages.service';
import { PendingMessagesService } from '../../messages/services/pending-messages.service';

/**
 * Estructura aproximada de lo que manda Meta
 */
interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };

        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          button?: { text: string };
          context?: {
            id?: string;
          };
        }>;

        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
          pricing?: any;
          conversation?: any;
          errors?: any;
        }>;
      };
    }>;
  }>;
}

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger('WhatsappWebhookService');

  constructor(
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(WhatsAppAccount)
    private readonly whatsappAccountRepository: Repository<WhatsAppAccount>,

    private readonly messagesService: MessagesService,
    private readonly pendingMessagesService: PendingMessagesService,
  ) { }

  /**
   * Utilidades locales
   */
  private normalizePhone(n: string): string {
    return n.replace(/[^\d+]/g, '').trim();
  }

  private phoneVariants(raw: string): {
    waId: string;
    noPlus: string;
    withPlus: string;
    localNoCC?: string;
  } {
    if (!raw) {
      return {
        waId: '',
        noPlus: '',
        withPlus: '',
      };
    }

    const cleaned = raw.replace(/[^\d+]/g, '').trim();

    const noPlus = cleaned.replace(/^\+/, '');

    const withPlus = noPlus.startsWith('+') ? noPlus : `+${noPlus}`;

    let localNoCC: string | undefined = undefined;

    if (/^57\d{10}$/.test(noPlus)) {
      localNoCC = noPlus.slice(2);
    }

    return {
      waId: noPlus,
      noPlus,
      withPlus,
      localNoCC,
    };
  }

  private async getActiveWhatsAppAccountForUser(userId: string) {
    const account = await this.whatsappAccountRepository.findOne({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!account) {
      throw new BadRequestException(
        `No active WhatsAppAccount for userId=${userId}`,
      );
    }

    return account;
  }

  /**
   * CIERRE DE FUGA CROSS-TENANT:
   * Resuelve el userId que es dueño del phone_number_id que recibió el webhook.
   * Esto permite asociar el opt-in al tenant correcto, no a cualquier usuario que
   * comparta el número de teléfono del cliente.
   *
   * Returns null si el phone_number_id no está registrado (fallback seguro).
   */
  private async resolveUserIdFromPhoneNumberId(phoneNumberId?: string): Promise<string | null> {
    if (!phoneNumberId) {
      this.logger.debug('⚠️ No phoneNumberId provided, cannot resolve userId');
      return null;
    }

    try {
      const account = await this.whatsappAccountRepository.findOne({
        where: { phoneNumberId, isActive: true },
      });

      if (!account) {
        this.logger.warn(
          `⚠️ No WhatsAppAccount found for phoneNumberId=${phoneNumberId}`,
        );
        return null;
      }

      this.logger.debug(
        `✅ Resolved userId=${account.userId} from phoneNumberId=${phoneNumberId}`,
      );
      return account.userId;
    } catch (err: any) {
      this.logger.error(
        `💥 Error resolving userId from phoneNumberId=${phoneNumberId}: ${err?.message}`,
      );
      return null;
    }
  }

  /**
   * === PUNTO DE ENTRADA DESDE EL CONTROLLER ===
   * Recorre todas las entradas del webhook y procesa cada "change".
   * Devuelve:
   *  - processedEvents: cuántos cambios del webhook se procesaron
   *  - consentsRecorded: cuántos "sí, autorizo" detectamos
   */
  async processWebhookEvents(payload: WhatsAppWebhookPayload): Promise<{
    processedEvents: number;
    consentsRecorded: number;
  }> {
    this.logger.log('📨 Received WhatsApp webhook payload:');
    this.logger.log(JSON.stringify(payload, null, 2));

    let processedEvents = 0;
    let consentsRecorded = 0;

    if (!payload?.entry?.length) {
      this.logger.warn('⚠️ No entry[] in webhook payload');
      return { processedEvents, consentsRecorded };
    }

    for (const entry of payload.entry) {
      this.logger.log(`📋 Processing entry with ID: ${entry.id}`);
      this.logger.verbose('📋 Full entry data:');
      this.logger.verbose(JSON.stringify(entry, null, 2));

      if (!entry.changes?.length) {
        this.logger.warn('⚠️ Entry has no changes');
        continue;
      }

      this.logger.log(`🔄 Found ${entry.changes.length} changes in entry`);

      for (const change of entry.changes) {
        this.logger.verbose('🔄 Processing change:');
        this.logger.verbose(JSON.stringify(change, null, 2));

        const value = change.value;
        if (!value) continue;

        if (value.statuses && value.statuses.length > 0) {
          this.logger.verbose('💬 Processing message events (statuses):');
          this.logger.verbose(JSON.stringify(value, null, 2));

          this.logger.log(`📊 Found ${value.statuses.length} status updates`);

          for (const st of value.statuses) {
            this.logger.log('📊 Message status update:');
            this.logger.log({
              messageId: st.id,
              recipientId: st.recipient_id,
              status: st.status,
              timestamp: st.timestamp,
              conversation: st.conversation,
              pricing: st.pricing,
              errors: st.errors,
            });

            // Actualizar el message_log correspondiente
            const updateData: Partial<MessageLog> = {};

            if (st.status === 'delivered') {
              updateData.status = MessageStatus.DELIVERED;
              updateData.deliveredAt = new Date(parseInt(st.timestamp) * 1000);
              this.logger.log(
                `📬 Message ${st.id} was delivered to ${st.recipient_id}`,
              );
            } else if (st.status === 'read') {
              updateData.status = MessageStatus.READ;
              updateData.readAt = new Date(parseInt(st.timestamp) * 1000);
              this.logger.log(
                `👀 Message ${st.id} was read by ${st.recipient_id}`,
              );
            } else if (st.status === 'sent') {
              updateData.status = MessageStatus.SENT;
              updateData.sentAt = new Date(parseInt(st.timestamp) * 1000);
              this.logger.log(
                `📤 Message ${st.id} was sent to ${st.recipient_id}`,
              );
            } else if (st.status === 'failed') {
              updateData.status = MessageStatus.FAILED;
              if (st.errors) {
                updateData.errorDetails = st.errors[0] || { code: 'unknown', message: 'Unknown error' };
              }
              this.logger.warn(
                `❌ Message ${st.id} failed for ${st.recipient_id}: ${JSON.stringify(st.errors)}`,
              );
            }

            if (Object.keys(updateData).length > 0 && st.id) {
              const updated = await this.messageLogRepository.update(
                { whatsappMessageId: st.id },
                updateData,
              );
              this.logger.log(
                `📝 Updated ${updated.affected} message_log(s) for whatsappMessageId=${st.id} -> ${JSON.stringify(updateData)}`,
              );
            }
          }
        } else {
          this.logger.log('ℹ️ No status updates found');
        }

        if (value.messages && value.messages.length > 0) {
          this.logger.log(
            `📥 Found ${value.messages.length} incoming messages`,
          );

          for (const msg of value.messages) {
            const incoming = this.extractIncomingMessage(msg, value);

            this.logger.log(
              `📥 Incoming message from ${incoming.from}:`,
            );
            this.logger.log(incoming);

            const result = await this.processIncomingMessage(
              incoming,
              value?.metadata?.phone_number_id,
            );
            if (result?.consentAccepted === true) {
              consentsRecorded += 1;
            }
          }
        } else {
          this.logger.log('ℹ️ No incoming messages found');
        }

        if ((value as any).errors && (value as any).errors.length > 0) {
          this.logger.error('💥 Errors from webhook value.errors:');
          this.logger.error(JSON.stringify((value as any).errors, null, 2));
        } else {
          this.logger.log('ℹ️ No errors found');
        }

        processedEvents += 1;
      }
    }

    this.logger.log(
      `✅ Processed ${processedEvents} webhook events`,
    );

    return { processedEvents, consentsRecorded };
  }

  /**
   * Normaliza el objeto message de Meta → algo consistente
   */
  private extractIncomingMessage(
    msg: any,
    value: any,
  ): {
    messageId: string;
    type: string;
    timestamp: string;
    text: string | undefined;
    context?: { id?: string };
    from: string;
    phoneNumberId?: string;
  } {
    return {
      messageId: msg.id,
      type: msg.type,
      timestamp: msg.timestamp,
      text:
        (msg.text && msg.text.body) ||
        (msg.button && msg.button.text) ||
        undefined,
      context: msg.context,
      from: msg.from,
      phoneNumberId: value?.metadata?.phone_number_id,
    };
  }

  /**
   * Revisa si el mensaje entrante del usuario final es un "SÍ" válido (opt-in),
   * y si sí, dispara recordConsentDecision().
   */
  private async processIncomingMessage(
    incoming: {
      messageId: string;
      type: string;
      timestamp: string;
      text?: string;
      context?: { id?: string };
      from: string;
      phoneNumberId?: string;
    },
    phoneNumberId?: string,
  ): Promise<{ consentAccepted: boolean }> {
    const rawText = (incoming.text || '').trim().toLowerCase();

    const isPositiveConsent =
      rawText === 'si' ||
      rawText === 'sí' ||
      rawText === 'sii' ||
      rawText === 'siii' ||
      rawText === 'acepto' ||
      rawText === 'ok' ||
      rawText === 'dale' ||
      rawText === 'sí acepto' ||
      rawText === 'si acepto' ||
      rawText === 'autorizo';

    if (!isPositiveConsent) {

      return { consentAccepted: false };
    }

    this.logger.log(
      `🔍 recordConsentDecision START waId=${incoming.from} consent=true method=${incoming.type} value="${rawText}"`,
    );

    const resolvedPhoneNumberId = phoneNumberId || incoming.phoneNumberId;
    await this.recordConsentDecision({
      waId: incoming.from,
      consentAccepted: true,
      method: incoming.type,
      value: rawText,
      whatsappMessageId: incoming.messageId,
      messageTimestamp: incoming.timestamp,
      phoneNumberId: resolvedPhoneNumberId,
    });

    this.logger.log(
      `🏁 recordConsentDecision END waId=${incoming.from} consent=true`,
    );

    return { consentAccepted: true };
  }

  /**
   * PASO CLAVE:
   * - buscamos el Customer dueño de ese número
   * - marcamos opt-in en BD (status ACTIVE, optInAt, etc.)
   * - guardamos auditoría en message_logs con whatsappAccountId (esto evita tu error NOT NULL)
   * - disparamos el envío de pendientes (cola) vía messagesService.processPendingMessagesForOptIn
   */

  private async recordConsentDecision(args: {
    waId: string;
    consentAccepted: boolean;
    method: string;
    value?: string;
    whatsappMessageId?: string;
    messageTimestamp?: string;
    phoneNumberId?: string;
  }): Promise<void> {
    const {
      waId,
      consentAccepted,
      method,
      value,
      whatsappMessageId,
      messageTimestamp,
      phoneNumberId,
    } = args;

    const variants = this.phoneVariants(waId);

    const phoneCandidates = Array.from(
      new Set(
        [
          variants.withPlus,
          variants.noPlus,
          variants.localNoCC,
        ].filter(Boolean),
      ),
    );

    this.logger.debug(
      `📞 Buscando customer por phoneNumber en variantes: ${phoneCandidates.join(', ')}`,
    );

    // CIERRE DE FUGA CROSS-TENANT:
    // Resolver el userId dueño del phone_number_id para filtrar Customer por tenant.
    const ownerUserId = await this.resolveUserIdFromPhoneNumberId(phoneNumberId);

    let customer: Customer | null = null;

    if (ownerUserId) {
      // ✅ Búsqueda SEGURA: filtrar por userId + phoneNumber
      this.logger.debug(
        `🔒 Búsqueda segura: userId=${ownerUserId} + phoneNumber en ${phoneCandidates.length} variantes`,
      );
      customer = await this.customerRepository.findOne({
        where: phoneCandidates.map(p => ({
          phoneNumber: p,
          userId: ownerUserId,
        })),
      });
    } else {
      // ⚠️ Fallback si no se pudo resolver userId:
      // Buscar SOLO por phoneNumber (riesgo: si hay 2 usuarios con mismo número,
      // retorna arbitrariamente). Log para auditoría.
      this.logger.warn(
        `⚠️ No se resolvió ownerUserId desde phoneNumberId=${phoneNumberId}. Fallback a búsqueda por phoneNumber solamente (riesgo cross-tenant).`,
      );
      customer = await this.customerRepository.findOne({
        where: phoneCandidates.map(p => ({ phoneNumber: p })),
      });
    }

    if (!customer) {
      this.logger.warn(
        `⚠️ No se encontró Customer con ninguna de estas variantes (${phoneCandidates.join(
          ', ',
        )}) ${ownerUserId ? `para userId=${ownerUserId}` : '(búsqueda sin tenant filter)'}. No puedo registrar opt-in.`,
      );
      return;
    }

    this.logger.log(
      `✅ Customer encontrado id=${customer.id} phone=${customer.phoneNumber} userId=${customer.userId}`,
    );

    if (consentAccepted) {

      const canonicalPhone = variants.withPlus || customer.phoneNumber || variants.noPlus;

      customer.status = CustomerStatus.ACTIVE;
      customer.optOutAt = null;
      customer.optInAt = new Date();
      customer.phoneNumber = canonicalPhone;
      await this.customerRepository.save(customer);

      this.logger.log(
        `✅ Cliente ${customer.id} marcado como OPT-IN y normalizado phone=${customer.phoneNumber}`,
      );
    }

    const account = await this.getActiveWhatsAppAccountForUser(customer.userId);

    const canonicalForLog =
      variants.withPlus || customer.phoneNumber || variants.noPlus || waId;

    const auditLog = this.messageLogRepository.create({
      recipientNumber: canonicalForLog,
      userId: customer.userId,
      whatsappAccountId: account.id,

      status: MessageStatus.DELIVERED,
      type: MessageType.TEXT,
      direction: MessageDirection.INBOUND,

      content: consentAccepted
        ? `CONSENT_ACCEPT via ${method} :: ${value ?? ''}`
        : `CONSENT_REJECT via ${method} :: ${value ?? ''}`,

      templateId: null as any,
      templateParams: null as any,
      mediaAttachments: null as any,

      whatsappMessageId: whatsappMessageId ?? null,
      conversationId: null as any,
      errorDetails: null as any,
      retryCount: 0,
      priority: 0,

      scheduledAt: null as any,
      sentAt: messageTimestamp
        ? new Date(Number(messageTimestamp) * 1000)
        : new Date(),
      deliveredAt: new Date(),
      readAt: null as any,

      cost: null as any,
      metadata: null as any,
    });

    await this.messageLogRepository.save(auditLog);

    this.logger.log(
      `📝 Audit guardado en message_logs para ${waId} (accountId=${account.id})`,
    );

    if (consentAccepted) {

      const pendingKey = variants.noPlus;

      this.logger.log(
        `📤 Lanzando processPendingMessagesForOptIn(phone=${pendingKey}, userId=${customer.userId})`,
      );

      try {
        await this.messagesService.processPendingMessagesForOptIn(
          pendingKey,
          customer.userId,
        );

        this.logger.log(
          `✅ FIN processPendingMessagesForOptIn phone=${pendingKey}, owner=${customer.userId}`,
        );
      } catch (err: any) {
        this.logger.error(
          `💥 Error al procesar mensajes pendientes tras opt-in: ${err?.message}`,
        );
      }
    }
  }

}

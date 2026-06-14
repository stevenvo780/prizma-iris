import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as admin from 'firebase-admin';

import { CustomersService } from '../../customers/customers.service';
import { MessagesService } from '../../messages/messages.service';
import { TemplatesService } from '../../templates/templates.service';
import { Template, TemplateStatus } from '../../templates/entities/template.entity';
import { FirestoreService } from '../../shared/firestore.service';

import { WhatsAppAccount } from '../../accounts/entities/whatsapp-account.entity';
import {
  MessageLog,
  MessageType,
  MessageStatus,
  MessageDirection,
} from '../../messages/entities/message-log.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * SERVICIO WEBHOOK WHATSAPP - VERSIÓN ESTABLE
 *
 * Flujo crítico:
 * 1. Detectar consentimiento ("si", "sí", botón de aceptar, etc.).
 * 2. Marcar el cliente como opt-in.
 * 3. Llamar processPendingMessagesForOptIn() para drenar la cola.
 *
 * SIN intentar crear WhatsAppAccount dinámica.
 * SIN abortar antes de drenar cola.
 * SIN JSONB raro ni metadata adicional peligrosa.
 */

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => TemplatesService))
    private readonly templatesService: TemplatesService,

    @InjectRepository(WhatsAppAccount)
    private readonly whatsappAccountRepository: Repository<WhatsAppAccount>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly firestoreService: FirestoreService,
  ) { }

  async validateVerifyToken(token: string): Promise<boolean> {

    const expected =
      process.env.WHATSAPP_VERIFY_TOKEN ||
      process.env.WEBHOOK_VERIFY_TOKEN ||
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
      'emw_webhook_verify_token';

    return !!token && token === expected;
  }

  /**
   * Valida la firma del webhook de Meta.
   *
   * Estrategia:
   * 1. Intenta extraer el businessAccountId del body para buscar el appSecret en DB
   * 2. Si no encuentra cuenta, usa el appSecret de env como fallback
   * 3. Valida la firma HMAC-SHA256
   */
  async validateSignature(rawBody: string, signature?: string): Promise<boolean> {
    if (!signature) {
      this.logger.warn('⚠️ Missing signature header');
      return false;
    }

    // Intentar obtener appSecret de la DB basado en el businessAccountId del payload
    let appSecret: string | null = null;

    try {
      const body = JSON.parse(rawBody);
      const businessAccountId = body?.entry?.[0]?.id;

      if (businessAccountId) {
        const account = await this.whatsappAccountRepository.findOne({
          where: { businessAccountId },
        });

        if (account?.appSecret) {
          appSecret = account.appSecret;
          this.logger.debug(`🔐 Using appSecret from DB for WABA: ${businessAccountId}`);
        }
      }
    } catch (err) {
      this.logger.debug('Could not parse body to extract businessAccountId');
    }

    // Fallback a variable de entorno si no hay appSecret en DB
    if (!appSecret) {
      appSecret =
        process.env.WHATSAPP_APP_SECRET ||
        process.env.WHATSAPP_WEBHOOK_SECRET ||
        process.env.META_APP_SECRET ||
        null;
    }

    if (!appSecret) {
      // Según Meta docs: "You don't have to validate the payload, but you should."
      // Si no hay appSecret, permitimos el webhook con advertencia
      this.logger.warn('⚠️ No app secret found in DB or env - skipping signature validation (optional per Meta docs)');
      return true;
    }

    const expected =
      'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /**
   * waId: número que manda WhatsApp (ej "57305...")
   * consent: true si dijo "si", false si dijo "no"
   * details: metadatos del mensaje que disparó esto
   */
  async recordConsentDecision(
    waId: string,
    consent: boolean,
    details?: {
      timestamp?: string;
      messageId?: string;
      method?: string;
      value?: string;
      source?: string;
    },
  ): Promise<void> {

    if (!consent) {
      this.logger.warn(`🚫 Usuario ${waId} rechazó consentimiento. No se envía cola.`);
      return;
    }

    const normalizedPhone = waId.startsWith('+') ? waId : `+${waId}`;

    const optInAt = details?.timestamp
      ? new Date(Number(details.timestamp) * 1000)
      : new Date();

    this.logger.log(
      `✅ Consentimiento: ${normalizedPhone} aceptó. Marcando opt-in y drenando cola...`,
    );

    const customer = await this.customersService.markOptIn(normalizedPhone, optInAt);
    if (!customer) {
      this.logger.warn(
        `⚠️ recordConsentDecision: no encontré Customer con número ${normalizedPhone}, no puedo drenar cola.`,
      );
      return;
    }

    this.logger.log(
      `👤 Cliente marcado como ACTIVO -> id=${customer.id} userId=${customer.userId} phone=${customer.phoneNumber}`,
    );

    try {

      let whatsappAccount = await this.whatsappAccountRepository.findOne({
        where: { userId: customer.userId, isActive: true },
      });

      if (!whatsappAccount) {
        this.logger.warn(
          `ℹ️ No hay WhatsAppAccount activa para user=${customer.userId}, creo log sin accountId`,
        );
      }

      const audit = this.messageLogRepository.create({
        userId: customer.userId,
        recipientNumber: customer.phoneNumber.replace(/^\+/, ''),
        whatsappAccountId: whatsappAccount ? whatsappAccount.id : (undefined as any),

        whatsappMessageId: details?.messageId ?? `consent:${Date.now()}`,

        type: MessageType.TEXT,
        direction: MessageDirection.INBOUND,
        status: MessageStatus.DELIVERED,

        content: `CONSENT_ACCEPT via ${details?.method ?? 'text'} :: ${details?.value ?? ''}`,

        sentAt: optInAt,
        deliveredAt: new Date(),
      });

      await this.messageLogRepository.save(audit);
    } catch (err: any) {

      this.logger.warn(
        `⚠️ No pude guardar audit log para ${normalizedPhone}: ${err?.message}. Continuamos.`,
      );
    }

    try {
      this.logger.log(
        `📤 Drenando cola para ${customer.phoneNumber} (user=${customer.userId})...`,
      );

      await this.messagesService.processPendingMessagesForOptIn(
        customer.phoneNumber,
        customer.userId,
      );

      this.logger.log(
        `🎉 Cola drenada para ${customer.phoneNumber} (user=${customer.userId}).`,
      );
    } catch (err: any) {
      this.logger.error(
        `💥 Error drenando cola tras opt-in (${customer.phoneNumber}/${customer.userId}): ${err?.message}`,
      );
    }
  }

  /**
   * Recorre el body que manda Meta.
   * Maneja dos tipos de webhooks:
   *   1. field === 'messages': mensajes entrantes (consentimiento opt-in)
   *   2. field === 'message_template_status_update': aprobación/rechazo de templates
   *
   * Devuelve cuántos eventos procesó.
   */
  async processWebhookEvents(body: any): Promise<number> {
    let processed = 0;

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const wabaId = entry?.id; // WhatsApp Business Account ID
      const changes = entry?.changes ?? [];

      for (const ch of changes) {
        const field = ch?.field;

        // ═══════════════════════════════════════════════════════════════════
        // 1️⃣ WEBHOOK: message_template_status_update
        //    Meta nos notifica cuando un template es APPROVED/REJECTED/DISABLED
        // ═══════════════════════════════════════════════════════════════════
        if (field === 'message_template_status_update') {
          processed++;
          await this.handleTemplateStatusUpdate(ch?.value, wabaId);
          continue;
        }

        // ═══════════════════════════════════════════════════════════════════
        // 2️⃣ WEBHOOK: messages
        //    Mensajes entrantes del usuario (para detectar consentimiento)
        // ═══════════════════════════════════════════════════════════════════
        if (field !== 'messages') continue;

        const value = ch?.value;
        const phoneNumberId = value?.metadata?.phone_number_id;

        // ═══════════════════════════════════════════════════════════════
        // 2.A  STATUS UPDATES (sent, delivered, read, failed)
        //      Meta envía estos dentro de field='messages' con array 'statuses'
        // ═══════════════════════════════════════════════════════════════
        const statuses = value?.statuses ?? [];
        for (const st of statuses) {
          if (!st?.id || !st?.status) continue;
          processed++;

          const updateData: Partial<MessageLog> = {};
          const ts = st.timestamp ? new Date(parseInt(st.timestamp) * 1000) : new Date();

          if (st.status === 'sent') {
            updateData.status = MessageStatus.SENT;
            updateData.sentAt = ts;
          } else if (st.status === 'delivered') {
            updateData.status = MessageStatus.DELIVERED;
            updateData.deliveredAt = ts;
          } else if (st.status === 'read') {
            updateData.status = MessageStatus.READ;
            updateData.readAt = ts;
          } else if (st.status === 'failed') {
            updateData.status = MessageStatus.FAILED;
            if (st.errors?.length) {
              updateData.errorDetails = st.errors[0];
            }
          }

          if (Object.keys(updateData).length > 0) {
            const updated = await this.messageLogRepository.update(
              { whatsappMessageId: st.id },
              updateData,
            );
            this.logger.log(
              `📊 Status ${st.status} for wamid=${st.id} -> updated ${updated.affected} row(s)`,
            );

            // Sincronizar status en Firestore (chat real-time)
            try {
              const acctId = await this.resolveAccountIdFromPhoneNumberId(phoneNumberId);
              await this.firestoreService.updateMessageStatus(
                st.id,
                st.status,
                ts,
                acctId || undefined,
              );
            } catch (fsErr: any) {
              this.logger.debug(
                `Firestore status sync skipped: ${fsErr?.message}`,
              );
            }
          }
        }

        const inbound = value?.messages ?? [];
        const waIdFromContact = value?.contacts?.[0]?.wa_id;

        for (const msg of inbound) {
          const waId = msg?.from || waIdFromContact;
          if (!waId) continue;

          processed++;

          // Log detallado del mensaje entrante
          const msgType = msg?.type;
          const msgBody = msg?.text?.body || msg?.interactive?.button_reply?.title || msg?.interactive?.list_reply?.title || '[no text]';
          this.logger.log(
            `📨 Mensaje entrante: from=${waId} type=${msgType} body="${msgBody?.substring(0, 50)}"`,
          );

          const consentInfo = this.extractPossibleConsent(msg);
          if (!consentInfo) {
            this.logger.log(
              `⏭️ Mensaje ignorado (no es respuesta de consentimiento válida): from=${waId} body="${msgBody?.substring(0, 30)}"`,
            );
            continue;
          }

          const { consent, method, value: consentValue } = consentInfo;

          this.logger.log(
            `📩 Consent detectado: from=${waId} consent=${consent} method=${method} value="${consentValue}"`,
          );

          let optInProcessed = false;
          try {
            await this.recordConsentDecision(waId, consent, {
              timestamp: msg?.timestamp,
              messageId: msg?.id,
              method,
              value: consentValue,
              source: 'whatsapp',
            });
            // Si fue consent positivo, la cola ya se drenó y el mensaje ya se envió
            optInProcessed = consent;
          } catch (err: any) {
            this.logger.error(
              `💥 Error en recordConsentDecision(${waId}): ${err?.message}`,
            );
          }

          // ═══════════════════════════════════════════════════════════════
          // 🤖 AUTO-REPLY: Solo si NO se acaba de procesar un opt-in
          //    (cuando hay opt-in, la cola ya envió el mensaje pendiente)
          // ═══════════════════════════════════════════════════════════════
          if (!optInProcessed) {
            try {
              await this.sendAutoReplyIfEnabled(phoneNumberId, waId);
            } catch (err: any) {
              this.logger.error(
                `💥 Error enviando auto-reply a ${waId}: ${err?.message}`,
              );
            }
          } else {
            this.logger.log(
              `🤖 Auto-reply omitido para ${waId}: se acaba de procesar opt-in y drenar cola`,
            );
          }

          // ═══════════════════════════════════════════════════════════════
          // 💬 FIRESTORE: Escribir mensaje inbound para chat real-time
          // ═══════════════════════════════════════════════════════════════
          try {
            const resolvedUserId = await this.resolveUserIdFromPhoneNumberId(phoneNumberId) || 'unknown';
            const resolvedAccountId = await this.resolveAccountIdFromPhoneNumberId(phoneNumberId);
            await this.firestoreService.writeMessage(
              waId,
              {
                content: msgBody !== '[no text]' ? msgBody : '',
                direction: 'inbound',
                type: (msgType === 'text' ? 'text' : msgType) as any,
                status: 'delivered',
                timestamp: admin.firestore.Timestamp.fromDate(
                  msg?.timestamp
                    ? new Date(parseInt(msg.timestamp) * 1000)
                    : new Date(),
                ),
                whatsappMessageId: msg?.id,
                senderName: value?.contacts?.[0]?.profile?.name || waId,
              },
              resolvedUserId,
              value?.contacts?.[0]?.profile?.name,
              resolvedAccountId || undefined,
            );
          } catch (firestoreErr: any) {
            this.logger.warn(
              `⚠️ Firestore write failed for inbound msg from ${waId}: ${firestoreErr?.message}`,
            );
          }
        }
      }
    }

    if (processed === 0) {
      this.logger.log('ℹ️ No inbound messages to process.');
    } else {
      this.logger.log(`✅ Processed ${processed} webhook events`);
    }

    return processed;
  }

  /**
   * Maneja el webhook message_template_status_update de Meta.
   *
   * Eventos posibles:
   *   - APPROVED: Template aprobado, podemos usarlo para enviar mensajes
   *   - REJECTED: Template rechazado (incluye razón)
   *   - DISABLED: Template deshabilitado por baja calidad
   *   - PENDING_DELETION: Template va a ser eliminado
   *   - FLAGGED: Template marcado para revisión
   *   - PAUSED: Template pausado temporalmente
   *   - REINSTATED: Template restaurado tras pausa
   *
   * Payload ejemplo de Meta:
   * {
   *   "event": "APPROVED",
   *   "message_template_id": 1689556908129832,
   *   "message_template_name": "order_confirmation",
   *   "message_template_language": "en-US",
   *   "reason": "NONE",
   *   "message_template_category": "UTILITY"
   * }
   */
  private async handleTemplateStatusUpdate(value: any, wabaId?: string): Promise<void> {
    const event = value?.event;
    const templateId = value?.message_template_id;
    const templateName = value?.message_template_name;
    const templateLanguage = value?.message_template_language;
    const category = value?.message_template_category;
    const reason = value?.reason;
    const rejectionInfo = value?.rejection_info;

    this.logger.log(
      `📋 Template Status Update: event=${event} name="${templateName}" lang=${templateLanguage} id=${templateId}`,
    );

    if (!templateName) {
      this.logger.warn('⚠️ Template status update sin nombre, ignorando');
      return;
    }

    // Normalizar el nombre como lo hace el sistema
    const normalizedName = this.normalizeTemplateName(templateName);

    // Mapear el evento de Meta a nuestro TemplateStatus enum
    let newStatus: TemplateStatus;
    let updateData: Partial<Template> = {};

    switch (event) {
      case 'APPROVED':
        newStatus = TemplateStatus.APPROVED;
        updateData = {
          status: newStatus,
          approvedAt: new Date(),
          rejectionReason: null,
          whatsappTemplateId: templateId?.toString() ?? null,
        };
        this.logger.log(`✅ Template "${normalizedName}" APROBADO por Meta`);
        break;

      case 'REJECTED':
        newStatus = TemplateStatus.REJECTED;
        updateData = {
          status: newStatus,
          rejectedAt: new Date(),
          rejectionReason: {
            code: reason ?? 'UNKNOWN',
            message: rejectionInfo?.reason ?? 'Template rechazado por Meta',
            details: rejectionInfo?.recommendation ?? undefined,
          },
        };
        this.logger.warn(
          `❌ Template "${normalizedName}" RECHAZADO: ${reason} - ${rejectionInfo?.reason}`,
        );
        break;

      case 'DISABLED':
      case 'PAUSED':
        newStatus = TemplateStatus.DISABLED;
        updateData = {
          status: newStatus,
          active: false,
          rejectionReason: {
            code: event,
            message: `Template ${event.toLowerCase()} por Meta debido a baja calidad`,
            details: value?.disable_info?.disable_date ?? undefined,
          },
        };
        this.logger.warn(`⚠️ Template "${normalizedName}" DESHABILITADO/PAUSADO`);
        break;

      case 'REINSTATED':
        // Template restaurado tras pausa
        newStatus = TemplateStatus.APPROVED;
        updateData = {
          status: newStatus,
          active: true,
          rejectionReason: null,
        };
        this.logger.log(`🔄 Template "${normalizedName}" RESTAURADO`);
        break;

      case 'FLAGGED':
      case 'PENDING_DELETION':
        // Mantener estado actual pero loguear
        this.logger.warn(`⚠️ Template "${normalizedName}" marcado como ${event}`);
        return;

      default:
        this.logger.warn(`⚠️ Evento de template desconocido: ${event}`);
        return;
    }

    // Buscar y actualizar el template en la base de datos
    // Como el template puede pertenecer a cualquier usuario, buscamos solo por nombre
    // (podríamos tener varios usuarios con el mismo nombre de template)
    try {
      const templates = await this.templateRepository.find({
        where: { name: normalizedName },
      });

      if (templates.length === 0) {
        this.logger.warn(
          `⚠️ No se encontró template con nombre "${normalizedName}" en la BD`,
        );
        return;
      }

      // Actualizar todos los templates con ese nombre (puede haber en varios idiomas/usuarios)
      for (const template of templates) {
        // Si el idioma coincide, actualizamos; si no hay filtro de idioma, actualizamos todos
        const langMatch = !templateLanguage ||
          template.language === templateLanguage?.replace('-', '_')?.split('_')[0];

        if (langMatch) {
          await this.templateRepository.update(template.id, updateData);
          this.logger.log(
            `📝 Template actualizado: id=${template.id} userId=${template.userId} status=${newStatus}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `💥 Error actualizando template "${normalizedName}": ${err?.message}`,
      );
    }
  }

  /**
   * Normaliza el nombre del template al formato de WhatsApp
   */
  private normalizeTemplateName(name: string): string {
    return (name ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '_');
  }

  /**
   * 🤖 AUTO-REPLY
   * Si el usuario dueño de la cuenta WhatsApp que recibió el mensaje
   * tiene auto-reply habilitado en settings, envía un mensaje de texto de vuelta.
   */
  private async sendAutoReplyIfEnabled(phoneNumberId: string, recipientWaId: string): Promise<void> {
    if (!phoneNumberId || !recipientWaId) return;

    // Buscar la cuenta WhatsApp que recibió el mensaje
    const account = await this.whatsappAccountRepository.findOne({
      where: { phoneNumberId },
    });

    if (!account) {
      this.logger.debug(`🤖 Auto-reply: No se encontró cuenta con phoneNumberId=${phoneNumberId}`);
      return;
    }

    // Buscar la configuración del usuario
    const user = await this.userRepository.findOne({
      where: { id: account.userId },
    });

    if (!user) return;

    const autoReply = user.settings?.autoReply;
    if (!autoReply?.enabled || !autoReply?.message) {
      this.logger.debug(`🤖 Auto-reply desactivado para user=${account.userId}`);
      return;
    }

    this.logger.log(
      `🤖 Enviando auto-reply a ${recipientWaId}: "${autoReply.message.substring(0, 50)}..."`,
    );

    try {
      // Enviar mensaje de texto directamente via WhatsApp Cloud API
      const { default: axios } = await import('axios');
      const baseUrl = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v18.0';

      const payload = {
        messaging_product: 'whatsapp',
        to: recipientWaId,
        type: 'text',
        text: {
          body: autoReply.message,
        },
      };

      const response = await axios.post(
        `${baseUrl}/${account.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const whatsappMessageId = response.data?.messages?.[0]?.id;
      this.logger.log(`✅ Auto-reply enviado a ${recipientWaId}, wamid=${whatsappMessageId}`);

      // Registrar en message_logs
      const logEntry = this.messageLogRepository.create({
        userId: account.userId,
        whatsappAccountId: account.id,
        recipientNumber: recipientWaId,
        type: MessageType.TEXT,
        direction: MessageDirection.OUTBOUND,
        status: MessageStatus.SENT,
        content: autoReply.message,
        whatsappMessageId,
        sentAt: new Date(),
        metadata: { source: 'auto_reply' },
      });
      await this.messageLogRepository.save(logEntry);
    } catch (err: any) {
      this.logger.error(
        `💥 Error enviando auto-reply a ${recipientWaId}: ${err?.response?.data?.error?.message || err?.message}`,
      );
    }
  }

  /**
   * Lee un "message" de WhatsApp Cloud API y decide:
   *   - CUALQUIER respuesta del usuario se considera opt-in positivo
   *   - Solo "no", "stop", etc. se considera rechazo
   *
   * Retorna { consent: boolean; method: 'button'|'list'|'text'; value: string }
   * o null si no hay contenido procesable.
   */
  private extractPossibleConsent(msg: any):
    | { consent: boolean; method: 'button' | 'list' | 'text'; value: string }
    | null {

    // Botón interactivo
    const buttonReply = msg?.interactive?.button_reply;
    if (buttonReply?.id) {
      const idNorm = String(buttonReply.id).trim().toLowerCase();
      const isNo = this.isNegativeResponse(idNorm);
      return { consent: !isNo, method: 'button', value: idNorm };
    }

    // Lista interactiva
    const listReply = msg?.interactive?.list_reply;
    if (listReply?.id) {
      const idNorm = String(listReply.id).trim().toLowerCase();
      const isNo = this.isNegativeResponse(idNorm);
      return { consent: !isNo, method: 'list', value: idNorm };
    }

    // Mensaje de texto - CUALQUIER respuesta es opt-in positivo (excepto "no", "stop", etc.)
    if (msg?.type === 'text') {
      const raw = (msg?.text?.body || '').trim().toLowerCase();

      if (!raw) return null; // Mensaje vacío

      // Solo limpiar para comparar con respuestas negativas, pero aceptar cualquier respuesta
      const cleaned = raw.replace(/[!.¡¿?]/g, '').trim();
      const isNo = cleaned ? this.isNegativeResponse(cleaned) : false;

      return { consent: !isNo, method: 'text', value: raw };
    }

    return null;
  }

  /**
   * Verifica si la respuesta es negativa (rechazo de opt-in)
   */
  private isNegativeResponse(val: string): boolean {
    const NO = [
      'no',
      'no gracias',
      'rechazo',
      'cancelar',
      'stop',
      'parar',
      'baja',
      'unsubscribe',
      'no autorizo',
      'no acepto',
    ];
    return NO.includes(val);
  }

  /**
   * Resuelve el userId a partir del phoneNumberId de la cuenta WhatsApp.
   */
  private async resolveUserIdFromPhoneNumberId(
    phoneNumberId: string,
  ): Promise<string | null> {
    if (!phoneNumberId) return null;
    const account = await this.whatsappAccountRepository.findOne({
      where: { phoneNumberId },
    });
    return account?.userId ?? null;
  }

  /**
   * Resuelve el accountId (UUID) a partir del phoneNumberId de la cuenta WhatsApp.
   */
  private async resolveAccountIdFromPhoneNumberId(
    phoneNumberId: string,
  ): Promise<string | null> {
    if (!phoneNumberId) return null;
    const account = await this.whatsappAccountRepository.findOne({
      where: { phoneNumberId },
    });
    return account?.id ?? null;
  }
}

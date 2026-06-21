import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import {
  MessageLog,
  MessageStatus,
  MessageType,
  MessageDirection,
} from './entities/message-log.entity';
import { MessageTemplate } from './entities/message-template.entity';
import { CustomersService } from '../customers/customers.service';
import { FirestoreService, ChatMessage } from '../shared/firestore.service';
import * as admin from 'firebase-admin';
import { TemplatesService } from '../templates/templates.service';
import {
  WhatsAppAccount,
  AccountType,
  AccountStatus,
} from '../accounts/entities/whatsapp-account.entity';
import { PendingMessagesService } from './services/pending-messages.service';
import axios from 'axios';
import {
  TemplateCategory,
  TemplateLanguage,
  TemplateStatus,
} from '../templates/entities/template.entity';
import pLimit from 'p-limit';
import { CreateMessageTemplateDto } from './dto/message-template.dto';
import { Customer } from '@/customers/entities/customer.entity';
import { WhatsAppService } from './services/whatsapp.service';
import { User, UserRole } from '../auth/entities/user.entity';
import { FREE_PLAN_LIMITS } from '../customers/customers.service';

export interface SendMessageDto {
  recipientNumber?: string;
  recipientNumbers?: string[];
  customerTags?: string[];
  content?: string;
  templateId?: string;
  templateParams?: string[];
  type: MessageType;
  mediaAttachments?: {
    type: string;
    url: string;
    caption?: string;
    filename?: string;
  }[];
  scheduledAt?: Date;
  priority?: number;
  accountId?: string;
  countryCode?: string;
}

export interface BulkSendDto {
  templateId: string;
  recipientNumbers?: string[];
  customerTags?: string[];
  templateParams?: string[];
  scheduledAt?: Date;
  priority?: number;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  private readonly WHATSAPP_API_URL = process.env.WHATSAPP_API_BASE_URL;
  constructor(
    @InjectRepository(MessageLog)
    private messageLogRepository: Repository<MessageLog>,

    @InjectRepository(WhatsAppAccount)
    private whatsappAccountRepository: Repository<WhatsAppAccount>,

    @InjectRepository(MessageTemplate)
    private messageTemplateRepository: Repository<MessageTemplate>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    private customersService: CustomersService,
    private templatesService: TemplatesService,
    private pendingMessagesService: PendingMessagesService,
    private whatsappService: WhatsAppService,
    private firestoreService: FirestoreService,
  ) { }

  /**
   * Verifica si el usuario free ha alcanzado su límite diario de mensajes.
   * Premium y Admin no tienen límites.
   */
  async checkDailyMessageLimit(userId: string): Promise<{ allowed: boolean; sent: number; max: number | null }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.PREMIUM || user.role === UserRole.ADMIN) {
      return { allowed: true, sent: 0, max: null };
    }

    // Contar mensajes enviados hoy (dirección OUTBOUND)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentToday = await this.messageLogRepository
      .createQueryBuilder('msg')
      .where('msg.userId = :userId', { userId })
      .andWhere('msg.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .andWhere('msg.createdAt >= :today', { today })
      .getCount();

    if (sentToday >= FREE_PLAN_LIMITS.MAX_MESSAGES_PER_DAY) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${FREE_PLAN_LIMITS.MAX_MESSAGES_PER_DAY} mensajes diarios en el plan gratuito. ` +
        `Hoy has enviado ${sentToday} mensajes. ` +
        `Actualiza a Premium para mensajes ilimitados.`
      );
    }

    return { allowed: true, sent: sentToday, max: FREE_PLAN_LIMITS.MAX_MESSAGES_PER_DAY };
  }

  /**
   * Punto de entrada normal para enviar mensajes.
   * - Si el contacto YA tiene opt-in válido (<24h activo), sale directo.
   * - Si NO tiene opt-in válido:
   *    1. Encolamos el mensaje real (WAITING_OPT_IN)
   *    2. Le mandamos (si se puede) una plantilla "opt-in" pidiéndole que responda "SI"
   */
  async sendMessage(
    sendMessageDto: SendMessageDto,
    userId: string,
  ): Promise<MessageLog[]> {
    // ─── Verificar límite diario de mensajes para cuentas gratuitas ───
    await this.checkDailyMessageLimit(userId);

    const whatsappAccount = await this.resolveWhatsAppAccount(
      userId,
      sendMessageDto.accountId,
    );

    const recipients = await this.getRecipients(sendMessageDto, userId);

    if (recipients.length === 0) {
      throw new BadRequestException('No valid recipients found');
    }

    const template = sendMessageDto.templateId
      ? await this.templatesService.findOne(sendMessageDto.templateId, userId)
      : null;

    const limit = pLimit(10);

    const tasks = recipients.map(recipient =>
      limit(async () => {
        try {
          const optInStatus =
            await this.pendingMessagesService.checkOptInStatus(
              recipient,
              userId,
            );

          if (optInStatus.hasOptIn) {
            const messageLog = await this.createDirectMessage({
              recipientNumber: recipient,
              userId,
              whatsappAccountId: whatsappAccount.id,
              sendMessageDto,
              template,
            });
            return messageLog;
          }

          // Cancelar pending messages anteriores de este número para evitar bloqueos
          const cancelled = await this.pendingMessagesService.cancelPendingMessagesForRecipient(
            recipient,
            userId,
          );
          if (cancelled > 0) {
            this.logger.log(`🧹 Se cancelaron ${cancelled} pending messages anteriores para ${recipient}`);
          }

          const pendingMessage =
            await this.pendingMessagesService.createPendingMessage(
              recipient,
              userId,
              {
                type: sendMessageDto.type,
                content: sendMessageDto.content,
                templateId: sendMessageDto.templateId,
                templateParams: sendMessageDto.templateParams,
                mediaAttachments: sendMessageDto.mediaAttachments,
                scheduledAt: sendMessageDto.scheduledAt,
                priority: sendMessageDto.priority,
              },
              optInStatus.customer?.id,
            );

          const optInTemplate = await this.getOrCreateOptInTemplate(userId);

          if (optInTemplate?.isApproved) {
            try {
              // Solo enviar templateParams si el template tiene variables definidas
              const optInParams = optInTemplate.parameters && optInTemplate.parameters.length > 0
                ? [optInStatus.customer?.firstName || 'Cliente']
                : undefined;

              const optInMessage = await this.createDirectMessage({
                recipientNumber: recipient,
                userId,
                whatsappAccountId: whatsappAccount.id,
                sendMessageDto: {
                  ...sendMessageDto,
                  type: MessageType.TEMPLATE,
                  templateId: optInTemplate.id,
                  templateParams: optInParams,
                  content: null as any,
                },
                template: optInTemplate,
              });

              await this.pendingMessagesService.markOptInSent(
                pendingMessage.id,
              );

              return optInMessage;
            } catch (err) {

              this.logger.warn(
                `No se pudo enviar mensaje de opt-in a ${recipient}: ${err}`,
              );
              return null;
            }
          } else {

            this.logger.warn(
              `No hay plantilla de opt-in aprobada para userId=${userId}; ${recipient} quedó en cola`,
            );
            return null;
          }
        } catch (error) {
          this.logger.error(`Failed to send message to ${recipient}:`, error);
          return null;
        }
      }),
    );

    const results = await Promise.allSettled(tasks);
    const messageLogs = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => (r as PromiseFulfilledResult<MessageLog>).value);

    return messageLogs;
  }

  /**
   * Proxy: verifica si ya se envió un opt-in recientemente a este número.
   */
  async hasRecentOptInSent(phoneNumber: string, userId: string): Promise<boolean> {
    return this.pendingMessagesService.hasRecentOptInSent(phoneNumber, userId);
  }

  /**
   * Proxy: expira pending messages viejos (>maxAgeHours) que siguen en WAITING_OPT_IN/OPT_IN_SENT.
   */
  async expireOldPendingMessages(maxAgeHours: number = 24): Promise<number> {
    return this.pendingMessagesService.expireOldPendingMessages(maxAgeHours);
  }

  /**
   * Proxy: cancela todos los pending messages activos de un número específico.
   */
  async cancelPendingMessagesForRecipient(phoneNumber: string, userId: string): Promise<number> {
    return this.pendingMessagesService.cancelPendingMessagesForRecipient(phoneNumber, userId);
  }

  requestAccess(phoneNumber: string, userId: string, customerData?: { firstName?: string; lastName?: string }) {
    this.logger.log(`Requesting access for ${phoneNumber} for user ${userId}`);
    this.whatsappService.requestAccess(phoneNumber, userId, customerData);
  }
  createPendingMessages(messages: {content: string, order: number, mediaAttachments?: any[]}[], customer: Customer, userId: string) {
    this.logger.log(`Creating pending messages for ${customer.phoneNumber} for user ${userId}`);
    messages.forEach(message => {
      const hasMedia = message.mediaAttachments && message.mediaAttachments.length > 0;
      this.pendingMessagesService.createPendingMessage(customer.phoneNumber, userId, {
        type: hasMedia ? MessageType.MEDIA : MessageType.TEXT,
        content: message.content,
        priority: message.order,
        mediaAttachments: hasMedia ? message.mediaAttachments : undefined,
      })
    })
  }
  async sendMessages(
    sendMessagesDto: {
      phoneNumber: string,
      messages: {content: string, order: number, mediaAttachments?: any[]}[],
    },
    userId: string
  ) {
    this.logger.log(`Sending multiple messages to ${sendMessagesDto.phoneNumber} for user ${userId}`);
    const whatsappAccount = await this.resolveWhatsAppAccount(userId);

    // Garantizar envío en orden ascendente (1, 2, 3...)
    const sortedMessages = [...sendMessagesDto.messages].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );

    for (const message of sortedMessages) {
      // Determinar el tipo de mensaje según si tiene mediaAttachments
      const hasMedia = message.mediaAttachments && message.mediaAttachments.length > 0;
      const messageType = hasMedia ? MessageType.MEDIA : MessageType.TEXT;

      this.logger.log(`Creating ${messageType} message for ${sendMessagesDto.phoneNumber}, hasMedia: ${hasMedia}`);

      const messageLog = this.messageLogRepository.create({
        recipientNumber: sendMessagesDto.phoneNumber,
        userId: userId,
        status: MessageStatus.PENDING,
        type: messageType,
        direction: MessageDirection.OUTBOUND,
        content: message.content,
        priority: message.order,
        whatsappAccountId: whatsappAccount.id,
        mediaAttachments: hasMedia ? message.mediaAttachments : undefined,
      });

      const savedMessageLog = await this.messageLogRepository.save(messageLog);
      await this.processMessage(savedMessageLog)
        .catch(() => this.logger.error(`Failed to process message to ${sendMessagesDto.phoneNumber}`));
    }
  }
  /**
   * Crea el registro en message_logs y dispara el envío real (o programación diferida).
   */
  private async createDirectMessage(params: {
    recipientNumber: string;
    userId: string;
    whatsappAccountId: string;
    sendMessageDto: SendMessageDto;
    template: any;
  }): Promise<MessageLog> {
    const {
      recipientNumber,
      userId,
      whatsappAccountId,
      sendMessageDto,
      template,
    } = params;

    const messageLog = this.messageLogRepository.create({
      recipientNumber,
      userId,
      whatsappAccountId,
      status: sendMessageDto.scheduledAt
        ? MessageStatus.QUEUED
        : MessageStatus.PENDING,
      type: sendMessageDto.type,
      direction: MessageDirection.OUTBOUND,
      content: sendMessageDto.content,
      templateId: sendMessageDto.templateId,
      templateParams: sendMessageDto.templateParams,
      mediaAttachments: sendMessageDto.mediaAttachments,
      scheduledAt: sendMessageDto.scheduledAt,
      priority: sendMessageDto.priority || 0,
      metadata: {
        templateCategory: template?.category,
      },
    });

    const savedMessageLog = await this.messageLogRepository.save(messageLog);

    if (
      sendMessageDto.scheduledAt &&
      sendMessageDto.scheduledAt > new Date()
    ) {
      const delay =
        sendMessageDto.scheduledAt.getTime() - Date.now();

      setTimeout(() => {
        this.processMessage(savedMessageLog).catch(() => void 0);
      }, delay);
    } else {
      this.processMessage(savedMessageLog).catch(() => void 0);
    }

    return savedMessageLog;
  }

  /**
   * Obtiene la plantilla activa y aprobada del usuario para opt-in.
   * El usuario debe tener un template activo y aprobado configurado.
   */
  private async getOrCreateOptInTemplate(userId: string) {

    const existing = await this.templatesService.findAll(userId);

    // Buscar el template que esté ACTIVO y APROBADO
    let optInTemplate = existing.find(
      t =>
        t.active === true &&
        t.status === TemplateStatus.APPROVED,
    );

    // Si no hay template activo y aprobado, intentar con cualquier aprobado
    if (!optInTemplate) {
      optInTemplate = existing.find(
        t => t.status === TemplateStatus.APPROVED,
      );
    }

    return optInTemplate;
  }

  /**
   * >>> FLUJO CLAVE <<<
   * Se llama DESPUÉS de que el cliente responde "SI".
   *
   * 1. Buscamos todos los mensajes en cola para ese número (los que estaban esperando opt-in).
   * 2. Marcamos que ya recibimos opt-in.
   * 3. Enviamos cada mensaje pendiente por WhatsApp real.
   * 4. Marcamos cada pending como enviado o fallido.
   */

  async processPendingMessagesForOptIn(
    phoneNumber: string,
    userId: string,
  ): Promise<MessageLog[]> {
    const logger = new Logger('MessagesService.processPendingMessagesForOptIn');

    const withPlus = phoneNumber.startsWith('+') ? phoneNumber.trim() : `+${phoneNumber.trim()}`;
    const noPlus = withPlus.replace(/^\+/, '').trim();

    logger.log(
      `📦 Iniciando processPendingMessagesForOptIn para phone=${phoneNumber} → withPlus=${withPlus} / noPlus=${noPlus} / userId=${userId}`,
    );

    try {
      if (typeof this.customersService?.markOptIn === 'function') {
        await this.customersService.markOptIn(withPlus, new Date(), userId);
        logger.log(`✅ markOptIn aplicado/asegurado para ${withPlus} (userId=${userId})`);
      } else {
        logger.warn('ℹ️ customersService.markOptIn no existe, se omite esta parte.');
      }
    } catch (err: any) {
      logger.error(
        `💥 Error en customersService.markOptIn(${withPlus}, ${userId}): ${err?.message}`,
      );

    }

    const pendingMessages = await this.pendingMessagesService.getPendingMessagesForRecipient(
      noPlus,
      userId,
    );

    if (pendingMessages.length === 0) {
      logger.warn(
        `⚠️ No hay mensajes en cola para ${noPlus} (userId=${userId}). No se envía nada.`,
      );
      return [];
    }
    logger.log(
      `📦 Mensajes pendientes encontrados para ${noPlus} / userId=${userId}: ${pendingMessages.length}`,
    );

    try {
      await this.pendingMessagesService.markOptInReceived(noPlus, userId);
      logger.log(`✅ markOptInReceived aplicado para ${noPlus} / userId=${userId}`);
    } catch (err: any) {
      logger.error(
        `💥 Error en markOptInReceived(${noPlus}, ${userId}): ${err?.message}`,
      );

    }

    const whatsappAccount = await this.resolveWhatsAppAccount(userId);

    if (!whatsappAccount) {
      logger.error(
        `💥 No se encontró ninguna WhatsAppAccount ACTIVA para userId=${userId}. No puedo enviar los mensajes pendientes.`,
      );
      return [];
    }

    logger.log(
      `📲 Usando WhatsAppAccount ${whatsappAccount.id} phoneNumberId=${whatsappAccount.phoneNumberId}`,
    );

    const processedMessages: MessageLog[] = [];

    for (let i = 0; i < pendingMessages.length; i++) {
      const pendingMessage = pendingMessages[i];
      logger.log(
        `🚀 Enviando mensaje pendiente ${pendingMessage.id} -> ${pendingMessage.recipientNumber} (type=${pendingMessage.type})`,
      );

      try {

        let template: any = null;
        if (
          pendingMessage.templateId &&
          /^[0-9a-fA-F-]{10,}$/.test(pendingMessage.templateId)
        ) {
          if (typeof this.templatesService?.findOne === 'function') {
            try {
              template = await this.templatesService.findOne(
                pendingMessage.templateId,
                userId,
              );
            } catch {
              template = null;
            }
          }
        }

        const dto: SendMessageDto = {
          type: pendingMessage.type,
          content: pendingMessage.content,
          templateId: pendingMessage.templateId,
          templateParams: pendingMessage.templateParams,
          mediaAttachments: pendingMessage.mediaAttachments,
          scheduledAt: pendingMessage.scheduledAt,
          priority: pendingMessage.priority,
        };

        const messageLog = await this.createDirectMessage({
          recipientNumber: pendingMessage.recipientNumber,
          userId,
          whatsappAccountId: whatsappAccount.id,
          sendMessageDto: dto,
          template,
        });

        if (i < pendingMessages.length - 1) {
          await new Promise(res => setTimeout(res, 1000));
        }

        logger.log(
          `✅ Mensaje pendiente ${pendingMessage.id} enviado OK. Se creó MessageLog ${messageLog.id} con status=${messageLog.status}`,
        );

        processedMessages.push(messageLog);

        if (typeof this.pendingMessagesService.markAsSent === 'function') {
          try {
            await this.pendingMessagesService.markAsSent(pendingMessage.id);
            logger.log(`📝 PendingMessage ${pendingMessage.id} marcado como enviado.`);
          } catch (errMark: any) {
            logger.error(
              `⚠️ No pude marcar PendingMessage ${pendingMessage.id} como enviado: ${errMark?.message}`,
            );
          }
        } else {
          logger.warn(
            `ℹ️ pendingMessagesService.markAsSent no existe. Asegúrate de limpiar la cola manualmente.`,
          );
        }
      } catch (err: any) {

        logger.error(
          `💥 Error enviando PendingMessage ${pendingMessage.id} a ${pendingMessage.recipientNumber}: ${err?.message}`,
        );

        if (typeof this.pendingMessagesService.markAsFailed === 'function') {
          try {
            await this.pendingMessagesService.markAsFailed(
              pendingMessage.id,
              err?.message ?? 'unknown error',
            );
            logger.error(`❌ PendingMessage ${pendingMessage.id} marcado como fallido.`);
          } catch (errFail: any) {
            logger.error(
              `💥 No pude marcar como fallido ${pendingMessage.id}: ${errFail?.message}`,
            );
          }
        }
      }
    }

    logger.log(
      `🎉 FIN processPendingMessagesForOptIn para ${withPlus} / ${noPlus}. ` +
      `Enviados con éxito: ${processedMessages.length} mensajes.`,
    );

    return processedMessages;
  }

  /**
   * Limpia (marca como PROCESSED) todos los mensajes pendientes para un número.
   * Se usa cuando el cliente ya tiene opt-in válido y se va a enviar directamente.
   * Evita que se envíen duplicados de la cola pendiente.
   */
  async cleanupPendingMessagesForCustomer(phoneNumber: string, userId: string): Promise<number> {
    const logger = new Logger('MessagesService.cleanupPendingMessages');
    const withPlus = phoneNumber.startsWith('+') ? phoneNumber.trim() : `+${phoneNumber.trim()}`;
    const noPlus = withPlus.replace(/^\+/, '').trim();

    // Obtener mensajes pendientes que aún no se han procesado
    const pendingMessages = await this.pendingMessagesService.getPendingMessagesForRecipient(
      noPlus,
      userId,
    );

    if (pendingMessages.length === 0) {
      return 0;
    }

    logger.log(`🧹 Limpiando ${pendingMessages.length} mensajes pendientes para ${phoneNumber} (userId=${userId})`);

    // Marcar todos como procesados (ya no se enviarán)
    for (const pm of pendingMessages) {
      try {
        await this.pendingMessagesService.markAsSent(pm.id);
        logger.log(`  - Mensaje ${pm.id} marcado como procesado (limpieza)`);
      } catch (err: any) {
        logger.warn(`  - No se pudo limpiar mensaje ${pm.id}: ${err?.message}`);
      }
    }

    return pendingMessages.length;
  }

  /**
   * Dev stats de la cola de opt-in
   */
  async getPendingMessageStats(userId: string) {
    return this.pendingMessagesService.getPendingMessageStats(userId);
  }

  /**
   * Recuperación DURABLE de mensajes programados/reintentos.
   *
   * Los envíos diferidos y los reintentos se agendan con setTimeout en memoria
   * (baja latencia en el happy path), pero en Cloud Run / contenedores efímeros
   * cualquier reinicio o escalado a cero pierde esos timers y los mensajes
   * QUEUED/RETRYING quedan colgados sin recuperación.
   *
   * Este cron recorre la DB cada minuto y reprocesa los mensajes QUEUED/RETRYING
   * cuya fecha programada ya venció (o sin fecha), garantizando entrega tras un
   * reinicio. processMessage es seguro de reejecutar: solo envía si el mensaje
   * sigue pendiente y persiste el estado final.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async recoverDueScheduledMessages(): Promise<void> {
    const now = new Date();

    const due = await this.messageLogRepository.find({
      where: [
        { status: MessageStatus.QUEUED, scheduledAt: LessThanOrEqual(now) },
        { status: MessageStatus.RETRYING },
      ],
      take: 200,
      order: { scheduledAt: 'ASC' },
    });

    if (due.length === 0) return;

    this.logger.log(
      `🔁 Recuperando ${due.length} mensaje(s) programado(s)/en reintento tras posible reinicio`,
    );

    for (const messageLog of due) {
      try {
        await this.processMessage(messageLog);
      } catch (err: any) {
        this.logger.error(
          `Recovery: fallo reprocesando messageLog ${messageLog.id}: ${err?.message}`,
        );
      }
    }
  }

  async bulkSend(
    bulkSendDto: BulkSendDto,
    userId: string,
  ): Promise<{
    totalMessages: number;
    messageLogs: MessageLog[];
  }> {
    // Resolver destinatarios UNA sola vez y reutilizar el resultado tanto para
    // validar el límite del plan como para construir el envío. Antes se llamaba
    // getRecipients dos veces (duplicaba queries con joins y podía dar resultados
    // distintos si los datos cambiaban entre llamadas).
    const recipients = await this.getRecipients(bulkSendDto, userId);

    // ─── Verificar límites para cuentas gratuitas ───
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user && user.role === UserRole.USER) {
      if (recipients.length > FREE_PLAN_LIMITS.MAX_BULK_RECIPIENTS) {
        throw new BadRequestException(
          `El plan gratuito permite envío masivo a máximo ${FREE_PLAN_LIMITS.MAX_BULK_RECIPIENTS} destinatarios por envío. ` +
          `Intentas enviar a ${recipients.length}. Actualiza a Premium para envíos ilimitados.`
        );
      }
    }

    const template = await this.templatesService.findOne(
      bulkSendDto.templateId,
      userId,
    );

    if (!template.isApproved) {
      throw new BadRequestException(
        'Template must be approved before bulk sending',
      );
    }

    if (recipients.length === 0) {
      throw new BadRequestException('No valid recipients found');
    }

    const sendMessageDto: SendMessageDto = {
      recipientNumbers: recipients,
      templateId: bulkSendDto.templateId,
      templateParams: bulkSendDto.templateParams,
      type: MessageType.TEMPLATE,
      scheduledAt: bulkSendDto.scheduledAt,
      priority: bulkSendDto.priority,
    };

    const messageLogs = await this.sendMessage(sendMessageDto, userId);

    await this.templatesService.incrementUsage(bulkSendDto.templateId);

    return {
      totalMessages: messageLogs.length,
      messageLogs,
    };
  }

  async getMessages(
    userId: string,
    filters?: {
      status?: MessageStatus;
      type?: MessageType;
      recipientNumber?: string;
      page?: number;
      limit?: number;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<{
    messages: MessageTemplate[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = this.messageTemplateRepository
      .createQueryBuilder('message')
      .where('message.userId = :userId', { userId });

    if (filters?.status) {
      query.andWhere('message.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.type) {
      query.andWhere('message.type = :type', {
        type: filters.type,
      });
    }

    if (filters?.recipientNumber) {
      query.andWhere('message.recipientNumber LIKE :recipientNumber', {
        recipientNumber: `%${filters.recipientNumber}%`,
      });
    }

    if (filters?.dateFrom) {
      query.andWhere('message.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters?.dateTo) {
      query.andWhere('message.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    query.orderBy('message.createdAt', 'DESC').skip(offset).take(limit);

    const [messages, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { messages, total, page, totalPages };
  }

  async getMessageById(
    id: string,
    userId: string,
  ): Promise<MessageLog> {
    const message = await this.messageLogRepository.findOne({
      where: { id, userId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async retryMessage(
    id: string,
    userId: string,
  ): Promise<MessageLog> {
    const messageLog = await this.getMessageById(id, userId);

    if (messageLog.status !== MessageStatus.FAILED) {
      throw new BadRequestException(
        'Only failed messages can be retried',
      );
    }

    messageLog.status = MessageStatus.PENDING;
    messageLog.retryCount += 1;
    messageLog.errorDetails = null as any;

    const updatedMessage =
      await this.messageLogRepository.save(messageLog);
    await this.processMessage(updatedMessage);

    return updatedMessage;
  }

  async cancelMessage(
    id: string,
    userId: string,
  ): Promise<MessageLog> {
    const messageLog = await this.getMessageById(id, userId);

    if (
      ![MessageStatus.PENDING, MessageStatus.QUEUED].includes(
        messageLog.status,
      )
    ) {
      throw new BadRequestException(
        'Only pending or queued messages can be cancelled',
      );
    }

    messageLog.status = MessageStatus.CANCELLED;
    return this.messageLogRepository.save(messageLog);
  }

  /**
   * Envía efectivamente por la API de WhatsApp (Meta).
   * No hay simulación.
   */
  private async processMessage(messageLog: MessageLog): Promise<void> {
    try {
      messageLog.status = MessageStatus.PROCESSING;
      await this.messageLogRepository.save(messageLog);

      const whatsappAccount =
        await this.whatsappAccountRepository.findOne({
          where: { id: messageLog.whatsappAccountId },
        });

      if (!whatsappAccount || !whatsappAccount.accessToken) {
        throw new Error('WhatsApp account not configured');
      }

      let whatsappMessageId: string;

      if (messageLog.type === MessageType.TEMPLATE) {
        whatsappMessageId = await this.sendTemplateMessage(
          messageLog,
          whatsappAccount,
        );
      } else if (messageLog.type === MessageType.TEXT) {
        whatsappMessageId = await this.sendTextMessage(
          messageLog,
          whatsappAccount,
        );
      } else if (messageLog.type === MessageType.MEDIA) {
        whatsappMessageId = await this.sendMediaMessage(
          messageLog,
          whatsappAccount,
        );
      } else {
        throw new Error(
          `Unsupported message type: ${messageLog.type}`,
        );
      }

      messageLog.whatsappMessageId = whatsappMessageId;
      messageLog.status = MessageStatus.SENT;
      messageLog.sentAt = new Date();

      await this.customersService.updateLastContact(
        messageLog.recipientNumber,
        messageLog.userId,
      );

      // ── Escribir en Firestore para que aparezca en el Chat ──
      try {
        const phone = messageLog.recipientNumber.replace(/^\+/, '');
        const customerName = await this.getCustomerNameForChat(phone, messageLog.userId);
        const chatMsg: ChatMessage = {
          content: messageLog.content || `[${messageLog.type}]`,
          direction: 'outbound',
          type: messageLog.type === MessageType.TEXT ? 'text'
              : messageLog.type === MessageType.TEMPLATE ? 'template'
              : messageLog.type === MessageType.MEDIA ? 'image'
              : 'text',
          status: 'sent',
          timestamp: admin.firestore.Timestamp.now(),
          whatsappMessageId,
          senderName: 'Agente',
          templateName: messageLog.templateId || undefined,
        };
        await this.firestoreService.writeMessage(phone, chatMsg, messageLog.userId, customerName, messageLog.whatsappAccountId);
      } catch (fsErr: any) {
        this.logger.warn(`⚠️ Firestore write failed (non-blocking): ${fsErr?.message}`);
      }
    } catch (error: any) {
      const metaError = error?.response?.data?.error;
      const errorMessage = metaError?.message || metaError?.error_user_msg || error?.message || 'Unknown error occurred';
      const errorCode = metaError?.code?.toString() || error?.code || 'UNKNOWN_ERROR';

      messageLog.status = MessageStatus.FAILED;
      messageLog.errorDetails = {
        code: errorCode,
        message: errorMessage,
        details: error?.response?.data,
      } as any;

      // No reintentar errores permanentes de Meta (cuenta no registrada, template inválido, params mismatch, etc.)
      const PERMANENT_META_ERRORS = [133010, 131009, 130472, 132000, 132001, 100];
      const metaErrorCode = metaError?.code;
      const isPermanentError = metaErrorCode && PERMANENT_META_ERRORS.includes(metaErrorCode);

      if (!isPermanentError && messageLog.retryCount < 3) {
        setTimeout(async () => {
          messageLog.retryCount += 1;
          messageLog.status = MessageStatus.RETRYING;
          await this.messageLogRepository.save(messageLog);
          await this.processMessage(messageLog);
        }, Math.pow(2, messageLog.retryCount) * 1000);
      }
    }

    await this.messageLogRepository.save(messageLog);
  }

  /**
   * Envío de plantilla (Meta Cloud API).
   * Usa el NOMBRE de la plantilla (template.name), pero en BD guardamos el UUID interno.
   */
  private async sendTemplateMessage(
    messageLog: MessageLog,
    whatsappAccount: WhatsAppAccount,
  ): Promise<string> {
    const template = await this.templatesService.findOne(
      messageLog.templateId,
      messageLog.userId,
    );

    if (!template.isApproved) {
      throw new BadRequestException(
        `Template ${template.id} no está aprobado. Debe estar en estado APPROVED.`,
      );
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      to: messageLog.recipientNumber,
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        components: [],
      },
    };

    if (
      messageLog.templateParams &&
      messageLog.templateParams.length > 0
    ) {
      payload.template.components.push({
        type: 'body',
        parameters: messageLog.templateParams.map(param => ({
          type: 'text',
          text: param,
        })),
      });
    }

    this.logger.log(
      '🔍 DEBUG Template payload:',
      JSON.stringify(payload, null, 2),
    );
    this.logger.log(
      `🔍 DEBUG Endpoint: ${this.WHATSAPP_API_URL}${whatsappAccount.phoneNumberId}/messages`,
    );

    const response = await axios.post(
      `${this.WHATSAPP_API_URL}/${whatsappAccount.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${whatsappAccount.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return this.extractWhatsAppMessageId(response);
  }

  /**
   * Extrae el id del mensaje de la respuesta de Meta de forma defensiva.
   * Si Meta responde 200 sin `messages` (errores parciales, respuestas de
   * estado o cambios de formato), lanza un error descriptivo en vez de un
   * "Cannot read properties of undefined" que ocultaría la causa real.
   */
  private extractWhatsAppMessageId(response: any): string {
    const id = response?.data?.messages?.[0]?.id;
    if (!id) {
      throw new Error(
        `WhatsApp API did not return a message id: ${JSON.stringify(response?.data)}`,
      );
    }
    return id;
  }

  private async sendTextMessage(
    messageLog: MessageLog,
    whatsappAccount: WhatsAppAccount,
  ): Promise<string> {
    const payload = {
      messaging_product: 'whatsapp',
      to: messageLog.recipientNumber,
      type: 'text',
      text: {
        body: messageLog.content,
      },
    };

    const response = await axios.post(
      `${this.WHATSAPP_API_URL}/${whatsappAccount.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${whatsappAccount.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return this.extractWhatsAppMessageId(response);
  }

  private async sendMediaMessage(
    messageLog: MessageLog,
    whatsappAccount: WhatsAppAccount,
  ): Promise<string> {
    if (
      !messageLog.mediaAttachments ||
      messageLog.mediaAttachments.length === 0
    ) {
      throw new Error('No media attachments provided');
    }

    const media = messageLog.mediaAttachments[0];
    // Usar el content del mensaje como caption si media.caption está vacío
    // El content ya viene personalizado con las variables reemplazadas
    const caption = messageLog.content || media.caption || '';

    this.logger.log(`📷 sendMediaMessage DEBUG:`);
    this.logger.log(`  - type: "${media.type}", url: "${media.url}"`);
    this.logger.log(`  - messageLog.content: "${messageLog.content}"`);
    this.logger.log(`  - media.caption: "${media.caption}"`);
    this.logger.log(`  - media.filename: "${media.filename}"`);
    this.logger.log(`  - Final caption: "${caption}"`);

    // Construir payload según tipo de media
    // WhatsApp API: image/video soportan caption, document soporta filename+caption, audio no soporta caption
    const mediaPayload: any = {
      link: media.url,
    };

    if (media.type === 'document') {
      // Para documentos: incluir filename y caption
      mediaPayload.filename = media.filename || this.extractFilenameFromUrl(media.url);
      mediaPayload.caption = caption;
    } else if (media.type === 'audio') {
      // Audio no soporta caption ni filename
    } else {
      // image, video, sticker: soportan caption
      mediaPayload.caption = caption;
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      to: messageLog.recipientNumber,
      type: media.type,
      [media.type]: mediaPayload,
    };

    this.logger.log(`📷 WhatsApp payload: ${JSON.stringify(payload)}`);

    const response = await axios.post(
      `${this.WHATSAPP_API_URL}/${whatsappAccount.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${whatsappAccount.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return this.extractWhatsAppMessageId(response);
  }

  /**
   * Extrae el nombre de archivo de una URL de Firebase Storage.
   * Ej: "https://storage.googleapis.com/bucket/uploads/uuid.pdf" -> "document.pdf"
   */
  private extractFilenameFromUrl(url: string): string {
    try {
      const urlPath = new URL(url).pathname;
      const ext = urlPath.split('.').pop() || 'bin';
      return `document.${ext}`;
    } catch {
      return 'document';
    }
  }

  /**
   * Construye la lista de destinatarios a partir de:
   * - recipientNumber directo
   * - recipientNumbers[]
   * - customerTags[]
   * Aplica normalización + filtro de duplicados.
   */
  private async getRecipients(
    dto: SendMessageDto | BulkSendDto,
    userId: string,
  ): Promise<string[]> {
    let recipients: string[] = [];

    if ('recipientNumber' in dto && dto.recipientNumber) {
      recipients.push(dto.recipientNumber);
    }
    if (
      'recipientNumbers' in dto &&
      (dto as SendMessageDto).recipientNumbers
    ) {
      recipients.push(
        ...(dto as SendMessageDto).recipientNumbers!,
      );
    }
    if (dto.customerTags && dto.customerTags.length > 0) {
      const customers = await this.customersService.getByTags(
        userId,
        dto.customerTags,
      );
      recipients.push(
        ...customers.map(customer => customer.phoneNumber),
      );
    }

    recipients = recipients.map(p => this.normalizePhone(p)).filter(Boolean);
    recipients = [...new Set(recipients)];
    recipients = recipients.filter(p => this.isValidPhoneNumber(p));

    return recipients;
  }

  /**
   * Devuelve la cuenta de WhatsApp activa para el user.
   *
   * Auto-crear una cuenta dummy con accessToken 'dev-token' solo está permitido
   * cuando se activa explícitamente la flag ALLOW_DEV_WA_ACCOUNT (no por NODE_ENV,
   * que suele quedar sin setear o en 'staging' y disparaba la creación de cuentas
   * falsas que luego ensuciaban la tabla y rompían los envíos contra Meta).
   */
  private async getActiveWhatsAppAccount(
    userId: string,
  ): Promise<WhatsAppAccount> {
    let account = await this.whatsappAccountRepository.findOne({
      where: { userId, isActive: true },
    });

    if (
      !account &&
      process.env.ALLOW_DEV_WA_ACCOUNT === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      const suffix = Date.now().toString().slice(-6);
      const devAccount = this.whatsappAccountRepository.create({
        name: 'Dev Test Account',
        phoneNumber: `+100000${suffix}`,
        phoneNumberId: `dev-phone-${suffix}`,
        businessAccountId: `dev-biz-${suffix}`,
        accessToken: 'dev-token',
        type: AccountType.SANDBOX,
        status: AccountStatus.ACTIVE,
        isActive: true,
        userId,
        verifiedAt: new Date(),
        lastActiveAt: new Date(),
      });
      account =
        await this.whatsappAccountRepository.save(devAccount);
    }

    if (!account) {
      throw new BadRequestException(
        'No active WhatsApp account found',
      );
    }

    return account;
  }

  /**
   * Dada una pista (accountId explícito, phoneNumberId, businessAccountId)
   * intenta localizar la cuenta. Si no, cae a la activa.
   */
  private async resolveWhatsAppAccount(
    userId: string,
    accountId?: string,
  ): Promise<WhatsAppAccount> {
    if (accountId) {
      let account = await this.whatsappAccountRepository
        .findOne({ where: { id: accountId, userId } })
        .catch(() => null as any);

      if (!account) {
        account = await this.whatsappAccountRepository
          .findOne({
            where: { phoneNumberId: accountId, userId },
          })
          .catch(() => null as any);
      }
      if (!account) {
        account = await this.whatsappAccountRepository
          .findOne({
            where: { businessAccountId: accountId, userId },
          })
          .catch(() => null as any);
      }
      if (account) {
        return account;
      }
    }

    return this.getActiveWhatsAppAccount(userId);
  }

  private normalizePhone(n: string): string {
    return n.replace(/[^\d+]/g, '').trim();
  }

  private isValidPhoneNumber(phone: string): boolean {
    const p = this.normalizePhone(phone);
    return /^\+?[1-9]\d{6,14}$/.test(p);
  }

  private isLikelyUuid(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }

  /**
   * Historial de message_logs con filtros y paginación.
   */
  async getMessageLogs(
    userId: string,
    filters?: {
      status?: MessageStatus;
      direction?: MessageDirection;
      recipientNumber?: string;
      page?: number;
      limit?: number;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<{
    logs: MessageLog[];
    total: number;
    page: number;
    totalPages: number;
    customerMap: Record<string, { name: string; tags: { name: string; color: string }[] }>;
  }> {
    const query = this.messageLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId });

    if (filters?.status) {
      query.andWhere('log.status = :status', { status: filters.status });
    }

    if (filters?.direction) {
      query.andWhere('log.direction = :direction', { direction: filters.direction });
    }

    if (filters?.recipientNumber) {
      query.andWhere('log.recipientNumber LIKE :recipientNumber', {
        recipientNumber: `%${filters.recipientNumber}%`,
      });
    }

    if (filters?.dateFrom) {
      query.andWhere('log.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters?.dateTo) {
      query.andWhere('log.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    query.orderBy('log.createdAt', 'DESC').skip(offset).take(limit);

    const [logs, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Enriquecer con info de clientes y etiquetas
    const phoneNumbers = [...new Set(logs.map(l => l.recipientNumber).filter(Boolean))];
    // Normalizar: algunos logs guardan con '+' y otros sin
    const phonesNormalized = phoneNumbers.flatMap(p => {
      const clean = p.replace(/^\+/, '');
      return [clean, `+${clean}`];
    });

    const customerMap: Record<string, { name: string; tags: { name: string; color: string }[] }> = {};

    if (phonesNormalized.length > 0) {
      const customers = await this.customersService.findByPhoneNumbers(userId, phonesNormalized);
      for (const c of customers) {
        const phone = c.phoneNumber.replace(/^\+/, '');
        const tags = (c.tagAssignments || []).map(a => ({
          name: a.tag?.name || '',
          color: a.tag?.color || '#007bff',
        })).filter(t => t.name);
        const entry = { name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || phone, tags };
        customerMap[phone] = entry;
        customerMap[`+${phone}`] = entry;
      }
    }

    return { logs, total, page, totalPages, customerMap };
  }

  async getMessageStats(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    byStatus: Record<MessageStatus, number>;
  }> {
    const query = this.messageLogRepository
      .createQueryBuilder('message')
      .where('message.userId = :userId', { userId });

    if (dateFrom) {
      query.andWhere('message.createdAt >= :dateFrom', {
        dateFrom,
      });
    }

    if (dateTo) {
      query.andWhere('message.createdAt <= :dateTo', {
        dateTo,
      });
    }

    const messages = await query.getMany();

    const stats = {
      total: messages.length,
      sent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      byStatus: {} as Record<MessageStatus, number>,
    };

    Object.values(MessageStatus).forEach(status => {
      stats.byStatus[status] = 0;
    });

    messages.forEach(message => {
      stats.byStatus[message.status]++;

      switch (message.status) {
        case MessageStatus.SENT:
          stats.sent++;
          break;
        case MessageStatus.DELIVERED:
          stats.delivered++;
          break;
        case MessageStatus.FAILED:
          stats.failed++;
          break;
        case MessageStatus.PENDING:
        case MessageStatus.QUEUED:
        case MessageStatus.PROCESSING:
        case MessageStatus.RETRYING:
          stats.pending++;
          break;
      }
    });

    return stats;
  }

  async updateMessage(
    id: string,
    updateData: any,
    userId: string,
  ): Promise<any> {
    const message =
      await this.messageTemplateRepository.findOne({
        where: { id, userId },
      });

    if (!message) {
      throw new Error('Message not found');
    }

    // Solo actualizar campos que existen en la entidad
    const allowedFields = ['content', 'mediaAttachments', 'mediaType', 'messageType', 'active', 'order'];
    const filteredData: any = {};
    for (const field of allowedFields) {
      if (field in updateData) {
        filteredData[field] = updateData[field];
      }
    }

    Object.assign(message, filteredData);
    const updated = await this.messageTemplateRepository.save(message);

    return {
      id: updated.id,
      content: updated.content,
      mediaAttachments: updated.mediaAttachments || null,
      mediaType: updated.mediaType || null,
      messageType: updated.messageType || 'text',
      active: updated.active,
      order: updated.order,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Reordena múltiples mensajes de una sola vez.
   * Recibe un array [{ id, order }] y actualiza cada uno.
   */
  async reorderMessages(
    items: { id: string; order: number }[],
    userId: string,
  ): Promise<{ success: boolean; updated: number }> {
    let updated = 0;
    for (const item of items) {
      const result = await this.messageTemplateRepository.update(
        { id: item.id, userId },
        { order: item.order },
      );
      if (result.affected > 0) updated++;
    }
    return { success: true, updated };
  }

  async deleteMessage(
    id: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const result = await this.messageTemplateRepository.delete({
      id,
      userId,
    });
    return { success: result.affected > 0 };
  }

  async convertTemplate(
    templateText: string,
  ): Promise<{ convertedText: string; variables: string[] }> {
    const variables: string[] = [];
    const convertedText = templateText.replace(
      /\{\{(\w+)\}\}/g,
      (match, variable) => {
        variables.push(variable);
        return `{{${variable}}}`;
      },
    );

    return {
      convertedText,
      variables: [...new Set(variables)],
    };
  }

  async previewMessage(
    templateText: string,
  ): Promise<{ preview: string; variables: string[] }> {
    const conversion = await this.convertTemplate(templateText);

    let preview = conversion.convertedText;
    conversion.variables.forEach(variable => {
      const sampleValue = this.getSampleValue(variable);
      preview = preview.replace(
        new RegExp(`{{${variable}}}`, 'g'),
        sampleValue,
      );
    });

    return {
      preview,
      variables: conversion.variables,
    };
  }

  private getSampleValue(variable: string): string {
    const samples: Record<string, string> = {
      name: 'Juan Pérez',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@example.com',
      phone: '+1234567890',
      company: 'Empresa ABC',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };

    return samples[variable.toLowerCase()] || `[${variable}]`;
  }

  async createMessageTemplate(
    data: CreateMessageTemplateDto,
    userId: string,
  ) {
    const template = this.messageTemplateRepository.create({
      ...data,
      userId,
    });
    const savedTemplate =
      await this.messageTemplateRepository.save(template);
    return savedTemplate;
  }

  async getMessageTemplates(userId: string): Promise<MessageTemplate[]> {
    // Solo obtener mensajes activos para envío
    return await this.messageTemplateRepository.find({
      where: { userId, active: true },
      order: { order: 'ASC', createdAt: 'DESC' },
    });
  }

  async updateMessageTemplate(
    id: string,
    data: any,
    userId: string,
  ) {
    const template = await this.messageTemplateRepository.findOne({
      where: { id, userId },
    });

    if (!template) {
      throw new NotFoundException(
        'Plantilla de mensaje no encontrada',
      );
    }

    // Solo actualizar campos que existen en la entidad
    const allowedFields = ['content', 'mediaAttachments', 'mediaType', 'messageType', 'active', 'order'];
    const filteredData: any = {};
    for (const field of allowedFields) {
      if (field in data) {
        filteredData[field] = data[field];
      }
    }

    Object.assign(template, filteredData);
    const updatedTemplate =
      await this.messageTemplateRepository.save(template);

    return {
      id: updatedTemplate.id,
      message: (updatedTemplate as any).content,
      file:
        updatedTemplate.mediaAttachments?.[0]?.url ||
        null,
      mediaType:
        updatedTemplate.mediaAttachments?.[0]?.type ||
        null,
      active: updatedTemplate.active,
      order: updatedTemplate.order,
      messageType: 'text',
      createdAt: updatedTemplate.createdAt,
      updatedAt: updatedTemplate.updatedAt,
    };
  }

  async deleteMessageTemplate(
    id: string,
    userId: string,
  ): Promise<void> {
    const template = await this.messageTemplateRepository.findOne({
      where: { id, userId },
    });

    if (!template) {
      throw new NotFoundException(
        'Plantilla de mensaje no encontrada',
      );
    }

    await this.messageTemplateRepository.remove(template);
  }

  /**
   * Helper: obtener nombre del cliente para el chat de Firestore.
   */
  private async getCustomerNameForChat(phone: string, userId: string): Promise<string> {
    try {
      const phoneWithPlus = phone.startsWith('+') ? phone : `+${phone}`;
      const customers = await this.customersService.findByPhoneNumbers(userId, [phone, phoneWithPlus]);
      if (customers.length > 0) {
        const c = customers[0];
        return [c.firstName, c.lastName].filter(Boolean).join(' ') || phone;
      }
    } catch {}
    return phone;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Repository } from 'typeorm';
import { PendingMessage, PendingMessageStatus } from '../entities/pending-message.entity';
import { Customer, CustomerStatus } from '../../customers/entities/customer.entity';
import { MessageType } from '../entities/message-log.entity';

@Injectable()
export class PendingMessagesService {
  constructor(
    @InjectRepository(PendingMessage)
    private pendingMessageRepository: Repository<PendingMessage>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) { }

  /**
   * Formato interno ESTÁNDAR:
   * - sólo dígitos
   * - si viene "3023..." => lo convertimos a "573023..."
   * - nunca dejamos "+"
   * Ej: "+57 302 394 9465" -> "573023949465"
   */
  private normalizePhone(raw: string): string {
    if (!raw) return raw;

    let p = raw.replace(/[^\d]/g, '');

    if (/^57\d{10}$/.test(p)) {
      return p;
    }

    if (/^3\d{9}$/.test(p)) {
      return '57' + p;
    }

    return p;
  }

  /**
   * Variantes posibles que PUDIERON haberse guardado en la DB
   * Ej: "573023949465" => ["573023949465", "+573023949465", "3023949465"]
   */
  public buildPhoneVariants(raw: string): string[] {
    const norm = this.normalizePhone(raw);

    const variants = new Set<string>();
    if (norm) {
      variants.add(norm);
      variants.add('+' + norm);

      if (norm.startsWith('57') && norm.length === 12) {
        variants.add(norm.slice(2));
      }
    }

    if (raw) {
      variants.add(raw.trim());
      variants.add(raw.trim().replace(/^\+/, ''));
    }

    return Array.from(variants);
  }

  /**
   * Verifica si ya existe un pending_message con opt-in enviado
   * para este número y usuario EN LAS ÚLTIMAS 2 HORAS.
   * Si los pending messages son más viejos, se consideran expirados
   * y se permite re-enviar el opt-in template.
   */
  async hasRecentOptInSent(
    phoneNumber: string,
    userId: string,
  ): Promise<boolean> {
    const variants = this.buildPhoneVariants(phoneNumber);
    // Solo considerar pending messages de las últimas 2 horas
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existing = await this.pendingMessageRepository.findOne({
      where: variants.map(v => ({
        recipientNumber: v,
        userId,
        status: In([PendingMessageStatus.OPT_IN_SENT, PendingMessageStatus.WAITING_OPT_IN]),
        createdAt: MoreThan(twoHoursAgo),
      })),
    });
    return !!existing;
  }

  /**
   * Cancela todos los pending messages activos (WAITING_OPT_IN/OPT_IN_SENT)
   * para un número de teléfono específico y usuario.
   * Retorna la cantidad de registros cancelados.
   */
  async cancelPendingMessagesForRecipient(
    phoneNumber: string,
    userId: string,
  ): Promise<number> {
    const variants = this.buildPhoneVariants(phoneNumber);
    const result = await this.pendingMessageRepository.update(
      {
        recipientNumber: In(variants),
        userId,
        status: In([PendingMessageStatus.WAITING_OPT_IN, PendingMessageStatus.OPT_IN_SENT]),
      },
      { status: PendingMessageStatus.CANCELLED },
    );
    return result.affected || 0;
  }

  /**
   * Marca como EXPIRED todos los pending messages más viejos que `maxAgeHours`
   * que aún estén en WAITING_OPT_IN u OPT_IN_SENT.
   * Retorna la cantidad de registros expirados.
   */
  async expireOldPendingMessages(maxAgeHours: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    const result = await this.pendingMessageRepository.update(
      {
        status: In([PendingMessageStatus.WAITING_OPT_IN, PendingMessageStatus.OPT_IN_SENT]),
        createdAt: LessThan(cutoff),
      },
      { status: PendingMessageStatus.EXPIRED },
    );
    return result.affected || 0;
  }

  async checkOptInStatus(
    phoneNumber: string,
    userId: string,
  ): Promise<{
    hasOptIn: boolean;
    customer?: Customer;
    reason?: string;
  }> {
    const variants = this.buildPhoneVariants(phoneNumber);

    const customer = await this.customerRepository.findOne({
      where: variants.map(v => ({ phoneNumber: v, userId })),
    });

    if (!customer) {
      return {
        hasOptIn: false,
        reason: 'customer_not_found',
      };
    }

    if (customer.status !== CustomerStatus.ACTIVE) {
      return { hasOptIn: false, customer, reason: 'inactive_customer' };
    }

    if (customer.optOutAt !== null) {
      return { hasOptIn: false, customer, reason: 'opted_out' };
    }

    if (!customer.optInAt) {
      return { hasOptIn: false, customer, reason: 'no_opt_in_timestamp' };
    }

    const now = new Date();
    const diffMs = now.getTime() - customer.optInAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours >= 24) {
      return { hasOptIn: false, customer, reason: 'opt_in_expired' };
    }

    return {
      hasOptIn: true,
      customer,
      reason: 'valid_opt_in',
    };
  }

  async createPendingMessage(
    recipientNumber: string,
    userId: string,
    messageData: {
      type: MessageType;
      content?: string;
      templateId?: string;
      templateParams?: string[];
      mediaAttachments?: any[];
      scheduledAt?: Date;
      priority?: number;
    },
    customerId?: string,
  ): Promise<PendingMessage> {
    const normalizedRecipient = this.normalizePhone(recipientNumber);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const pendingMessage = this.pendingMessageRepository.create({
      recipientNumber: normalizedRecipient,
      userId,
      customerId,
      status: PendingMessageStatus.WAITING_OPT_IN,
      type: messageData.type,
      content: messageData.content,
      templateId: messageData.templateId,
      templateParams: messageData.templateParams,
      mediaAttachments: messageData.mediaAttachments,
      scheduledAt: messageData.scheduledAt,
      priority: messageData.priority || 0,
      expiresAt,
      metadata: {
        originalSendAttempt: new Date(),
      },
    });

    return this.pendingMessageRepository.save(pendingMessage);
  }

  /**
   * Primer intento:
   *   - busca mensajes WAITING_OPT_IN para este userId y cualquier variante del número.
   *
   * Si no encuentra nada:
   *   - (modo DEV) busca mensajes WAITING_OPT_IN para ese número SIN filtrar userId
   *   - los "reclama": reasigna userId => el que acaba de dar "SI"
   *   - devuelve esa lista.
   *
   * Esto arregla el caso donde metiste en cola mensajes con otro userId distinto.
   */
  async getPendingMessagesForAnyUser(
    rawPhone: string,
    userId: string,
  ): Promise<PendingMessage[]> {
    const variants = this.buildPhoneVariants(rawPhone);

    let msgs = await this.pendingMessageRepository.find({
      where: variants.map(v => ({
        recipientNumber: v,
        userId,
        status: PendingMessageStatus.WAITING_OPT_IN,
      })),
      order: { priority: 'ASC', createdAt: 'ASC' },
    });

    if (msgs.length > 0) {
      return msgs;
    }

    msgs = await this.pendingMessageRepository.find({
      where: variants.map(v => ({
        recipientNumber: v,
        status: PendingMessageStatus.WAITING_OPT_IN,
      })),
      order: { priority: 'ASC', createdAt: 'ASC' },
    });

    for (const m of msgs) {
      if (m.userId !== userId) {
        m.userId = userId;
        await this.pendingMessageRepository.save(m);
      }
    }

    return msgs;
  }

  async getPendingMessagesForRecipient(
    phoneNumber: string,
    userId: string,
  ): Promise<PendingMessage[]> {
    // Buscar mensajes que ya tienen el template de opt-in enviado (OPT_IN_SENT)
    // o que aún están esperando (WAITING_OPT_IN) para cubrir ambos casos
    const variants = this.buildPhoneVariants(phoneNumber);

    return this.pendingMessageRepository.find({
      where: variants.flatMap(v => [
        {
          recipientNumber: v,
          userId,
          status: PendingMessageStatus.OPT_IN_SENT,
        },
        {
          recipientNumber: v,
          userId,
          status: PendingMessageStatus.WAITING_OPT_IN,
        },
      ]),
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
  }

  async markOptInSent(pendingMessageId: string): Promise<void> {
    await this.pendingMessageRepository.update(pendingMessageId, {
      status: PendingMessageStatus.OPT_IN_SENT,
      optInSentAt: new Date(),
      optInAttempts: () => 'optInAttempts + 1',
    });
  }

  async markOptInReceived(phoneNumber: string, userId: string): Promise<PendingMessage[]> {
    const variants = this.buildPhoneVariants(phoneNumber);
    const pendingMessages = await this.pendingMessageRepository.find({
      where: variants.map(v => ({
        recipientNumber: v,
        userId,
        status: PendingMessageStatus.OPT_IN_SENT,
      })),
    });

    for (const message of pendingMessages) {
      message.status = PendingMessageStatus.PROCESSED;
      message.optInReceivedAt = new Date();
      message.processedAt = new Date();
      await this.pendingMessageRepository.save(message);
    }

    return pendingMessages;
  }

  async markAsSent(pendingMessageId: string): Promise<void> {
    await this.pendingMessageRepository.update(pendingMessageId, {
      status: PendingMessageStatus.PROCESSED,
      processedAt: new Date(),
    });
  }

  async markAsFailed(pendingMessageId: string, errorMsg?: string): Promise<void> {
    const message = await this.pendingMessageRepository.findOne({
      where: { id: pendingMessageId },
    });

    if (!message) return;

    message.status = PendingMessageStatus.FAILED;
    message.processedAt = new Date();

    const meta =
      message.metadata && typeof message.metadata === 'object'
        ? { ...message.metadata }
        : {};

    meta.lastError = errorMsg ?? 'unknown_error';
    message.metadata = meta;

    await this.pendingMessageRepository.save(message);
  }

  async expiredPendingMessages(): Promise<PendingMessage[]> {
    const now = new Date();
    const expired = await this.pendingMessageRepository.find({
      where: [
        { status: PendingMessageStatus.WAITING_OPT_IN, expiresAt: LessThan(now) },
        { status: PendingMessageStatus.OPT_IN_SENT, expiresAt: LessThan(now) },
      ],
    });

    for (const message of expired) {
      message.status = PendingMessageStatus.EXPIRED;
      await this.pendingMessageRepository.save(message);
    }

    return expired;
  }

  async getPendingMessageStats(userId: string) {
    const stats = await this.pendingMessageRepository
      .createQueryBuilder('pm')
      .select('pm.status, COUNT(*) as count')
      .where('pm.userId = :userId', { userId })
      .groupBy('pm.status')
      .getRawMany();

    return stats.reduce(
      (acc, stat) => {
        acc[stat.status] = parseInt(stat.count, 10);
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}

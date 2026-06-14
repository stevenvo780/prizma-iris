import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as admin from 'firebase-admin';
import {
  WhatsAppAccount,
} from '../accounts/entities/whatsapp-account.entity';
import {
  MessageLog,
  MessageStatus,
  MessageType,
  MessageDirection,
} from '../messages/entities/message-log.entity';
import { Customer } from '../customers/entities/customer.entity';
import { FirestoreService, ChatMessage } from '../shared/firestore.service';

export interface SendChatMessageDto {
  phoneNumber: string;
  content: string;
  type?: 'text' | 'image' | 'document' | 'audio' | 'video';
  mediaUrl?: string;
  mediaCaption?: string;
  accountId?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly baseUrl =
    process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v18.0';

  constructor(
    @InjectRepository(WhatsAppAccount)
    private readonly accountRepo: Repository<WhatsAppAccount>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepo: Repository<MessageLog>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly firestoreService: FirestoreService,
  ) {}

  /**
   * Envía un mensaje de chat vía WhatsApp Cloud API y lo guarda en Firestore + PostgreSQL.
   */
  async sendMessage(
    dto: SendChatMessageDto,
    userId: string,
  ): Promise<{ whatsappMessageId: string; firestoreId: string }> {
    // 1. Resolver cuenta WhatsApp
    const account = await this.resolveAccount(userId, dto.accountId);
    const accountId = account.id;

    // 2. Normalizar teléfono
    const phone = dto.phoneNumber.replace(/^\+/, '');

    // 3. Enviar vía WhatsApp Cloud API
    const msgType = dto.type || 'text';
    let whatsappMessageId: string;
    let payload: any;

    if (msgType === 'text') {
      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: dto.content },
      };
    } else {
      // Media message
      const mediaPayload: any = { link: dto.mediaUrl };
      if (msgType !== 'audio') {
        mediaPayload.caption = dto.mediaCaption || dto.content || '';
      }
      if (msgType === 'document') {
        mediaPayload.filename = dto.mediaCaption || 'document';
      }
      payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: msgType,
        [msgType]: mediaPayload,
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${account.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      whatsappMessageId = response.data?.messages?.[0]?.id;
      this.logger.log(`✅ Chat msg enviado a ${phone}, wamid=${whatsappMessageId}`);
    } catch (err: any) {
      const metaErr =
        err?.response?.data?.error?.message || err?.message || 'Unknown error';
      this.logger.error(`❌ Error enviando chat msg a ${phone}: ${metaErr}`);
      throw new BadRequestException(`Error enviando mensaje: ${metaErr}`);
    }

    // 4. Escribir en Firestore (real-time) — multi-tenant
    const customerName = await this.getCustomerName(phone, userId);
    const chatMsg: ChatMessage = {
      content: dto.content || '',
      direction: 'outbound',
      type: msgType,
      status: 'sent',
      timestamp: admin.firestore.Timestamp.now(),
      whatsappMessageId,
      senderName: 'Agente',
      mediaUrl: dto.mediaUrl,
      mediaCaption: dto.mediaCaption,
    };

    const firestoreId = await this.firestoreService.writeMessage(
      phone,
      chatMsg,
      userId,
      customerName,
      accountId,
    );

    // 5. Guardar en PostgreSQL (historial)
    const logEntry = this.messageLogRepo.create({
      userId,
      whatsappAccountId: account.id,
      recipientNumber: phone,
      type: msgType === 'text' ? MessageType.TEXT : MessageType.MEDIA,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.SENT,
      content: dto.content,
      whatsappMessageId,
      sentAt: new Date(),
      mediaAttachments: dto.mediaUrl
        ? [{ type: msgType, url: dto.mediaUrl, caption: dto.mediaCaption }]
        : undefined,
      metadata: { source: 'chat', firestoreId },
    });
    await this.messageLogRepo.save(logEntry);

    return { whatsappMessageId, firestoreId };
  }

  /**
   * Lista las conversaciones del usuario (desde Firestore).
   */
  async getConversations(userId: string) {
    const account = await this.resolveAccount(userId);
    return this.firestoreService.getConversations(userId, account.id);
  }

  /**
   * Obtiene mensajes de una conversación (desde Firestore).
   */
  async getMessages(phoneNumber: string, userId: string, limit = 50) {
    const account = await this.resolveAccount(userId);
    return this.firestoreService.getMessages(phoneNumber, limit, undefined, account.id);
  }

  /**
   * Marca una conversación como leída.
   */
  async markRead(phoneNumber: string, userId: string) {
    const account = await this.resolveAccount(userId);
    await this.firestoreService.markConversationRead(phoneNumber, account.id);
    return { ok: true };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private async resolveAccount(
    userId: string,
    accountId?: string,
  ): Promise<WhatsAppAccount> {
    const where: any = { userId, isActive: true };
    if (accountId) where.id = accountId;

    const account = await this.accountRepo.findOne({ where });
    if (!account) {
      throw new BadRequestException(
        'No se encontró una cuenta WhatsApp activa para este usuario.',
      );
    }
    return account;
  }

  private async getCustomerName(
    phone: string,
    userId: string,
  ): Promise<string> {
    const phoneWithPlus = phone.startsWith('+') ? phone : `+${phone}`;
    const customer = await this.customerRepo.findOne({
      where: [
        { phoneNumber: phone, userId },
        { phoneNumber: phoneWithPlus, userId },
      ],
    });
    if (customer) {
      return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || phone;
    }
    return phone;
  }
}

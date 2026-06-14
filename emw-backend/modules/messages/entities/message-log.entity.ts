import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { WhatsAppAccount } from '../../accounts/entities/whatsapp-account.entity';

export enum MessageStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
  RECEIVED = 'received',
}

export enum MessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  MEDIA = 'media',
  INTERACTIVE = 'interactive',
  LOCATION = 'location',
  CONTACT = 'contact',
}

export enum MessageDirection {
  OUTBOUND = 'outbound',
  INBOUND = 'inbound',
}

@Entity('message_logs')
@Index(['status', 'createdAt'])
@Index(['userId', 'status'])
@Index(['recipientNumber', 'createdAt'])
@Index(['whatsappAccountId', 'status'])
export class MessageLog extends BaseEntity {
  /**
   * Número del destinatario (saliente) o remitente (entrante).
   * Lo alineamos con PendingMessage: length 30.
   */
  @Column({ length: 20, nullable: true })
  recipientNumber: string;

  /**
   * Estado actual del mensaje dentro del flujo.
   * Ej: pending -> processing -> sent -> delivered/read
   */
  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  /**
   * Qué tipo de mensaje es:
   * - TEXT: mensaje plano
   * - TEMPLATE: mensaje usando plantilla aprobada
   * - MEDIA: imagen/audio/documento
   * etc.
   */
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  /**
   * Dirección del mensaje:
   * - outbound (nosotros -> cliente)
   * - inbound (cliente -> nosotros)
   */
  @Column({
    type: 'enum',
    enum: MessageDirection,
    default: MessageDirection.OUTBOUND,
  })
  direction: MessageDirection;

  /**
   * Cuerpo de texto literal (solo aplica cuando type === TEXT).
   */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /**
   * ID interno de la plantilla (uuid de Template en nuestra BD),
   * NO el "name" de la plantilla en Meta.
   *
   * Solo aplica si type === TEMPLATE.
   */
  @Column({ length: 100, nullable: true })
  templateId: string | null;

  /**
   * Parámetros usados para rellenar el body de la plantilla:
   * ["Steven","12:00 PM"]
   */
  @Column({ type: 'json', nullable: true })
  templateParams: string[] | null;

  /**
   * Adjuntos multimedia si el mensaje fue MEDIA.
   */
  @Column({ type: 'json', nullable: true })
  mediaAttachments:
    | {
      type: string;
      url: string;
      caption?: string;
      filename?: string;
    }[]
    | null;

  /**
   * ID que devuelve la API de WhatsApp (wamid.*).
   * Lo usamos para correlacionar delivery/read receipts.
   */
  @Column({ length: 100, nullable: true })
  whatsappMessageId: string | null;

  /**
   * conversationId opcional que WhatsApp envía en callbacks de estados
   * (no siempre viene, depende del pricing/conversation).
   */
  @Column({ length: 100, nullable: true })
  conversationId: string | null;

  /**
   * Estructura con el último error si falló el envío.
   * La llenamos en processMessage() si axios revienta.
   */
  @Column({ type: 'json', nullable: true })
  errorDetails:
    | {
      code: string;
      message: string;
      details?: any;
    }
    | null;

  /**
   * Cantidad de reintentos ya hechos.
   * processMessage() lo incrementa si falla y vuelve a intentar.
   */
  @Column({ default: 0 })
  retryCount: number;

  /**
   * Para priorizar ciertos mensajes en colas futuras.
   */
  @Column({ default: 0 })
  priority: number;

  /**
   * Hora programada si este mensaje no se debía mandar inmediatamente.
   */
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  /**
   * Tiempos de evento:
   * - sentAt: cuando lo mandamos a la API de WhatsApp con éxito
   * - deliveredAt: cuando WhatsApp nos dijo "delivered"
   * - readAt: cuando WhatsApp nos dijo "read"
   */
  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  /**
   * Costo reportado por Meta (si lo quieres trackear para billing).
   */
  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  cost: number | null;

  /**
   * Metadata libre para analítica/debug.
   * Recomendado jsonb en Postgres.
   * Ejemplo: { templateCategory: 'UTILITY' }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Dueño del mensaje (tenant / user owner).
   * Necesario para filtrar en dashboard y stats.
   */
  @ManyToOne(() => User, user => user.messageLogs)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  /**
   * Cuenta de WhatsApp usada para enviar.
   * La resolvemos en MessagesService.resolveWhatsAppAccount()
   * para saber token, phone_number_id, etc.
   */
  @ManyToOne(() => WhatsAppAccount)
  @JoinColumn({ name: 'whatsappAccountId' })
  whatsappAccount: WhatsAppAccount;

  @Column()
  whatsappAccountId: string;
}

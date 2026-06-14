import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { WhatsAppAccount } from './whatsapp-account.entity';

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
@Index(['user', 'status'])
@Index(['recipientNumber', 'createdAt'])
@Index(['whatsappAccount', 'status'])
export class MessageLog extends BaseEntity {
  @Column({ length: 20 })
  recipientNumber: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessageDirection,
    default: MessageDirection.OUTBOUND,
  })
  direction: MessageDirection;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ length: 100, nullable: true })
  templateId: string;

  @Column({ type: 'json', nullable: true })
  templateParams: string[];

  @Column({ type: 'json', nullable: true })
  mediaAttachments: {
    type: string;
    url: string;
    caption?: string;
    filename?: string;
  }[];

  @Column({ length: 100, nullable: true })
  whatsappMessageId: string;

  @Column({ length: 100, nullable: true })
  conversationId: string;

  @Column({ type: 'json', nullable: true })
  errorDetails: {
    code: string;
    message: string;
    details?: any;
  };

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  cost: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, user => user.messageLogs)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => WhatsAppAccount)
  @JoinColumn({ name: 'whatsappAccountId' })
  whatsappAccount: WhatsAppAccount;

  @Column()
  whatsappAccountId: string;
}

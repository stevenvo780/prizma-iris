import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { MessageType } from './message-log.entity';

export enum PendingMessageStatus {
  WAITING_OPT_IN = 'waiting_opt_in',
  OPT_IN_SENT = 'opt_in_sent',
  EXPIRED = 'expired',
  PROCESSED = 'processed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

@Entity('pending_messages')
@Index(['recipientNumber', 'userId'])
@Index(['status', 'createdAt'])
@Index(['recipientNumber', 'status', 'userId'])
export class PendingMessage extends BaseEntity {
  /**
   * Número destino (normalizado tipo +57300..., sin espacios).
   * Le subimos el length a 30 por seguridad internacional.
   */
  @Column({ length: 20, nullable: true })
  recipientNumber: string;

  /**
   * Estado del mensaje en la cola.
   */
  @Column({
    type: 'enum',
    enum: PendingMessageStatus,
    default: PendingMessageStatus.WAITING_OPT_IN,
  })
  status: PendingMessageStatus;

  /**
   * Tipo del mensaje que QUERÍAMOS mandar:
   * - TEXT
   * - TEMPLATE
   * - MEDIA
   */
  @Column({
    type: 'enum',
    enum: MessageType,
  })
  type: MessageType;

  /**
   * Texto libre (solo si type === TEXT).
   * Ej: "Hola {{firstName}}, recuerda tu cita..."
   */
  @Column({ type: 'text', nullable: true })
  content: string | null;

  /**
   * ID INTERNO de la plantilla aprobada en nuestra DB (uuid de Template),
   * NO el "name" público de WhatsApp.
   *
   * Nota: lo dejamos como string nullable.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  templateId: string | null;

  /**
   * Parámetros posicionales para la plantilla:
   * ["Steven", "12:00 PM"]
   *
   * Esto luego va a payload.template.components[0].parameters[*]
   */
  @Column({ type: 'json', nullable: true })
  templateParams: string[] | null;

  /**
   * Adjuntos multimedia si el mensaje original era MEDIA.
   * Guardamos como JSON arbitrario (array de objetos con type/url/etc).
   */
  @Column({ type: 'json', nullable: true })
  mediaAttachments: Array<{
    type: string;
    url: string;
    caption?: string;
    filename?: string;
  }> | null;

  /**
   * Si este mensaje estaba programado para futuro.
   * (todavía soportamos esto aunque estemos enviando "al vuelo")
   */
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  /**
   * Prioridad relativa. Más alto = se envía primero.
   */
  @Column({ type: 'int', default: 0 })
  priority: number;

  /**
   * Cuándo le mandamos la PLANTILLA pidiéndole permiso (opt-in).
   */
  @Column({ type: 'timestamp', nullable: true })
  optInSentAt: Date | null;

  /**
   * Cuándo el usuario contestó "sí" o presionó el botón Aceptar.
   */
  @Column({ type: 'timestamp', nullable: true })
  optInReceivedAt: Date | null;

  /**
   * Cuándo efectivamente drenamos este pending y creamos su MessageLog real.
   */
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;

  /**
   * TTL de este pending. Después de esta fecha pasa a EXPIRED.
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  /**
   * Cuántas veces hemos intentado mandar el mensaje de opt-in.
   */
  @Column({ type: 'int', default: 0 })
  optInAttempts: number;

  /**
   * Metadata técnica/debug.
   *
   * IMPORTANTE: usamos jsonB porque en PendingMessagesService.markAsFailed()
   * hacemos un update con jsonb_set(...) para guardar el último error.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Usuario dueño de esta cola.
   * Esto es clave porque cuando drenamos la cola para enviar el mensaje real
   * necesitamos saber qué cuenta de WhatsApp (accessToken, phoneNumberId) usar.
   */
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  /**
   * Relación opcional al Customer.
   * Nos sirve para enrich (nombre, tags, etc).
   */
  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer | null;

  @Column({ nullable: true })
  customerId: string | null;
}

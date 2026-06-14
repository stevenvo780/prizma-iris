import { BaseEntity } from '../../shared/entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  IN_PROCESS = 'in_process',
}

export enum PaymentProvider {
  MERCADOPAGO = 'mercadopago',
}

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  preferenceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mpPaymentId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  merchantOrderId: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.MERCADOPAGO,
  })
  provider: PaymentProvider;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'COP' })
  currency: string;

  @Column({ type: 'varchar', length: 100 })
  planType: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  planPeriodicity: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalReference: string;

  @Column({ type: 'json', nullable: true })
  mpResponse: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payerEmail: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;
}

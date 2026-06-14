import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum AccountStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

export enum AccountType {
  SANDBOX = 'sandbox',
  PRODUCTION = 'production',
}

@Entity('whatsapp_accounts')
@Index(['user', 'status'])
export class WhatsAppAccount extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 30, unique: true })
  phoneNumber: string;

  @Column({ length: 50, unique: true })
  phoneNumberId: string;

  @Column({ length: 50 })
  businessAccountId: string;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.PENDING,
  })
  status: AccountStatus;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.SANDBOX,
  })
  type: AccountType;

  @Column({ type: 'json', nullable: true })
  webhookConfig: {
    url: string;
    verifyToken: string;
    fields: string[];
  };

  @Column({ type: 'json', nullable: true })
  limits: {
    messaging: number;
    conversations: number;
  };

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, user => user.whatsappAccounts)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;
}

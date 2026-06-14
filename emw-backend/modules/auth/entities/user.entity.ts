import { WhatsAppAccount } from '../../accounts/entities/whatsapp-account.entity';
import { CustomerTag } from '../../customer-tags/entities/customer-tag.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { MessageLog } from '../../messages/entities/message-log.entity';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Template } from '../../templates/entities/template.entity';
import { Column, Entity, OneToMany } from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  PREMIUM = 'premium',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  credits: number;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  subscriptionPlanType: string;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionCancelledAt: Date;

  @OneToMany(() => MessageLog, messageLog => messageLog.user)
  messageLogs: MessageLog[];

  @OneToMany(() => WhatsAppAccount, account => account.user)
  whatsappAccounts: WhatsAppAccount[];

  @OneToMany(() => Customer, customer => customer.user)
  customers: Customer[];

  @OneToMany(() => Template, template => template.user)
  templates: Template[];

  @OneToMany(() => CustomerTag, tag => tag.user)
  customerTags: CustomerTag[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

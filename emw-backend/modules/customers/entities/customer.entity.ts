import { Entity, Column, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Expose } from 'class-transformer';
import { BaseEntity } from '../../shared/entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { CustomerTagAssignment } from '../../customer-tags/entities/customer-tag-assignment.entity';

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  OPTED_OUT = 'opted_out',
}

@Entity('customers')
@Index(['user', 'status'])
export class Customer extends BaseEntity {
  @Column({ length: 100, nullable: true, default: '' })
  firstName: string;

  @Column({ length: 100, nullable: true, default: '' })
  lastName: string;

  @Column({ length: 20, unique: true })
  phoneNumber: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.ACTIVE,
  })
  status: CustomerStatus;

  @Column({ type: 'json', nullable: true })
  customFields: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  lastContactAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  optInAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  optOutAt: Date;

  @Column({ length: 10, nullable: true })
  language: string;

  @Column({ length: 10, nullable: true })
  timezone: string;

  @Column({ type: 'json', nullable: true })
  preferences: {
    marketing: boolean;
    notifications: boolean;
    frequency: string;
  };

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, user => user.customers)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => CustomerTagAssignment, assignment => assignment.customer)
  tagAssignments: CustomerTagAssignment[];

  get fullName(): string {
    return `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim();
  }

  get isOptedIn(): boolean {
    return this.status === CustomerStatus.ACTIVE && this.optInAt !== null;
  }

  @Expose()
  get tags(): string[] {
    if (!this.tagAssignments) {
      return [];
    }
    return this.tagAssignments
      .filter(assignment => assignment.tag && assignment.tag.isActive)
      .map(assignment => assignment.tag.name);
  }

  get hasOpenWindow24h(): boolean {
    if (!this.optInAt) return false;
    const ms = Date.now() - new Date(this.optInAt).getTime();
    return ms <= 24 * 60 * 60 * 1000 && this.status === CustomerStatus.ACTIVE && !this.optOutAt;
  }
}

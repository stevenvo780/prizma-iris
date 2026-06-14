import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';
import { CustomerTag } from './customer-tag.entity';

@Entity('customer_tag_assignments')
@Unique(['customerId', 'tagId'])
@Index(['customerId'])
@Index(['tagId'])
export class CustomerTagAssignment extends BaseEntity {
  @ManyToOne(() => Customer, customer => customer.tagAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column()
  customerId: string;

  @ManyToOne(() => CustomerTag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag: CustomerTag;

  @Column()
  tagId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ length: 255, nullable: true })
  assignedBy: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;
}

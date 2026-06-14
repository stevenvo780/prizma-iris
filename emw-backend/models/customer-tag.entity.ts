import { Entity, Column, ManyToOne, JoinColumn, Unique, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { CustomerTagAssignment } from './customer-tag-assignment.entity';

@Entity('customer_tags')
@Unique(['name', 'userId'])
@Index(['userId'])
@Index(['name'])
export class CustomerTag extends BaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ length: 7, default: '#007bff' })
  color: string;

  @Column({ default: 0 })
  customerCount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, user => user.customerTags)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => CustomerTagAssignment, assignment => assignment.tag)
  assignments: CustomerTagAssignment[];
}

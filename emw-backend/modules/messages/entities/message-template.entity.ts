import { TemplateStatus } from '@/templates/entities/template.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  mediaAttachments?: {
    type: string;
    url: string;
    caption?: string;
  }[];

  @Column({ nullable: true })
  mediaType?: string;

  @Column({ nullable: true })
  messageType?: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  order?: number;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

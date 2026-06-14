 import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
 import { BaseEntity } from '../../shared/entities/base.entity';
 import { User } from '../../auth/entities/user.entity';

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
 @Index(['businessAccountId'])
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

   /**
    * App Secret de la aplicación de Meta.
    * Se usa para validar las firmas de los webhooks (x-hub-signature-256).
    * Guardado encriptado en la base de datos.
    */
   @Column({ type: 'text', nullable: true })
   appSecret: string | null;

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

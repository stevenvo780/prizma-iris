export enum PaymentPeriodicity {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
}

export interface Customer {
  id?: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  status?: 'active' | 'inactive' | 'blocked' | 'opted_out';
  customFields?: Record<string, any>;
  notes?: string;
  lastContactAt?: Date;
  optInAt?: Date;
  optOutAt?: Date;
  language?: string;
  timezone?: string;
  preferences?: {
    marketing: boolean;
    notifications: boolean;
    frequency: string;
  };
  metadata?: Record<string, any>;
  tagAssignments: TagAssignment[];
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TagAssignment {
  customerId: number;
  tagId: number;
  tag: Tag;
  assignedAt: Date;
  assignedBy?: string;
  metadata?: Record<string, any>;
}

export interface Tag {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  name: string;
  description?: string;
  color: string;
  customerCount: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}
export interface WppMS {
  id?: string;
  content: string;
  mediaAttachments: string | null;
  message?: string;
  mediaType?: string | null;
  messageType?: string;
  active: boolean;
  order?: number;
  labels?: string[];
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  messageParameters?: string | null;
}

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

export interface MessageLog {
  id: string;
  recipientNumber: string;
  status: MessageStatus;
  type: MessageType;
  direction: MessageDirection;
  content?: string;
  templateId?: string;
  templateParams?: string[];
  mediaAttachments?: {
    type: string;
    url: string;
    caption?: string;
    filename?: string;
  }[];
  whatsappMessageId?: string;
  conversationId?: string;
  errorDetails?: {
    code: string;
    message: string;
    details?: any;
  };
  retryCount: number;
  priority: number;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  cost?: number;
  metadata?: Record<string, any>;
  userId: string;
  whatsappAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Templates {
  id?: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: 'es' | 'en' | 'pt';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'disabled';
  body: string;
  header?: {
    type: 'TEXT' | 'MEDIA';
    text?: string;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  };
  footer?: {
    text: string;
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
  parameters?: Array<{
    name: string;
    type: 'TEXT' | 'CURRENCY' | 'DATE_TIME';
    example: string;
  }>;
  whatsappTemplateId?: string;
  rejectionReason?: {
    code: string;
    message: string;
    details?: string;
  };
  submittedAt?: Date;
  approvedAt?: Date;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WhatsAppSession {
  isConnected: boolean;
  isValid: boolean;
  qrUrl: string;
  timestamp: number;
}

export enum UserRoleOptions {
  USER = 'user',
  PREMIUM = 'premium',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: UserRoleOptions;
  confirmEmail: boolean;
  robotStatus: RobotStatus;
}

export interface RobotStatus {
  id: number;
  isEnabled: boolean;
  user: User;
}

export interface AutoReplyConfig {
  enabled: boolean;
  message: string;
}

export interface RobotMetrics {
  isEnabled: boolean;
  failureRate: number;
  messagesPerMinute: number;
  messagesInPeriod: number;
  messagesPerHour: { hour: string; count: number }[];
  failedMessages: { hour: string; count: number }[];
}

export interface Action {
  type: string;
  payload?: any;
}

export interface CreditCard {
  number: string;
  securityCode: string;
  expirationDate: string;
  name: string;
}

export interface PaymentDetails {
  tokenId: string;
  tokenValid: string;
  periodicity: PaymentPeriodicity;
}

export interface ValidationResponse {
  status: string;
  transactionId: string;
  message: string;
}

export interface Plans {
  id: string;
  label: string;
  price: string;
  orders: string;
  sm: string;
}

export interface MessageLog {
  id: string;
  recipientNumber: string;
  sent: boolean;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface MessageLogsResponse {
  data: MessageLog[];
  total: number;
  limit: number;
  offset: number;
}

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppAccount, AccountStatus } from '../accounts/entities/whatsapp-account.entity';
import { MessageLog, MessageStatus, MessageType } from '../messages/entities/message-log.entity';
import { Template } from '../templates/entities/template.entity';
import axios from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TemplatesService } from '../templates/templates.service';
import { MessagesService } from '../messages/messages.service';

export enum JobType {
  MESSAGE_SEND = 'message_send',
  TEMPLATE_APPROVAL = 'template_approval',
  TEMPLATE_RETRY = 'template_retry',
  BULK_MESSAGE = 'bulk_message',
  MESSAGE_RETRY = 'message_retry',
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

export interface Job {
  id: string;
  type: JobType;
  data: any;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  error?: string;
  userId: string;
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalJobs: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private jobs = new Map<string, Job>();
  private processingJobs = new Set<string>();
  private readonly mode: 'queue' | 'simple' =
    (process.env.QUEUE_MODE as 'queue' | 'simple') || 'queue';

  constructor(
    @InjectRepository(WhatsAppAccount)
    private readonly whatsappAccountRepository: Repository<WhatsAppAccount>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    private readonly templatesService: TemplatesService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  async addJob(
    type: JobType,
    data: any,
    options: {
      priority?: number;
      scheduledAt?: Date;
      maxAttempts?: number;
      userId: string;
    },
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: Job = {
      id: jobId,
      type,
      data,
      status: JobStatus.PENDING,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
      scheduledAt: options.scheduledAt,
      userId: options.userId,
    };

    if (this.mode === 'simple' && !options.scheduledAt) {
      this.logger.log(`Direct mode enabled (QUEUE_MODE=simple). Processing job immediately: ${jobId}`);

      await this.processJob(job);
      return jobId;
    }

    this.jobs.set(jobId, job);
    this.logger.log(`Job ${jobId} added to queue: ${type}`);

    if (!options.scheduledAt) {
      setImmediate(() => this.processNextJob());
    }

    return jobId;
  }

  async processJob(job: Job): Promise<void> {
    if (this.processingJobs.has(job.id)) {
      return;
    }

    this.processingJobs.add(job.id);
    job.status = JobStatus.PROCESSING;
    job.processedAt = new Date();
    job.attempts++;

    this.logger.log(`Processing job ${job.id}: ${job.type}`);

    try {
      switch (job.type) {
        case JobType.MESSAGE_SEND:
          await this.processMessageSend(job);
          break;
        case JobType.TEMPLATE_APPROVAL:
          await this.processTemplateApproval(job);
          break;
        case JobType.TEMPLATE_RETRY:
          await this.processTemplateRetry(job);
          break;
        case JobType.BULK_MESSAGE:
          await this.processBulkMessage(job);
          break;
        case JobType.MESSAGE_RETRY:
          await this.processMessageRetry(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = JobStatus.COMPLETED;
      job.completedAt = new Date();
      this.logger.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`);
      job.error = (error as Error).message || 'Unknown error';

      if (job.attempts >= job.maxAttempts) {
        job.status = JobStatus.FAILED;
        this.logger.error(`Job ${job.id} failed permanently after ${job.attempts} attempts`);
      } else {
        job.status = JobStatus.RETRYING;

        const delay = Math.pow(2, job.attempts) * 1000;
        setTimeout(() => this.processJob(job), delay);
        this.logger.log(`Job ${job.id} will retry in ${delay}ms`);
      }
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  private async processMessageSend(job: Job): Promise<void> {
    this.logger.log(`Processing message send job: ${job.id}`);

    try {
      const { recipientNumber, content, type, templateId, templateParams, userId } = job.data;

      const sendDto = {
        recipientNumber,
        content,
        type,
        templateId,
        templateParams,
      };

      await this.sendMessageDirect(job);
    } catch (error) {
      this.logger.error(`Failed to process message send job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async sendMessageDirect(job: Job): Promise<void> {
    const { messageLogId, userId } = job.data;

    try {
      const messageLog = await this.messageLogRepository.findOne({
        where: { id: messageLogId, userId },
      });

      if (!messageLog) {
        throw new Error(`MessageLog not found: ${messageLogId}`);
      }

      const whatsappAccount = await this.whatsappAccountRepository.findOne({
        where: { userId, isActive: true, status: AccountStatus.ACTIVE },
      });

      if (!whatsappAccount) {
        throw new Error('No active WhatsApp account found');
      }

      const response = await this.sendWhatsAppMessage(messageLog, whatsappAccount);

      if (response.success) {
        await this.messageLogRepository.update(messageLog.id, {
          status: MessageStatus.SENT,
          whatsappMessageId: response.whatsappMessageId,
          sentAt: new Date(),
        });

        this.logger.log('✅ Message sent successfully via WhatsApp API!');
        this.logger.log(`📱 Message ID: ${response.whatsappMessageId}`);
        this.logger.log(`📋 MessageLog ID: ${messageLog.id}`);
      } else {
        await this.messageLogRepository.update(messageLog.id, {
          status: MessageStatus.FAILED,
          errorDetails: {
            code: 'WHATSAPP_API_ERROR',
            message: response.error || 'Unknown error',
          } as any,
        });

        throw new Error(`WhatsApp API error: ${response.error}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send message directly: ${error instanceof Error ? error.message : String(error)}`);

      if (job.data.messageLogId) {
        await this.messageLogRepository.update(job.data.messageLogId, {
          status: MessageStatus.FAILED,
          errorDetails: {
            code: 'PROCESSING_ERROR',
            message: error instanceof Error ? error.message : String(error),
          } as any,
        });
      }

      throw error;
    }
  }

  private async sendWhatsAppMessage(
    messageLog: MessageLog,
    whatsappAccount: WhatsAppAccount,
  ): Promise<{
    success: boolean;
    whatsappMessageId?: string;
    error?: string;
  }> {
    try {
      const baseUrl = process.env.WHATSAPP_API_BASE_URL;
      const url = `${baseUrl}/${whatsappAccount.phoneNumberId}/messages`;

      let payload: any;

      if (messageLog.type === MessageType.TEMPLATE) {
        const template = await this.templateRepository.findOne({
          where: { id: messageLog.templateId },
        });

        if (!template) {
          throw new Error(`Template not found: ${messageLog.templateId}`);
        }

        const templatePayload: any = {
          name: template.whatsappTemplateId,
          language: { code: template.language },
        };

        if (messageLog.templateParams && messageLog.templateParams.length > 0) {
          templatePayload.components = [
            {
              type: 'body',
              parameters: messageLog.templateParams.map(param => ({
                type: 'text',
                text: param,
              })),
            },
          ];
        }

        payload = {
          messaging_product: 'whatsapp',
          to: messageLog.recipientNumber,
          type: 'template',
          template: templatePayload,
        };

        const templateName = template.whatsappTemplateId || template.name || 'UNKNOWN';
        this.logger.log(`🚀 Sending template "${templateName}" to ${messageLog.recipientNumber}`);
      } else {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: messageLog.recipientNumber,
          type: 'text',
          text: {
            body: messageLog.content,
          },
        };

        this.logger.log(`🚀 Sending WhatsApp message to ${messageLog.recipientNumber}`);
        this.logger.log(`📝 Message content: ${messageLog.content}`);
      }

      this.logger.log(`📞 Using WhatsApp Phone Number ID: ${whatsappAccount.phoneNumberId}`);

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${whatsappAccount.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if ((response as any).data && (response as any).data.messages && (response as any).data.messages[0]) {
        const whatsappMessageId = (response as any).data.messages[0].id;
        this.logger.log('✅ WhatsApp API Response: Message sent successfully!');
        this.logger.log(`📱 WhatsApp Message ID: ${whatsappMessageId}`);

        return {
          success: true,
          whatsappMessageId: whatsappMessageId,
        };
      } else {
        this.logger.error('❌ Invalid WhatsApp API response: ' + JSON.stringify((response as any).data));
        return {
          success: false,
          error: 'Invalid WhatsApp API response',
        };
      }
    } catch (error: any) {
      this.logger.error('❌ WhatsApp API Error: ' + (error.response ? JSON.stringify(error.response.data) : error.message));

      let errorMessage = 'Unknown WhatsApp API error';
      if (axios.isAxiosError(error)) {
        if (error.response) {
          this.logger.error(`📋 Response status: ${error.response.status}`);
          this.logger.error('📋 Response data: ' + JSON.stringify(error.response.data));
          errorMessage = `WhatsApp API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
          errorMessage = 'WhatsApp API request failed';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private async simulateMessageSend(job: Job): Promise<void> {
    const { messageLogId, userId } = job.data;

    this.logger.log(
      `📨 Simulating message send for messageLogId: ${messageLogId}, userId: ${userId}`,
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    this.logger.log('🚀 SIMULATED MESSAGE SENT SUCCESSFULLY!');
    this.logger.log(`� Message Log ID: ${messageLogId}`);
    this.logger.log(`� User ID: ${userId}`);
    this.logger.log('✅ Message would be delivered to WhatsApp in production mode');
    this.logger.log(
      '🔧 In development mode, message simulation completed without real WhatsApp API call',
    );
  }

  private async processTemplateApproval(job: Job): Promise<void> {
    this.logger.log(`Processing template approval job: ${job.id}`);

    try {
      const { templateId, userId } = job.data;

      await this.templatesService.submitForApproval(templateId, userId);
      this.logger.log(`Template submitted for approval successfully for job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process template approval job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async processTemplateRetry(job: Job): Promise<void> {
    this.logger.log(`Processing template retry job: ${job.id}`);

    try {
      const { templateId, userId, reason } = job.data;

      await this.templatesService.resubmitForApproval(templateId, userId, reason);
      this.logger.log(`Template resubmitted for approval successfully for job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process template retry job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async processBulkMessage(job: Job): Promise<void> {
    this.logger.log(`Processing bulk message job: ${job.id}`);

    try {
      const { sendMessageDto, userId } = job.data;

      await this.messagesService.bulkSend(sendMessageDto, userId);
      this.logger.log(`Bulk messages sent successfully for job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process bulk message job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async processMessageRetry(job: Job): Promise<void> {
    this.logger.log(`Processing message retry job: ${job.id}`);

    try {
      const { messageId, userId, retryReason } = job.data;

      const originalMessage = await this.messagesService.getMessageById(messageId, userId);
      if (originalMessage) {
        const retryDto = {
          recipientNumber: originalMessage.recipientNumber,
          content: originalMessage.content,
          type: originalMessage.type,
          templateId: originalMessage.templateId,
        } as any;

        await this.messagesService.sendMessage(retryDto, userId);
        this.logger.log(`Message retry sent successfully for job: ${job.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process message retry job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async retryFailedJobs(): Promise<void> {
    const failedJobs = Array.from(this.jobs.values()).filter(
      job => job.status === JobStatus.FAILED && job.attempts < job.maxAttempts,
    );

    this.logger.log(`Retrying ${failedJobs.length} failed jobs`);

    for (const job of failedJobs) {
      job.status = JobStatus.PENDING;
      await this.processJob(job);
    }
  }

  async getQueueStatus(): Promise<QueueStatus> {
    const jobs = Array.from(this.jobs.values());

    return {
      pending: jobs.filter(j => j.status === JobStatus.PENDING).length,
      processing: jobs.filter(j => j.status === JobStatus.PROCESSING).length,
      completed: jobs.filter(j => j.status === JobStatus.COMPLETED).length,
      failed: jobs.filter(j => j.status === JobStatus.FAILED).length,
      totalJobs: jobs.length,
    };
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) || null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === JobStatus.PROCESSING) {
      return false;
    }

    job.status = JobStatus.CANCELLED;
    this.logger.log(`Job ${jobId} cancelled`);
    return true;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  private async processScheduledJobs(): Promise<void> {
    const now = new Date();
    const scheduledJobs = Array.from(this.jobs.values())
      .filter(job => job.status === JobStatus.PENDING && job.scheduledAt && job.scheduledAt <= now)
      .sort((a, b) => b.priority - a.priority);

    for (const job of scheduledJobs) {
      await this.processJob(job);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  private async processNextJob(): Promise<void> {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(
        job =>
          job.status === JobStatus.PENDING && (!job.scheduledAt || job.scheduledAt <= new Date()),
      )
      .sort((a, b) => b.priority - a.priority);

    if (pendingJobs.length > 0) {
      await this.processJob(pendingJobs[0]);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async cleanupOldJobs(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < oneDayAgo) {
        this.jobs.delete(jobId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.log(`Cleaned up ${removedCount} old completed jobs`);
    }
  }
}

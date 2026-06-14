import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageLog, MessageStatus } from '../messages/entities/message-log.entity';
import { Customer, CustomerStatus } from '../customers/entities/customer.entity';
import { Template, TemplateStatus } from '../templates/entities/template.entity';

@Injectable()
export class MetricsService {
  constructor(
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async getPerformanceMetrics(userId: string) {
    const [
      totalMessages,
      sentMessages,
      failedMessages,
      totalCustomers,
      activeCustomers,
      totalTemplates,
      approvedTemplates,
    ] = await Promise.all([
      this.messageLogRepository.count({ where: { userId } }),
      this.messageLogRepository.count({ where: { userId, status: MessageStatus.SENT } }),
      this.messageLogRepository.count({ where: { userId, status: MessageStatus.FAILED } }),
      this.customerRepository.count({ where: { userId } }),
      this.customerRepository.count({ where: { userId, status: CustomerStatus.ACTIVE } }),
      this.templateRepository.count({ where: { userId } }),
      this.templateRepository.count({ where: { userId, status: TemplateStatus.APPROVED } }),
    ]);

    const deliveryRate = totalMessages > 0 ? (sentMessages / totalMessages) * 100 : 0;
    const failureRate = totalMessages > 0 ? (failedMessages / totalMessages) * 100 : 0;

    return {
      messages: {
        total: totalMessages,
        sent: sentMessages,
        failed: failedMessages,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
      },
      templates: {
        total: totalTemplates,
        approved: approvedTemplates,
      },
    };
  }

  async getMessageMetrics(userId: string, period = '7d') {
    const periodDays = period === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const messages = await this.messageLogRepository
      .createQueryBuilder('message')
      .select([
        "DATE(message.createdAt) as date",
        'COUNT(*) as total',
        "SUM(CASE WHEN message.status = 'sent' THEN 1 ELSE 0 END) as sent",
        "SUM(CASE WHEN message.status = 'failed' THEN 1 ELSE 0 END) as failed",
      ])
      .where('message.userId = :userId', { userId })
      .andWhere('message.createdAt >= :startDate', { startDate })
      .groupBy('DATE(message.createdAt)')
      .orderBy('date', 'DESC')
      .getRawMany();

    return messages;
  }
}

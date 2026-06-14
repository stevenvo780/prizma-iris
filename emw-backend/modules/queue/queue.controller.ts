import { Controller, Get, Post, Param, Body, Delete, UseGuards, Request } from '@nestjs/common';
import { QueueService, JobType, QueueStatus, Job } from './queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AddJobDto {
  type: JobType;
  data: any;
  priority?: number;
  scheduledAt?: string;
  maxAttempts?: number;
}

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('jobs')
  async addJob(@Body() addJobDto: AddJobDto, @Request() req): Promise<{ jobId: string }> {
    const options = {
      priority: addJobDto.priority,
      scheduledAt: addJobDto.scheduledAt ? new Date(addJobDto.scheduledAt) : undefined,
      maxAttempts: addJobDto.maxAttempts,
      userId: req.user.id,
    };

    const jobId = await this.queueService.addJob(addJobDto.type, addJobDto.data, options);

    return { jobId };
  }

  @Get('status')
  async getQueueStatus(): Promise<QueueStatus> {
    return this.queueService.getQueueStatus();
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string): Promise<Job | null> {
    return this.queueService.getJob(jobId);
  }

  @Delete('jobs/:jobId')
  async cancelJob(@Param('jobId') jobId: string): Promise<{ success: boolean }> {
    const success = await this.queueService.cancelJob(jobId);
    return { success };
  }

  @Post('retry-failed')
  async retryFailedJobs(): Promise<{ message: string }> {
    await this.queueService.retryFailedJobs();
    return { message: 'Failed jobs retry initiated' };
  }
}

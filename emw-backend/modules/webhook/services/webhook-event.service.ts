import { Injectable } from '@nestjs/common';

@Injectable()
export class WebhookEventService {
  async processEvent(event: any): Promise<any> {
    return { success: true };
  }

  async validateEvent(event: any): Promise<boolean> {
    return true;
  }
}

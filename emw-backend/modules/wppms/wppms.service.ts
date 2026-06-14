import { Injectable } from '@nestjs/common';

@Injectable()
export class WppmsService {
  async getStatus() {
    return {
      status: 'running',
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connections: {
        whatsapp: 'connected',
        webhook: 'active',
      },
      lastActivity: new Date().toISOString(),
    };
  }

  async stop() {
    return {
      message: 'WhatsApp MS stop signal sent',
      status: 'stopping',
      timestamp: new Date().toISOString(),
    };
  }

  async getLogs(limit: number = 100) {
    const logs = [];
    for (let i = 0; i < Math.min(limit, 20); i++) {
      logs.push({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        level: Math.random() > 0.8 ? 'error' : Math.random() > 0.5 ? 'warn' : 'info',
        message: `Log entry ${i + 1}`,
        module: 'whatsapp-ms',
      });
    }
    return logs;
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

export interface AutoReplyConfig {
  enabled: boolean;
  message: string;
}

@Injectable()
export class RobotService {
  private readonly logger = new Logger(RobotService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Obtiene la configuración de auto-respuesta del usuario.
   */
  async getAutoReplyConfig(userId: string): Promise<AutoReplyConfig> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const config = user.settings?.autoReply;
    return {
      enabled: config?.enabled ?? false,
      message: config?.message ?? '',
    };
  }

  /**
   * Actualiza la configuración de auto-respuesta del usuario.
   */
  async updateAutoReplyConfig(userId: string, config: AutoReplyConfig): Promise<AutoReplyConfig> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const settings = user.settings || {};
    settings.autoReply = {
      enabled: !!config.enabled,
      message: (config.message || '').trim(),
    };

    await this.userRepository.update(userId, { settings });

    this.logger.log(
      `🤖 Auto-reply ${config.enabled ? 'ACTIVADO' : 'DESACTIVADO'} para user=${userId} msg="${config.message?.substring(0, 50)}"`,
    );

    return settings.autoReply;
  }
}

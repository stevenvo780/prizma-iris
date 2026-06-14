import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Template,
  TemplateStatus,
  TemplateCategory,
  TemplateLanguage,
} from './entities/template.entity';
import { WhatsAppService } from '../messages/services/whatsapp.service';
import { CreateTemplateDto } from './dto/create-template.dto';

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  status?: TemplateStatus;
  whatsappTemplateId?: string;
  rejectionReason?: {
    code: string;
    message: string;
    details?: string;
  };
}

function normalizeTemplateName(name: string) {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  constructor(
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @Inject(forwardRef(() => WhatsAppService))
    private whatsappService: WhatsAppService,
  ) { }

  async create(createTemplateDto: CreateTemplateDto, userId: string): Promise<Template> {
    this.logger.log(`Creating template "${createTemplateDto.name}" for user ${userId}`);

    const normalizedName = normalizeTemplateName(createTemplateDto.name);
    const language = createTemplateDto.language;

    const existingTemplate = await this.templateRepository.findOne({
      where: { name: normalizedName, language, userId },// 👈 incluir language
    });
    if (existingTemplate) {

      return existingTemplate;
    }

    // Desactivar todos los demás templates del usuario antes de crear uno nuevo activo
    await this.templateRepository.update(
      { userId, active: true },
      { active: false }
    );

    const template = this.templateRepository.create({
      name: normalizedName,
      category: createTemplateDto.category,
      language: language,
      status: TemplateStatus.DRAFT,
      body: createTemplateDto.body,
      parameters: (createTemplateDto.parameters ?? []).map(parameter => ({
        name: parameter,
        type: 'TEXT' as 'TEXT',
        example: 'Example',
      })),
      userId: userId,
      active: true,
    }) as Template;

    const saved = await this.templateRepository.save(template);
    this.logger.log(`📋 Template "${normalizedName}" guardado como DRAFT (id=${saved.id})`);

    return saved;
  }
  async findOneApproved(userId: string): Promise<Template> {

    return this.templateRepository.findOneOrFail({
      where: { userId, status: TemplateStatus.APPROVED },
    });
  }

  async findAll(userId: string, status?: TemplateStatus): Promise<Template[]> {
    const query = this.templateRepository
      .createQueryBuilder('template')
      .where('template.userId = :userId', { userId })
      .orderBy('template.createdAt', 'DESC');

    if (status) {
      query.andWhere('template.status = :status', { status });
    }

    return query.getMany();
  }

  async findOne(id: string, userId: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id, userId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
 * Busca una plantilla por nombre (name normalizado) + userId.
 * Opcionalmente también filtra por language.
 *
 * Ej:
 *   await templatesService.findByName('opt-in-request', userId, TemplateLanguage.ES)
 *
 * Devuelve:
 *   - Template si existe
 *   - null si no existe
 */
  async findByName(
    rawName: string,
    userId: string,
    language?: TemplateLanguage,
  ): Promise<Template | null> {

    const normalizedName = normalizeTemplateName(rawName);

    const where: any = {
      name: normalizedName,
      userId,
    };

    if (language) {
      where.language = language;
    }

    const tpl = await this.templateRepository.findOne({ where });
    return tpl ?? null;
  }

  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    userId: string,
  ): Promise<Template> {
    const template = await this.findOne(id, userId);

    if (template.status === TemplateStatus.APPROVED) {
      const allowedFields = ['metadata', 'active'];
      const invalid = Object.keys(updateTemplateDto).filter(f => !allowedFields.includes(f));
      if (invalid.length > 0) {
        throw new BadRequestException('Cannot modify approved template content');
      }
    }

    if (updateTemplateDto.name) {
      updateTemplateDto.name = normalizeTemplateName(updateTemplateDto.name);
    }

    if (updateTemplateDto.name || updateTemplateDto.language) {
      const nextName = updateTemplateDto.name ?? template.name;
      const nextLang = updateTemplateDto.language ?? template.language;
      const duplicate = await this.templateRepository.findOne({
        where: { name: nextName, language: nextLang, userId },
      });
      if (duplicate && duplicate.id !== template.id) {
        throw new BadRequestException(
          'Another template with same name and language already exists',
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateTemplateDto, 'active')) {
      if (updateTemplateDto.active === false) {
        updateTemplateDto.status = TemplateStatus.DISABLED;
      } else if (updateTemplateDto.active === true) {
        // Desactivar todos los demás templates del usuario antes de activar este
        await this.templateRepository.update(
          { userId, active: true },
          { active: false }
        );

        if (template.status === TemplateStatus.DISABLED) {
          updateTemplateDto.status = template.approvedAt
            ? TemplateStatus.APPROVED
            : TemplateStatus.DRAFT;
        }
      }
    }

    Object.assign(template, updateTemplateDto);

    if (updateTemplateDto.status === TemplateStatus.PENDING) template.submittedAt = new Date();
    else if (updateTemplateDto.status === TemplateStatus.APPROVED) template.approvedAt = new Date();
    else if (updateTemplateDto.status === TemplateStatus.REJECTED) template.rejectedAt = new Date();

    return this.templateRepository.save(template);
  }

  async remove(id: string, userId: string): Promise<void> {
    const template = await this.findOne(id, userId);

    if (template.status === TemplateStatus.APPROVED && template.usageCount > 0) {
      throw new BadRequestException('Cannot delete template that has been used');
    }

    await this.templateRepository.remove(template);
  }

  async incrementUsage(id: string): Promise<void> {
    await this.templateRepository.increment({ id }, 'usageCount', 1);
  }

  async getApprovedTemplates(userId: string): Promise<Template[]> {
    return this.templateRepository.find({
      where: {
        userId,
        status: TemplateStatus.APPROVED,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async submitForApproval(id: string, userId: string): Promise<Template> {
    const template = await this.findOne(id, userId);

    if (template.status !== TemplateStatus.DRAFT && template.status !== TemplateStatus.REJECTED) {
      throw new BadRequestException(
        `Solo templates en borrador o rechazados pueden enviarse. Estado actual: ${template.status}`,
      );
    }

    this.logger.log(`📤 Enviando template "${template.name}" a WhatsApp Business API...`);

    try {
      await this.whatsappService.registerNewTemplate(template, userId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error al registrar template en WhatsApp: ${msg}`);
      // Si ya es BadRequestException con mensaje claro, re-lanzar directamente
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al enviar a WhatsApp: ${msg}`);
    }

    // registerNewTemplate ya actualiza template.status, submittedAt, whatsappTemplateId
    const saved = await this.templateRepository.save(template);
    this.logger.log(
      `✅ Template "${template.name}" enviado a Meta. Estado: ${saved.status} (esperando aprobación por webhook)`,
    );

    return saved;
  }

  async approveTemplate(id: string, whatsappTemplateId: string, userId: string): Promise<Template> {
    const template = await this.update(
      id,
      {
        status: TemplateStatus.APPROVED,
        whatsappTemplateId,
      },
      userId,
    );

    await this.processPendingTemplateMessages(id, userId);

    return template;
  }

  async rejectTemplate(
    id: string,
    rejectionReason: { code: string; message: string; details?: string },
    userId: string,
  ): Promise<Template> {
    const template = await this.update(
      id,
      {
        status: TemplateStatus.REJECTED,
        rejectionReason,
      },
      userId,
    );

    await this.handleRejectedTemplateMessages(id, userId);

    return template;
  }

  /**
   * Processes pending messages that were waiting for template approval
   */
  async processPendingTemplateMessages(templateId: string, userId: string): Promise<void> { }

  /**
   * Handles messages that were waiting for a template that got rejected
   */
  async handleRejectedTemplateMessages(templateId: string, userId: string): Promise<void> { }

  /**
   * Automatically resubmits template for approval with changes
   */
  async resubmitForApproval(
    templateId: string,
    changes: Partial<CreateTemplateDto>,
    userId: string,
  ): Promise<Template> {
    const updatedTemplate = await this.update(
      templateId,
      {
        ...changes,
        status: TemplateStatus.PENDING,
      },
      userId,
    );

    return updatedTemplate;
  }

  /**
   * Gets templates that are pending approval
   */
  async getPendingApprovalTemplates(userId: string): Promise<Template[]> {
    return this.templateRepository.find({
      where: {
        userId,
        status: TemplateStatus.PENDING,
      },
      order: { updatedAt: 'ASC' },
    });
  }

  /**
   * Gets template approval queue status
   */
  async getApprovalQueueStatus(userId: string): Promise<{
    pendingCount: number;
    processingCount: number;
    approvedToday: number;
    rejectedToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, approvedToday, rejectedToday] = await Promise.all([
      this.templateRepository.count({
        where: { userId, status: TemplateStatus.PENDING },
      }),
      this.templateRepository.count({
        where: {
          userId,
          status: TemplateStatus.APPROVED,
          updatedAt: { $gte: today } as any,
        },
      }),
      this.templateRepository.count({
        where: {
          userId,
          status: TemplateStatus.REJECTED,
          updatedAt: { $gte: today } as any,
        },
      }),
    ]);

    return {
      pendingCount: pending,
      processingCount: 0,
      approvedToday,
      rejectedToday,
    };
  }

  /**
   * Sincroniza el estado de un template específico con WhatsApp Business API
   */
  async syncWhatsAppStatus(templateId: string, userId: string): Promise<Template> {
    const template = await this.findOne(templateId, userId);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    try {
      this.logger.log(`🔄 Sincronizando estado del template "${template.name}" con WhatsApp...`);

      const whatsappStatus = await this.whatsappService.getTemplateStatusFromWhatsApp(
        template.name,
        userId,
      );

      if (!whatsappStatus) {
        this.logger.warn(`Template "${template.name}" no encontrado en WhatsApp, manteniendo estado actual`);
        return template;
      }

      const previousStatus = template.status;
      template.status = whatsappStatus.status;
      template.whatsappTemplateId = whatsappStatus.id;

      if (whatsappStatus.status === TemplateStatus.APPROVED && previousStatus !== TemplateStatus.APPROVED) {
        template.approvedAt = new Date();
      }

      if (whatsappStatus.status === TemplateStatus.REJECTED) {
        template.rejectedAt = new Date();
        if (whatsappStatus.rejectedReason) {
          template.rejectionReason = {
            code: 'WHATSAPP_REJECTION',
            message: whatsappStatus.rejectedReason,
          };
        }
      }

      await this.templateRepository.save(template);

      this.logger.log(`✅ Template "${template.name}" actualizado: ${previousStatus} → ${whatsappStatus.status}`);

      return template;
    } catch (error) {
      this.logger.error(`❌ Error sincronizando template ${templateId}:`, error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Error sincronizando con WhatsApp: ${msg}`);
    }
  }

  /**
   * Sincroniza el estado de todos los templates del usuario con WhatsApp Business API
   */
  async syncAllWhatsAppStatus(userId: string): Promise<{
    syncedCount: number;
    updatedCount: number;
    errors: string[];
  }> {
    const templates = await this.findAll(userId);
    let syncedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    this.logger.log(`🔄 Iniciando sincronización de ${templates.length} templates con WhatsApp...`);

    for (const template of templates) {
      try {
        await this.syncWhatsAppStatus(template.id, userId);
        syncedCount++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Template ${template.name}: ${msg}`);
      }
    }

    this.logger.log(
      `✅ Sincronización completada: ${syncedCount}/${templates.length} templates sincronizados`,
    );

    return {
      syncedCount,
      updatedCount,
      errors,
    };
  }

  /**
   * Método privado para consultar el estado real en WhatsApp Business API
   * TODO: Implementar la consulta real
   */
  private async queryWhatsAppTemplateStatus(templateName: string): Promise<{
    id: string;
    status: TemplateStatus;
    name: string;
  }> {
    throw new Error('WhatsApp API integration not implemented yet');
  }
}

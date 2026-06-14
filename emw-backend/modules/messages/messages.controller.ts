import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  Logger,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService, BulkSendDto, SendMessageDto } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageStatus, MessageType } from './entities/message-log.entity';
import { CreateMessageTemplateDto } from './dto/message-template.dto';
import { PendingMessagesService } from './services/pending-messages.service';
import { TemplatesService } from '../templates/templates.service';
import { StorageService } from '../shared/storage.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly pendingMessagesService: PendingMessagesService,
    private readonly templatesService: TemplatesService,
    private readonly storageService: StorageService,
  ) { }

  /**
   * Crear una "plantilla rápida" (MessageTemplate interno, NO la plantilla oficial de WhatsApp).
   */
  @Post()
  async createMessage(
    @Body() createMessageTemplateDto: CreateMessageTemplateDto,
    @Request() req,
  ) {
    this.logger.log('Creating new MessageTemplate');
    return this.messagesService.createMessageTemplate(createMessageTemplateDto, req.user.id);
  }

  /**
   * Upload a media file to Firebase Storage
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds 10MB limit. Current: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      );
    }

    this.logger.log(`Uploading file: ${file.originalname} (${file.size} bytes, type: ${file.mimetype})`);

    try {
      const result = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
      );

      return {
        success: true,
        url: result.url,
        filename: result.filename,
      };
    } catch (error) {
      this.logger.error('Upload failed:', error);
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Upload failed',
      );
    }
  }

  /**
   * Envío directo (único o múltiple). Respeta opt-in.
   * Acepta variaciones de payload para ser flexible con el frontend.
   */
  @Post('send')
  async sendMessage(@Body() sendMessageDto: any, @Request() req) {
    try {
      const dto: SendMessageDto = { ...sendMessageDto } as any;

      if ((sendMessageDto as any).recipient && !dto.recipientNumber) {
        dto.recipientNumber = (sendMessageDto as any).recipient;
      }

      if ((sendMessageDto as any).recipients && !dto.recipientNumbers) {
        const recs = Array.isArray((sendMessageDto as any).recipients)
          ? (sendMessageDto as any).recipients
          : [];

        dto.recipientNumbers = recs
          .map((r: any) => (typeof r === 'string' ? r : r?.phoneNumber))
          .filter(Boolean);

        if (!dto.content) {
          const firstWithContent = recs.find((r: any) => r?.content);
          if (firstWithContent) dto.content = firstWithContent.content;
        }
      }

      if ((sendMessageDto as any).mediaUrl && (sendMessageDto as any).mediaType) {
        dto.mediaAttachments = [
          {
            type: (sendMessageDto as any).mediaType,
            url: (sendMessageDto as any).mediaUrl,
            caption: (sendMessageDto as any).content,
          },
        ];
      }

      const logs = await this.messagesService.sendMessage(dto, req.user.id);

      if (logs.length === 1) {
        return { success: true, messageLogId: logs[0].id };
      }
      return { success: true, messageLogIds: logs.map(l => l.id) };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Bulk "oficial": envía una plantilla aprobada a muchos destinatarios.
   */
  @Post('bulk-send')
  async bulkSend(@Body() bulkSendDto: BulkSendDto, @Request() req) {
    try {
      return await this.messagesService.bulkSend(bulkSendDto, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  // Segundo @Post('upload') eliminado — usaba base64 data URL que WhatsApp API no soporta.
  // Se conserva el primer @Post('upload') que usa Firebase Storage (URL pública real).

  /**
   * Bulk "legacy"/compatibilidad para payloads antiguos del front.
   */
  @Post('send-bulk')
  async sendBulkCompat(@Body() body: any, @Request() req) {
    const recipients = Array.isArray(body.recipients)
      ? body.recipients
        .map((r: any) => (typeof r === 'string' ? r : r?.phoneNumber))
        .filter(Boolean)
      : [];

    const dto: SendMessageDto = {
      type: (body.type as MessageType) || MessageType.TEXT,
      recipientNumbers: recipients,
      content: body.content || body.recipients?.[0]?.content,
      priority: body.priority,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    } as any;

    const logs = await this.messagesService.sendMessage(dto, req.user.id);
    return { totalMessages: logs.length, campaignId: logs[0]?.id ?? null };
  }

  /**
   * Listado de logs de mensajes con filtros.
   */
  @Get()
  async getMessages(
    @Request() req,
    @Query('status') status?: MessageStatus,
    @Query('type') type?: MessageType,
    @Query('recipientNumber') recipientNumber?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('full') full?: string,
  ) {
    const filters = {
      status,
      type,
      recipientNumber,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    const result = await this.messagesService.getMessages(req.user.id, filters);

    if (full === 'true') {
      return result;
    }

    return result.messages;
  }

  /**
   * Métricas de envío (enviados, fallidos, pendientes, etc.)
   */
  @Get('stats')
  async getMessageStats(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.messagesService.getMessageStats(
      req.user.id,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
  }

  /**
   * Métricas de la cola de pending_messages.
   */
  @Get('pending-stats')
  async getPendingStats(@Request() req) {
    try {
      return await this.messagesService.getPendingMessageStats(req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Historial de message_logs con filtros y paginación.
   */
  @Get('logs')
  async getMessageLogs(
    @Request() req,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('recipientNumber') recipientNumber?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const filters = {
      status: status as any,
      direction: direction as any,
      recipientNumber,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };

    return this.messagesService.getMessageLogs(req.user.id, filters);
  }

  /**
   * Detalle de un mensaje específico.
   */
  @Get(':id')
  async getMessageById(@Param('id') id: string, @Request() req) {
    return this.messagesService.getMessageById(id, req.user.id);
  }

  /**
   * Reintentar mensaje fallido.
   */
  @Post(':id/retry')
  async retryMessage(@Param('id') id: string, @Request() req) {
    try {
      return await this.messagesService.retryMessage(id, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Cancelar mensaje pendiente / en cola.
   */
  @Post(':id/cancel')
  async cancelMessage(@Param('id') id: string, @Request() req) {
    try {
      return await this.messagesService.cancelMessage(id, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Reordenar múltiples mensajes de una sola vez (drag & drop).
   * Body: { items: [{ id: string, order: number }, ...] }
   */
  @Put('batch/reorder')
  async reorderMessages(@Body() body: { items: { id: string; order: number }[] }, @Request() req) {
    try {
      return await this.messagesService.reorderMessages(body.items, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Actualizar datos de un mensaje ya creado (ej. contenido).
   */
  @Put(':id')
  async updateMessage(@Param('id') id: string, @Body() updateData: any, @Request() req) {
    try {
      return await this.messagesService.updateMessage(id, updateData, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Eliminar mensaje/plantilla guardada en la colección interna.
   */
  @Delete(':id')
  async deleteMessage(@Param('id') id: string, @Request() req) {
    try {
      this.logger.log('Deleting message');
      return await this.messagesService.deleteMessage(id, req.user.id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Utilidad: convierte un texto con {{variables}} a formato interno.
   */
  @Post('convert')
  async convertTemplate(@Body() body: { templateText: string }) {
    try {
      return await this.messagesService.convertTemplate(body.templateText);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Preview: reemplaza las variables {{...}} por valores de ejemplo.
   */
  @Post('preview')
  async previewMessage(@Body() body: { templateText: string }) {
    try {
      return await this.messagesService.previewMessage(body.templateText);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Forzar drenado manual de la cola para un número,
   * simulando que el cliente ya dijo "SÍ".
   */
  @Post('process-opt-in')
  async processOptIn(@Body() body: { phoneNumber: string }, @Request() req) {
    try {
      return await this.messagesService.processPendingMessagesForOptIn(
        body.phoneNumber,
        req.user.id,
      );
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 🔬 SOLO DEV
   *
   * Crea un PendingMessage en estado WAITING_OPT_IN.
   * Luego, cuando el cliente responda "si"/"sí"/"acepto" por WhatsApp:
   *  - webhook.controller detecta consentimiento
   *  - whatsappWebhookService.recordConsentDecision() marca opt-in
   *  - messagesService.processPendingMessagesForOptIn() drena la cola
   *
   * Ejemplo curl (con tu Bearer real):
   *
   *   curl -X POST http://localhost:3001/api/messages/debug/queue \
   *     -H "Authorization: Bearer $TOKEN" \
   *     -H "Content-Type: application/json" \
   *     -d '{
   *       "recipientNumber": "573117671177",
   *       "templateName": "utilidad_test_dosvar",
   *       "templateParams": ["Frank", "12:00 PM"],
   *       "content": "texto fallback si fuera tipo TEXT"
   *     }'
   */
  /**
 * SOLO DEV
 * Crea un mensaje pendiente con estado WAITING_OPT_IN para un número.
 * Este mensaje NO se envía todavía. Queda en pending_messages.
 *
 * Flujo esperado:
 * 1. Tú llamas a este endpoint varias veces para encolar mensajes.
 * 2. El contacto escribe "SI" (ó "sí") por WhatsApp al número del negocio.
 * 3. El webhook marca OPT-IN y llama processPendingMessagesForOptIn(),
 *    que drena la cola y dispara todos estos mensajes realmente.
 */
  @Post('debug/queue')
  async queueTestMessage(
    @Body()
    body: {
      recipientNumber: string;
      content?: string;
      templateId?: string;
      templateName?: string;
      templateParams?: string[];
      priority?: number;
    },
    @Request() req,
  ) {
    try {

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestException(
          'No se pudo determinar el userId (¿AUTH_MODE=mock y NODE_ENV=development?)',
        );
      }

      const rawNumber = body.recipientNumber?.trim();
      if (!rawNumber) {
        throw new BadRequestException('recipientNumber es requerido');
      }
      const normalizedNumber = rawNumber.replace(/^\+/, '');

      let finalTemplateId: string | undefined = body.templateId?.trim() || undefined;

      if (!finalTemplateId && body.templateName) {
        const tpl = await this.templatesService.findByName(body.templateName.trim(), userId);

        if (!tpl) {
          throw new BadRequestException(
            `No existe plantilla con name="${body.templateName}" para este usuario`,
          );
        }

        if (!tpl.isApproved) {
          throw new BadRequestException(
            `La plantilla "${body.templateName}" no está APPROVED todavía`,
          );
        }

        finalTemplateId = tpl.id;
      }

      const messageType = finalTemplateId ? MessageType.TEMPLATE : MessageType.TEXT;

      const pending = await this.pendingMessagesService.createPendingMessage(
        normalizedNumber,
        userId,
        {
          type: messageType,
          content: body.content ?? undefined,
          templateId: finalTemplateId ?? undefined,
          templateParams: body.templateParams ?? undefined,
          mediaAttachments: undefined,
          scheduledAt: undefined,
          priority: typeof body.priority === 'number' ? body.priority : 10,
        },
      );

      this.logger.log(
        `✅ PendingMessage creado id=${pending.id} status=${pending.status} ` +
        `for user=${userId} phone=${normalizedNumber}`,
      );

      return {
        ok: true,
        pendingMessage: pending,
        hint:
          'Ahora, desde ese número de WhatsApp, responde "si". ' +
          'El webhook detecta el consentimiento, marca opt-in y drena la cola.',
      };
    } catch (err: any) {
      this.logger.error(
        `💥 Error creando pending message: ${err?.message}`,
        err?.stack,
      );

      if (err instanceof BadRequestException) {
        throw err;
      }

      throw new HttpException(
        err?.message || 'No se pudo crear el mensaje pendiente',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WhatsAppAccount } from '../../accounts/entities/whatsapp-account.entity';
import { MessageLog, MessageStatus, MessageType } from '../entities/message-log.entity';
import { Template, TemplateCategory, TemplateLanguage, TemplateStatus } from '../../templates/entities/template.entity';
import { OlympoHubService } from '../../cauce/cauce-hub.service';

export interface SendMessageRequest {
  accountId: string;
  recipient: string;
  type: MessageType;
  content?: string;
  templateId?: string;
  templateParams?: string[];
  mediaUrl?: string;
  mediaType?: string;
  priority?: number;
  scheduledAt?: Date;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  messageLogId: string;
  whatsappMessageId?: string;
  error?: string;
}

export interface CreateTemplateRequest {
  name: string;
  language: TemplateLanguage;
  category: TemplateCategory;
  parameter_format?: 'named' | 'positional';
  components?: Array<{
    type: 'header' | 'body' | 'button' | 'footer';
    text: string;
    example?: {
      body_text_named_params: Array<{
        param_name: string;
        example: string;
      }>
    } | {
      body_text: Array<string[]>;
    }
  }>;
}
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(WhatsAppAccount)
    private readonly accountRepository: Repository<WhatsAppAccount>,
    @InjectRepository(MessageLog)
    private readonly messageLogRepository: Repository<MessageLog>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    private readonly cauceHub: OlympoHubService,
  ) {
    this.baseUrl = this.configService.get<string>('WHATSAPP_API_BASE_URL') || 'https://graph.facebook.com/v18.0';
  }
  async registerNewTemplate(template: Template, userId: string) {
    try {
      const userWhatsappAccount = await this.accountRepository.findOneOrFail({
        where: {
          userId: userId,
          isActive: true,
        },
      });
      this.logger
        .log(
          `Registering new template ${template.name}
          for user ${userId}
          with whatsapp account ${userWhatsappAccount.id}`
        );
      const url =
        `${this.baseUrl}/${userWhatsappAccount.businessAccountId}/message_templates`;

      // --- Convertir variables descriptivas ({{firstName}}) a numéricas ({{1}}) ---
      // Meta solo acepta {{1}}, {{2}}, etc. en el body del template
      const descriptiveVarMatches = template.body.match(/\{\{([a-zA-Z]\w*)\}\}/g) || [];
      let numericBody = template.body;
      const variableMapping: Record<string, number> = {};
      let varIndex = 1;

      for (const match of descriptiveVarMatches) {
        const varName = match.replace(/\{\{|\}\}/g, '');
        if (!variableMapping[varName]) {
          variableMapping[varName] = varIndex++;
        }
        numericBody = numericBody.replace(match, `{{${variableMapping[varName]}}}`);
      }

      // Ahora extraer variables numéricas del body convertido
      const variableMatches = numericBody.match(/\{\{(\d+)\}\}/g) || [];
      const variableCount = variableMatches.length;

      // Generar ejemplos para cada variable
      const exampleValues: Record<string, string> = {
        firstName: 'Juan',
        lastName: 'Pérez',
        companyName: 'Empresa S.A.',
        title: 'Sr.',
        lastContact: '2025-06-01',
        campaing: 'Campaña de Verano',
        note: 'Nota de ejemplo',
        label: 'VIP',
        data1: 'Dato1',
        data2: 'Dato2',
        data3: 'Dato3',
      };

      const bodyExamples = Object.entries(variableMapping)
        .sort(([, a], [, b]) => a - b)
        .map(([varName]) => exampleValues[varName] || `Ejemplo_${varName}`);

      this.logger.log(`Variable mapping: ${JSON.stringify(variableMapping)}`);
      this.logger.log(`Numeric body: ${numericBody}`);

      // Construir componente body con o sin examples
      const bodyComponent: any = {
        type: 'BODY',
        text: numericBody,
      };

      // Solo agregar examples si hay variables (requerido por Meta para aprobación)
      if (variableCount > 0) {
        bodyComponent.example = {
          body_text: [bodyExamples],
        };
      }

      const payload = {
        name: template.name,
        language: template.language,
        category: template.category,
        components: [bodyComponent],
      }

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${userWhatsappAccount.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(`WhatsApp API response: ${JSON.stringify(response.data)}`);

      const templateStatus = response.data?.status;
      const whatsappTemplateId = response.data?.id;

      if (templateStatus === 'REJECTED') {
        template.status = TemplateStatus.REJECTED;
        template.rejectedAt = new Date();
        throw new BadRequestException('Template was rejected by WhatsApp API');
      }

      template.submittedAt = new Date();
      template.whatsappTemplateId = whatsappTemplateId;

      // Guardar el body numérico (el que aceptó Meta) y el mapping de variables
      if (Object.keys(variableMapping).length > 0) {
        template.body = numericBody;
        template.metadata = {
          ...(template.metadata || {}),
          variableMapping,
        };
      }

      // Mapear status de WhatsApp a nuestro enum
      if (templateStatus === 'PENDING') {
        template.status = TemplateStatus.PENDING;
      } else if (templateStatus === 'APPROVED') {
        template.status = TemplateStatus.APPROVED;
        template.approvedAt = new Date();
      }
    } catch (error) {
      // Si ya es un BadRequestException nuestro, re-lanzar sin envolver
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Si es un error de axios, extraer más detalles de la API de Meta
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data;
        const metaError = errorData.error || {};
        this.logger.error(`WhatsApp API error: ${JSON.stringify(errorData)}`);

        // Mapear errores comunes de Meta a mensajes claros en español
        const errorCode = metaError.code;
        const errorSubcode = metaError.error_subcode;
        let userMessage = metaError.error_user_msg || metaError.message || 'Error desconocido de WhatsApp';

        // Duplicado de template
        if (errorCode === 100 && errorSubcode === 2388023) {
          userMessage = `Ya existe un template con el nombre "${template.name}" en idioma "${template.language}" en tu cuenta de WhatsApp Business. Usa un nombre diferente o elimínalo desde Meta Business Suite.`;
        }
        // Límite de templates alcanzado
        else if (errorCode === 100 && errorSubcode === 2388024) {
          userMessage = 'Has alcanzado el límite máximo de templates en tu cuenta de WhatsApp Business.';
        }
        // Token inválido o expirado
        else if (errorCode === 190) {
          userMessage = 'El token de acceso de WhatsApp es inválido o ha expirado. Ve a Configuración > WhatsApp para actualizarlo.';
        }
        // Permisos insuficientes
        else if (errorCode === 10 || errorCode === 200) {
          userMessage = 'No tienes permisos suficientes en la cuenta de WhatsApp Business para crear templates.';
        }

        throw new BadRequestException(userMessage);
      }
      this.logger.error(`Error registering new template: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Error inesperado al registrar template en WhatsApp. Intenta de nuevo.');
    }
  }
  async requestAccess(phoneNumber: string, userId: string, customerData?: { firstName?: string; lastName?: string }) {
    this.logger.log(`Requesting access for ${phoneNumber} for user ${userId}`);

    // Buscar cuenta de WhatsApp activa
    const account = await this.accountRepository.findOneOrFail({
      where: {
        userId: userId,
        isActive: true,
      },
    });

    // Buscar template activo y aprobado para opt-in
    const activeTemplate = await this.templateRepository.findOne({
      where: {
        userId: userId,
        active: true,
        status: TemplateStatus.APPROVED,
      },
    });

    if (!activeTemplate) {
      this.logger.error(`No active and approved template found for user ${userId}`);
      throw new BadRequestException(
        'No hay un template activo y aprobado. Crea un template y espera la aprobación de WhatsApp.'
      );
    }

    this.logger.log(`Using template "${activeTemplate.name}" (ID: ${activeTemplate.id}) for opt-in`);

    // Detectar variables {{1}}, {{2}}, etc. en el body del template
    const varMatches = activeTemplate.body ? activeTemplate.body.match(/\{\{(\d+)\}\}/g) || [] : [];
    const uniqueVars = [...new Set(varMatches)].sort();
    let templateParams: string[] | undefined;

    if (uniqueVars.length > 0) {
      // Generar parámetros para las variables del template
      // Prioridad: 1) datos del customer, 2) examples del template, 3) valores genéricos
      const variableMapping = activeTemplate.metadata?.variableMapping || {};
      const invertedMapping: Record<number, string> = {};
      for (const [name, num] of Object.entries(variableMapping)) {
        invertedMapping[num as number] = name;
      }

      templateParams = uniqueVars.map(v => {
        const varNum = parseInt(v.replace(/\{\{|\}\}/g, ''), 10);
        const varName = invertedMapping[varNum];

        // Si tenemos datos del customer, intentar usarlos
        if (customerData) {
          if (varName === 'firstName' && customerData.firstName) return customerData.firstName;
          if (varName === 'lastName' && customerData.lastName) return customerData.lastName;
        }

        // Buscar ejemplo en los parameters del template
        if (activeTemplate.parameters && activeTemplate.parameters[varNum - 1]) {
          return activeTemplate.parameters[varNum - 1].example || `param${varNum}`;
        }

        // Valores genéricos por nombre de variable
        const defaults: Record<string, string> = {
          firstName: customerData?.firstName || 'Cliente',
          lastName: customerData?.lastName || '',
          companyName: 'Nuestra Empresa',
        };
        if (varName && defaults[varName]) return defaults[varName];

        return `param${varNum}`;
      });

      this.logger.log(`Template has ${uniqueVars.length} variables, sending params: ${JSON.stringify(templateParams)}`);
    }

    const requestSendMessageDto = {
      accountId: account.id,
      recipient: phoneNumber,
      type: MessageType.TEMPLATE,
      templateId: activeTemplate.id,
      templateParams,
    };

    return this.sendMessage(requestSendMessageDto, userId);
  }
  async sendMessage(request: SendMessageRequest, userId: string): Promise<SendMessageResponse> {
    try {
      const account = await this.getAccount(request.accountId, userId);
      if (!account) {
        throw new BadRequestException('WhatsApp account not found or not accessible');
      }

      const messageLog = await this.createMessageLog(request, userId, account.id);

      try {
        let response: any;
        switch (request.type) {
          case MessageType.TEXT:
            response = await this.sendTextMessage(account, request);
            break;
          case MessageType.TEMPLATE:
            response = await this.sendTemplateMessage(account, request);
            break;
          case MessageType.MEDIA:
            response = await this.sendMediaMessage(account, request);
            break;
          default:
            throw new BadRequestException(`Unsupported message type: ${request.type}`);
        }

        await this.updateMessageLogStatus(messageLog.id, MessageStatus.SENT, {
          whatsappMessageId: response.id,
        });

        // Olympo: EMW es dueño de MESSAGE_SENT. Publicación NO bloqueante —
        // el HubClient es tolerante a fallos y nunca lanza hacia este flujo.
        void this.cauceHub.messageSent({
          messageId: response.id || messageLog.id,
          to: request.recipient,
          status: MessageStatus.SENT,
        });

        return {
          success: true,
          messageId: response.id,
          messageLogId: messageLog.id,
          whatsappMessageId: response.id,
        };
      } catch (error: any) {
        const metaError = error?.response?.data?.error;
        const errorMessage = metaError?.message || metaError?.error_user_msg || error?.message || 'Unknown error';
        const errorCode = metaError?.code?.toString() || error?.code || 'SEND_ERROR';

        this.logger.error(`Error sending message: [${errorCode}] ${errorMessage}`);
        await this.updateMessageLogStatus(messageLog.id, MessageStatus.FAILED, {
          error: errorMessage,
          code: errorCode,
          details: error?.response?.data,
        });

        return {
          success: false,
          messageLogId: messageLog.id,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error?.message}`);
      throw error;
    }
  }

  private async sendTextMessage(account: WhatsAppAccount, request: SendMessageRequest) {
    const payload = {
      messaging_product: 'whatsapp',
      to: request.recipient,
      type: 'text',
      text: {
        body: request.content,
      },
    };

    const response = await axios.post(
      `${this.baseUrl}/${account.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return (response as any).data.messages[0];
  }

  private async sendTemplateMessage(account: WhatsAppAccount, request: SendMessageRequest) {
    const template = await this.templateRepository.findOne({
      where: { id: request.templateId },
    });

    if (!template) {
      throw new BadRequestException(`Template not found: ${request.templateId}`);
    }

    const templatePayload: any = {
      name: template.name,
      language: {
        code: template.language,
      },
    };

    if (request.templateParams && request.templateParams.length > 0) {
      templatePayload.components = [
        {
          type: 'body',
          parameters: request.templateParams.map(param => ({
            type: 'text',
            text: param,
          })),
        },
      ];
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: request.recipient,
      type: MessageType.TEMPLATE,
      template: templatePayload,
    };

    const response = await axios.post(
      `${this.baseUrl}/${account.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return (response as any).data.messages[0];
  }

  private async sendMediaMessage(account: WhatsAppAccount, request: SendMessageRequest) {
    const mediaType = request.mediaType || 'image';

    const payload: any = {
      messaging_product: 'whatsapp',
      to: request.recipient,
      type: mediaType,
      [mediaType]: {
        link: request.mediaUrl,
        caption: request.content,
      },
    };

    const response = await axios.post(
      `${this.baseUrl}/${account.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return (response as any).data.messages[0];
  }

  private async getAccount(accountId: string, userId: string): Promise<WhatsAppAccount> {
    return this.accountRepository.findOne({
      where: {
        id: accountId,
        userId: userId,
        isActive: true,
      },
    });
  }

  private async createMessageLog(
    request: SendMessageRequest,
    userId: string,
    accountId: string,
  ): Promise<MessageLog> {
    const messageLog = this.messageLogRepository.create({
      userId,
      whatsappAccountId: accountId,
      recipientNumber: request.recipient,
      type: request.type,
      status: MessageStatus.PROCESSING,
      content: request.content,
      templateId: request.templateId,
      templateParams: request.templateParams,
      mediaAttachments: request.mediaUrl
        ? [
            {
              type: request.mediaType || 'unknown',
              url: request.mediaUrl,
              caption: request.content,
            },
          ]
        : null,
      priority: request.priority || 0,
      scheduledAt: request.scheduledAt,
    });

    return this.messageLogRepository.save(messageLog);
  }

  private async updateMessageLogStatus(
    messageLogId: string,
    status: MessageStatus,
    additionalData?: any,
  ): Promise<void> {
    const updateData: any = { status };

    if (additionalData?.whatsappMessageId) {
      updateData.whatsappMessageId = additionalData.whatsappMessageId;
      updateData.sentAt = new Date();
    }

    if (additionalData?.error) {
      updateData.errorDetails = {
        code: additionalData.code || 'SEND_ERROR',
        message: additionalData.error,
        details: additionalData.details,
      } as any;
    }

    await this.messageLogRepository.update(messageLogId, updateData);
  }

  /**
   * Consulta el estado de un template específico en WhatsApp Business API
   * @param templateName Nombre del template a consultar
   * @param userId ID del usuario propietario
   * @returns Estado del template en WhatsApp
   */
  async getTemplateStatusFromWhatsApp(templateName: string, userId: string): Promise<{
    id: string;
    status: TemplateStatus;
    name: string;
    rejectedReason?: string;
  } | null> {
    try {
      const account = await this.accountRepository.findOne({
        where: {
          userId: userId,
          isActive: true,
        },
      });

      if (!account) {
        this.logger.warn(`No active WhatsApp account found for user ${userId}`);
        return null;
      }

      const url = `${this.baseUrl}/${account.businessAccountId}/message_templates?name=${encodeURIComponent(templateName)}`;

      this.logger.log(`🔍 Consultando estado del template "${templateName}" en WhatsApp API...`);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
        },
      });

      const templates = response.data?.data;

      if (!templates || templates.length === 0) {
        this.logger.warn(`Template "${templateName}" no encontrado en WhatsApp API`);
        return null;
      }

      const whatsappTemplate = templates[0];

      // Mapear status de WhatsApp a nuestro enum
      let mappedStatus: TemplateStatus;
      switch (whatsappTemplate.status?.toUpperCase()) {
        case 'APPROVED':
          mappedStatus = TemplateStatus.APPROVED;
          break;
        case 'PENDING':
          mappedStatus = TemplateStatus.PENDING;
          break;
        case 'REJECTED':
          mappedStatus = TemplateStatus.REJECTED;
          break;
        case 'DISABLED':
          mappedStatus = TemplateStatus.DISABLED;
          break;
        default:
          mappedStatus = TemplateStatus.PENDING;
      }

      this.logger.log(`✅ Template "${templateName}" estado en WhatsApp: ${mappedStatus}`);

      return {
        id: whatsappTemplate.id,
        status: mappedStatus,
        name: whatsappTemplate.name,
        rejectedReason: whatsappTemplate.rejected_reason,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error consultando template en WhatsApp: ${error?.response?.data?.error?.message || error?.message}`);
      throw new BadRequestException(
        `Error consultando WhatsApp API: ${error?.response?.data?.error?.message || error?.message}`
      );
    }
  }
}

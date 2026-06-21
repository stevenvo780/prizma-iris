import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Customer, CustomerStatus } from './entities/customer.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { MessagesService, SendMessageDto } from '../messages/messages.service';
import { Template, TemplateStatus } from '../templates/entities/template.entity';
import { CustomerTagAssignment } from '../customer-tags/entities/customer-tag-assignment.entity';
import { CustomerTag } from '../customer-tags/entities/customer-tag.entity';
import { WhatsAppAccount, AccountStatus } from '../accounts/entities/whatsapp-account.entity';
import { MessageType } from '../messages/entities/message-log.entity';
import { ResponseCustomerDto } from './dto/response/customer';
import { mapCustomersToResponseDtos, mapCustomerToResponseDto } from './dto/response/mapper/customer.mapper';

export interface CreateCustomerDto {
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  notes?: string;
  language?: string;
  timezone?: string;
  companyName?: string;
  title?: string;
  campaign?: string;
  data1?: string;
  data2?: string;
  data3?: string;
  preferences?: {
    marketing: boolean;
    notifications: boolean;
    frequency: string;
  };
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  status?: CustomerStatus;
  optOutAt?: Date;
}

export interface ImportCustomersDto {
  customers: CreateCustomerDto[];
}

export interface ImportError {
  customer: any;
  error: string;
}

// ─── Límites del plan gratuito ───
export const FREE_PLAN_LIMITS = {
  MAX_CUSTOMERS: 50,
  MAX_MESSAGES_PER_DAY: 100,
  MAX_BULK_RECIPIENTS: 10,
  MAX_TEMPLATES: 5,
};

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Template)
    private templateRepository: Repository<Template>,

    @InjectRepository(CustomerTagAssignment)
    private customerTagAssignmentRepository: Repository<CustomerTagAssignment>,

    @InjectRepository(CustomerTag)
    private customerTagRepository: Repository<CustomerTag>,

    @InjectRepository(WhatsAppAccount)
    private whatsappAccountRepository: Repository<WhatsAppAccount>,

    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
  ) { }

  /**
   * Busca clientes por lista de teléfonos, incluyendo tags asignados.
   */
  async findByPhoneNumbers(userId: string, phoneNumbers: string[]): Promise<Customer[]> {
    if (!phoneNumbers.length) return [];
    return this.customerRepository.find({
      where: { userId, phoneNumber: In(phoneNumbers) },
      relations: ['tagAssignments', 'tagAssignments.tag'],
    });
  }

  /**
   * Verifica si el usuario free ha alcanzado su límite de clientes.
   * Premium y Admin no tienen límites.
   */
  async checkCustomerLimit(userId: string): Promise<{ allowed: boolean; current: number; max: number | null }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.PREMIUM || user.role === UserRole.ADMIN) {
      const current = await this.customerRepository.count({ where: { userId } });
      return { allowed: true, current, max: null };
    }

    const currentCount = await this.customerRepository.count({ where: { userId } });
    return {
      allowed: currentCount < FREE_PLAN_LIMITS.MAX_CUSTOMERS,
      current: currentCount,
      max: FREE_PLAN_LIMITS.MAX_CUSTOMERS,
    };
  }

  async create(createCustomerDto: CreateCustomerDto, userId: string): Promise<ResponseCustomerDto> {
    this.logger.log('[create] Creating customer with data:', createCustomerDto);
    this.logger.log('[create] User ID:', userId);
    this.logger.log('[create] Tags received:', createCustomerDto.tags);

    // ─── Verificar límite de clientes para cuentas gratuitas ───
    const limitCheck = await this.checkCustomerLimit(userId);
    if (!limitCheck.allowed) {
      throw new BadRequestException(
        `Has alcanzado el límite de ${limitCheck.max} clientes en el plan gratuito. ` +
        `Actualmente tienes ${limitCheck.current} clientes. ` +
        `Actualiza a Premium para clientes ilimitados.`
      );
    }

    // Normalizar phoneNumber: asegurar que empiece con +
    if (createCustomerDto.phoneNumber && !createCustomerDto.phoneNumber.startsWith('+')) {
      createCustomerDto.phoneNumber = '+' + createCustomerDto.phoneNumber.trim();
    }

    const existingCustomer = await this.customerRepository.findOne({
      where: { phoneNumber: createCustomerDto.phoneNumber, userId },
    });

    if (existingCustomer) {
      throw new BadRequestException('Customer with this phone number already exists');
    }

    const { tags, companyName, title, campaign, data1, data2, data3, ...customerData } = createCustomerDto;

    // Construir customFields con los campos extra
    const extraFields: Record<string, any> = {};
    if (companyName) extraFields.company = companyName;
    if (title) extraFields.title = title;
    if (campaign) extraFields.campaign = campaign;
    if (data1) extraFields.data1 = data1;
    if (data2) extraFields.data2 = data2;
    if (data3) extraFields.data3 = data3;

    const customer = this.customerRepository.create({
      ...customerData,
      firstName: customerData.firstName || '',
      lastName: customerData.lastName || '',
      customFields: Object.keys(extraFields).length > 0
        ? { ...(customerData.customFields || {}), ...extraFields }
        : customerData.customFields || null,
      userId,
      status: CustomerStatus.ACTIVE,
    });

    const savedCustomer = await this.customerRepository.save(customer);
    this.logger.log('[create] Customer saved with ID:', savedCustomer.id);

    if (tags && tags.length > 0) {
      this.logger.log('[create] Processing tags:', tags);
      await this.assignTagsToCustomer(savedCustomer.id, tags, userId);
    } else {
      this.logger.log('[create] No tags to process');
    }

    const result: Customer = await this.findOne(savedCustomer.id, userId);
    this.logger.log(
      '[create] Returning customer with tags:',
      result.tagAssignments?.map(a => a.tag?.name),
    );
    const responseCustomerDto: ResponseCustomerDto = mapCustomerToResponseDto(result);
    return responseCustomerDto;
  }

  async findAll(
    userId: string,
    filters?: {
      status?: CustomerStatus;
      tags?: string[];
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    let query = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.tagAssignments', 'tagAssignments')
      .leftJoinAndSelect('tagAssignments.tag', 'tag')
      .where('customer.userId = :userId', { userId });

    if (filters?.status) {
      query.andWhere('customer.status = :status', { status: filters.status });
    }

    if (filters?.tags && filters.tags.length > 0) {
      query
        .andWhere('tag.name IN (:...tagNames)', { tagNames: filters.tags })
        .andWhere('tag.isActive = :active', { active: true });
    }

    if (filters?.search) {
      query.andWhere(
        '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR customer.phoneNumber ILIKE :search OR customer.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query.orderBy('customer.createdAt', 'DESC');

    // Si se solicita paginación (page y limit válidos)
    if (filters?.page && filters?.limit && filters.limit > 0) {
      const total = await query.getCount();
      const totalPages = Math.ceil(total / filters.limit);

      query.skip((filters.page - 1) * filters.limit).take(filters.limit);
      const result: Customer[] = await query.getMany();
      const data: ResponseCustomerDto[] = mapCustomersToResponseDtos(result);

      return { data, total, totalPages, page: filters.page };
    }

    // Sin paginación: retorna todos (usado para exportar)
    const result: Customer[] = await query.getMany();
    const customers: ResponseCustomerDto[] = mapCustomersToResponseDtos(result);
    return customers;
  }

  async findOne(id: string, userId: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, userId },
      relations: ['tagAssignments', 'tagAssignments.tag'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    userId: string,
  ): Promise<ResponseCustomerDto> {
    this.logger.log('[update] Starting update for customer ID:', id);
    this.logger.log('[update] Update DTO:', updateCustomerDto);

    const customer = await this.findOne(id, userId);
    this.logger.log('[update] Found customer with ID:', customer.id);

    // Normalizar phoneNumber si viene en el update
    if (updateCustomerDto.phoneNumber && !updateCustomerDto.phoneNumber.startsWith('+')) {
      updateCustomerDto.phoneNumber = '+' + updateCustomerDto.phoneNumber.trim();
    }

    if (
      updateCustomerDto.status === CustomerStatus.OPTED_OUT &&
      customer.status !== CustomerStatus.OPTED_OUT
    ) {
      updateCustomerDto.optOutAt = new Date();
    }

    const { tags, companyName, title, campaign, data1, data2, data3, ...customerData } = updateCustomerDto as any;

    this.logger.log('[update] Tags to assign:', tags);
    this.logger.log('[update] Customer data after extracting tags:', customerData);

    // Actualizar customFields con campos extra
    const extraFields: Record<string, any> = {};
    if (companyName !== undefined) extraFields.company = companyName;
    if (title !== undefined) extraFields.title = title;
    if (campaign !== undefined) extraFields.campaign = campaign;
    if (data1 !== undefined) extraFields.data1 = data1;
    if (data2 !== undefined) extraFields.data2 = data2;
    if (data3 !== undefined) extraFields.data3 = data3;

    if (Object.keys(extraFields).length > 0) {
      customerData.customFields = { ...(customer.customFields || {}), ...extraFields };
    }

    Object.assign(customer, customerData);
    customer.lastContactAt = new Date();

    const savedCustomer = await this.customerRepository.save(customer);
    this.logger.log('[update] Customer saved with ID:', savedCustomer.id);

    if (tags !== undefined) {
      this.logger.log('[update] assignTagsToCustomer for:', savedCustomer.id);

      if (!savedCustomer.id) {
        throw new BadRequestException('Customer ID is null after save');
      }
      await this.assignTagsToCustomer(savedCustomer.id, tags || [], userId);
    }

    const customerUpdated: Customer = await this.findOne(savedCustomer.id, userId);
    return mapCustomerToResponseDto(customerUpdated);
  }

  async remove(id: string, userId: string): Promise<void> {
    const customer = await this.findOne(id, userId);
    await this.customerRepository.remove(customer);
  }

  async importCustomers(
    importCustomersDto: ImportCustomersDto,
    userId: string,
  ): Promise<{
    imported: number;
    skipped: number;
    errors: ImportError[];
  }> {
    // ─── Verificar límite de clientes para cuentas gratuitas ───
    const limitCheck = await this.checkCustomerLimit(userId);
    const remainingSlots = limitCheck.max !== null ? limitCheck.max - limitCheck.current : Infinity;

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as ImportError[],
    };

    for (const customerData of importCustomersDto.customers) {
      // Verificar si ya se agotaron los slots disponibles
      if (limitCheck.max !== null && results.imported >= remainingSlots) {
        results.errors.push({
          customer: customerData,
          error: `Límite de ${limitCheck.max} clientes alcanzado (plan gratuito). Actualiza a Premium.`,
        });
        continue;
      }
      try {
        // Validar que al menos tenga phoneNumber
        if (!customerData.phoneNumber || String(customerData.phoneNumber).trim() === '') {
          results.errors.push({
            customer: customerData,
            error: 'phoneNumber es obligatorio',
          });
          continue;
        }

        // Normalizar phoneNumber: asegurar que empiece con +
        let phone = String(customerData.phoneNumber).trim();
        if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }
        customerData.phoneNumber = phone;

        // Si tags viene como string (ej: desde Excel), convertir a array
        if (customerData.tags && typeof customerData.tags === 'string') {
          customerData.tags = (customerData.tags as any).split(',').map((t: string) => t.trim()).filter(Boolean);
        }

        const existingCustomer = await this.customerRepository.findOne({
          where: { phoneNumber: customerData.phoneNumber, userId },
        });

        if (existingCustomer) {
          results.skipped++;
          continue;
        }

        await this.create(customerData, userId);
        results.imported++;
      } catch (error) {
        results.errors.push({
          customer: customerData,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  async getOptedInCustomers(userId: string): Promise<Customer[]> {
    return this.customerRepository.find({
      where: {
        userId,
        status: CustomerStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getByTags(userId: string, tags: string[]): Promise<Customer[]> {
    if (!tags || tags.length === 0) {
      return [];
    }

    const tagEntities = await this.customerTagRepository.find({
      where: {
        userId,
        name: In(tags),
        isActive: true,
      },
      select: ['id', 'name'],
    });

    if (tagEntities.length === 0) {
      return [];
    }

    const tagIds = tagEntities.map(tag => tag.id);

    const query = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.tagAssignments', 'allAssignments')
      .leftJoinAndSelect('allAssignments.tag', 'allTags')
      .innerJoin('customer.tagAssignments', 'assignment')
      .innerJoin('assignment.tag', 'tag')
      .where('customer.userId = :userId', { userId })
      .andWhere('assignment.tagId IN (:...tagIds)', { tagIds })
      .orderBy('customer.firstName', 'ASC')
      .addOrderBy('customer.lastName', 'ASC');

    const customers = await query.getMany();
    return customers;
  }

  async updateLastContact(phoneNumber: string, userId: string): Promise<void> {
    await this.customerRepository.update({ phoneNumber, userId }, { lastContactAt: new Date() });
  }

  /**
   * ✅ markOptIn (versión corregida)
   *
   * - Garantiza que el número quede registrado como cliente ACTIVO con opt-in.
   * - Si el cliente YA existe → lo marcamos ACTIVE, optInAt ahora, limpiamos optOutAt.
   * - Si NO existe → lo creamos automáticamente con ese número y ese userId.
   *
   * Esto es crítico para el flujo:
   *   1. El usuario responde "SI" en WhatsApp.
   *   2. Llega el webhook -> queremos drenar la cola.
   *   3. Pero si nunca habíamos creado el contacto en /customers, igual debe existir.
   *
   * @param phoneNumber número del cliente, puede venir con o sin '+'
   * @param at fecha/hora de consentimiento
   * @param userId dueño comercial / propietario del lead (MUY IMPORTANTE para asignar cuenta WA correcta)
   */
  async markOptIn(
    phoneNumber: string,
    at: Date = new Date(),
    userId?: string,
  ): Promise<Customer | null> {

    const withPlus = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const noPlus = withPlus.replace(/^\+/, '');

    const variants = [withPlus, noPlus];

    // Cierre de fuga cross-tenant: si conocemos el dueño (userId), filtramos por él
    // para no marcar opt-in / drenar la cola del cliente de OTRO tenant que tenga
    // el mismo número. Sin userId mantenemos el comportamiento legacy (mejor que
    // perder el opt-in entrante), pero el llamador debería resolver el userId.
    let customer = await this.customerRepository.findOne({
      where: userId
        ? variants.map(v => ({ phoneNumber: v, userId }))
        : variants.map(v => ({ phoneNumber: v })),
    });

    if (!customer) {
      if (!userId) {
        this.logger.warn(
          `markOptIn: Customer not found for phone ${phoneNumber} and no userId provided, cannot create.`,
        );
        return null;
      }

      customer = this.customerRepository.create({
        firstName: 'Usuario',
        lastName: 'WhatsApp',
        phoneNumber: withPlus,
        status: CustomerStatus.ACTIVE,
        optInAt: at,
        optOutAt: null,
        userId: userId,
      });

      customer = await this.customerRepository.save(customer);

      this.logger.log(
        `markOptIn: Created new customer ${customer.id} for phone ${withPlus} (userId=${userId})`,
      );

      return customer;
    }

    customer.status = CustomerStatus.ACTIVE;
    customer.optInAt = at;
    customer.optOutAt = null as any;

    customer = await this.customerRepository.save(customer);

    this.logger.log(
      `markOptIn: Customer ${customer.id} marked ACTIVE/opt-in at ${customer.optInAt}`,
    );

    return customer;
  }

  async getTagsList(userId: string): Promise<string[]> {
    try {
      this.logger.log(`[getTagsList] Fetching tags for user: ${userId}`);

      const tags = await this.customerTagRepository.find({
        where: { userId, isActive: true },
        select: ['id', 'name', 'customerCount'],
        order: { name: 'ASC' },
      });

      this.logger.log(`[getTagsList] Found ${tags.length} tags:`, tags);

      const tagNames = tags.map(tag => tag.name);
      this.logger.log(`[getTagsList] Returning tag names:`, tagNames);

      return tagNames;
    } catch (error) {
      this.logger.error('[getTagsList] Error fetching tags list:', error);
      return [];
    }
  }

  /**
   * scheduleMessagesByTags
   * - Toma todos los clientes con las etiquetas pedidas
   * - Busca una plantilla aprobada
   * - Genera mensaje personalizado (reemplaza {{firstName}}, etc.)
   * - Manda cada mensaje via MessagesService.sendMessage()
   *
   * IMPORTANTE:
   *  Ahora sí hace Promise.all(...) para enviar concurrente.
   */
  async scheduleMessagesByTags(userId: string, tags: string[]): Promise<any> {
    try {
      this.logger.log('scheduleMessagesByTags called with tags:', tags);
      const customers = await this.getByTags(userId, tags);

      if (!customers || customers.length === 0) {
        const selectedTags = tags.join(', ');
        throw new BadRequestException(
          'No se encontraron clientes con las etiquetas seleccionadas: ' + selectedTags,
        );
      }
      this.logger.log(`Found ${customers.length} customers with tags:`, tags);

      const messages = await this.messagesService.getMessageTemplates(userId);

      const messagePromises = customers.map(async customer => {
        try {
          const customerOptInStatus = this.checkOptInStatus( customer );

          // Log detallado del estado de opt-in
          this.logger.log(`📋 Customer ${customer.firstName} ${customer.lastName} (${customer.phoneNumber}): hasOptIn=${customerOptInStatus.hasOptIn}, reason=${customerOptInStatus.reason}, optInAt=${customer.optInAt}`);

          const personalizedMessages: {content: string, order: number, mediaAttachments?: any[]}[] = messages
            .map(message => ({
              content: this.replaceVariables(message.content, customer),
              order: message.order || 0,
              mediaAttachments: message.mediaAttachments,
            }))
            .sort((a, b) => a.order - b.order);
          if (customerOptInStatus.hasOptIn) {
            this.logger.log(`✅ Customer ${customer.phoneNumber} HAS valid opt-in -> sending ${personalizedMessages.length} messages directly`);

            // Limpiar cualquier mensaje pendiente antiguo para este cliente
            // Esto evita que se envíen mensajes duplicados de la cola
            const cleaned = await this.messagesService.cleanupPendingMessagesForCustomer(customer.phoneNumber, userId);
            if (cleaned > 0) {
              this.logger.log(`🧹 Se limpiaron ${cleaned} mensajes pendientes antiguos para ${customer.phoneNumber}`);
            }

            const sendMessagesDto = {
              phoneNumber: customer.phoneNumber,
              messages: personalizedMessages,
            };
            await this.messagesService.sendMessages(sendMessagesDto, userId);
          } else {
            // Cancelar pending messages anteriores de este cliente para evitar duplicados
            const cancelled = await this.messagesService.cancelPendingMessagesForRecipient(customer.phoneNumber, userId);
            if (cancelled > 0) {
              this.logger.log(`🧹 Se cancelaron ${cancelled} pending messages anteriores para ${customer.phoneNumber}`);
            }

            this.logger.log(`⚠️ Customer ${customer.phoneNumber} has NO opt-in (reason: ${customerOptInStatus.reason}) -> creating ${personalizedMessages.length} pending messages + sending opt-in template`);
            this.messagesService.createPendingMessages(personalizedMessages, customer, userId);

            // SIEMPRE enviar opt-in template cuando el cliente no tiene opt-in válido
            this.messagesService.requestAccess(customer.phoneNumber, userId, {
              firstName: customer.firstName,
              lastName: customer.lastName,
            });
          }

          return {
            customer: `${customer.firstName} ${customer.lastName}`,
            phone: customer.phoneNumber,
            status: 'queued',
            result: 'Message queued for concurrent processing',
          };
        } catch (error) {
          this.logger.error(
            'Error procesando cliente ' + customer.firstName + ' ' + customer.lastName + ':',
            error,
          );
          return {
            customer: `${customer.firstName} ${customer.lastName}`,
            phone: customer.phoneNumber,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            result: 'Failed to queue message',
          };
        }
      });

      const allResults = await Promise.all(messagePromises);

      const processedCount = allResults.filter(r => r.status === 'queued').length;
      const failedCount = allResults.filter(r => r.status === 'failed').length;

      return {
        success: true,
        message: `Mensajes programados: ${processedCount} exitosos, ${failedCount} fallidos de ${customers.length} clientes con etiquetas: ${tags.join(', ')}`,
        processed: processedCount,
        failed: failedCount,
        customers: customers.length,
        templates: 1,
        results: allResults,
      };
    } catch (error) {
      this.logger.error('Error al programar mensajes:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException('Error al programar mensajes: ' + errorMsg);
    }
  }
  checkOptInStatus(customer: Customer) {

    if (customer.status !== CustomerStatus.ACTIVE) {
      return { hasOptIn: false, customer, reason: 'inactive_customer' };
    }

    if (customer.optOutAt !== null) {
      return { hasOptIn: false, customer, reason: 'opted_out' };
    }

    if (!customer.optInAt) {
      return { hasOptIn: false, customer, reason: 'no_opt_in_timestamp' };
    }

    const now = new Date();
    const diffMs = now.getTime() - customer.optInAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours >= 24) {
      return { hasOptIn: false, customer, reason: 'opt_in_expired' };
    }

    return {
      hasOptIn: true,
      customer,
      reason: 'valid_opt_in',
    };
  }

  async scheduleMessagesByTag(tag: string): Promise<any> {

    try {
      return {
        success: true,
        message: 'Mensajes programados exitosamente para la etiqueta "' + tag + '"',
        processed: 1,
        failed: 0,
        customers: 1,
        templates: 4,
        results: [
          {
            customer: 'Steven Vanegas',
            phone: '+573991234567',
            template: 'Mensaje de Prueba',
            status: 'queued',
            result: 'Message queued for delivery to WhatsApp Business API',
          },
        ],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new BadRequestException('Error al programar mensajes: ' + errorMsg);
    }
  }

  private async assignTagsToCustomer(
    customerId: string,
    tagNames: string[],
    userId: string,
  ): Promise<void> {
    this.logger.log(`[assignTagsToCustomer] Starting for customer ${customerId} with tags:`, tagNames);

    if (!customerId) {
      throw new BadRequestException('Customer ID is required for tag assignment');
    }

    try {
      const deleteResult = await this.customerTagAssignmentRepository.delete({ customerId });
      this.logger.log(
        `[assignTagsToCustomer] Deleted ${deleteResult.affected} existing tag assignments`,
      );

      if (!tagNames || tagNames.length === 0) {
        this.logger.log('[assignTagsToCustomer] No new tags to assign');
        return;
      }

      for (const tagName of tagNames) {
        if (!tagName || tagName.trim() === '') {
          this.logger.log('[assignTagsToCustomer] Skipping empty tag name');
          continue;
        }

        let tag = await this.customerTagRepository.findOne({
          where: { name: tagName.trim(), userId },
        });

        if (!tag) {
          tag = this.customerTagRepository.create({
            name: tagName.trim(),
            userId,
            isActive: true,
            description: `Tag creada automáticamente`,
            customerCount: 0,
          });
          tag = await this.customerTagRepository.save(tag);
        }

        if (!customerId || !tag.id) {
          throw new BadRequestException(
            `Invalid IDs for assignment: customerId=${customerId}, tagId=${tag.id}`,
          );
        }

        const assignment = this.customerTagAssignmentRepository.create({
          customerId: customerId,
          tagId: tag.id,
          assignedAt: new Date(),
        });

        await this.customerTagAssignmentRepository.save(assignment);

        tag.customerCount = (tag.customerCount || 0) + 1;
        await this.customerTagRepository.save(tag);
      }

      this.logger.log('[assignTagsToCustomer] Completed successfully');
    } catch (error) {
      this.logger.error('[assignTagsToCustomer] Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Error al asignar etiquetas: ${errorMessage}`);
    }
  }

  private deepGet(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
  }

  /**
   * Reemplaza tokens tipo {{firstName}}, {{customer.customFields.company}}, etc.
   * Se usa antes de mandar mensajes personalizados.
   */
  private replaceVariables(
    content: string,
    customer: Customer,
    extra: Record<string, any> = {},
  ): string {
    if (!content) return content;

    // Formatear lastContactAt como fecha legible
    let lastContactStr = '';
    if (customer.lastContactAt) {
      try {
        lastContactStr = new Date(customer.lastContactAt).toLocaleDateString('es-CO');
      } catch { lastContactStr = ''; }
    }

    // Obtener tags como string
    let tagsStr = '';
    try {
      if (customer.tagAssignments && customer.tagAssignments.length > 0) {
        tagsStr = customer.tagAssignments.map(ta => ta.tag?.name).filter(Boolean).join(', ');
      }
    } catch { tagsStr = ''; }

    const ctx = {
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      fullName: `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim(),
      email: customer.email || '',
      phoneNumber: customer.phoneNumber || '',
      companyName: customer.customFields?.company || customer.customFields?.companyName || '',
      title: customer.customFields?.title || '',
      lastContact: lastContactStr,
      campaign: customer.customFields?.campaign || '',
      note: customer.notes || '',
      label: tagsStr,
      data1: customer.customFields?.data1 || '',
      data2: customer.customFields?.data2 || '',
      data3: customer.customFields?.data3 || '',
      customer,
      ...extra,
    };

    return content.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
      const val = this.deepGet(ctx, key);
      return val == null ? '' : String(val);
    });
  }
}

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../auth/entities/user.entity';
import { Payment, PaymentStatus, PaymentProvider } from './entities/payment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { MessageLog, MessageDirection } from '../messages/entities/message-log.entity';
import { MercadoPagoGateway } from 'prizma-payments';
import { EVENTS } from 'prizma-contracts';
import { PrizmaHubService } from '../prizma/prizma-hub.service';
import { FREE_PLAN_LIMITS } from '../customers/customers.service';

export interface CreatePreferenceDto {
  planType: string;
  periodicity?: string;
}

interface PlanConfig {
  title: string;
  description: string;
  price: number;
  currency: string;
  role: UserRole;
}

/** URL del webhook único del Hub al que MP enviará todas las notificaciones. */
const HUB_MP_WEBHOOK_URL =
  process.env.PRIZMA_HUB_WEBHOOK_URL ||
  'https://prizma-nous-578238159459.us-central1.run.app/webhooks/mercadopago';

/**
 * Construye el externalReference canónico de Iris según el contrato
 * PAYMENTS_MIGRATION.md (Apéndice A): `<producto>:<kind>:<id>`.
 *
 * `iris:plan:<userId>` — El Hub lo parsea como:
 *   producto = "iris", kind = "plan", id = userId
 */
function buildExternalRef(userId: string, planKey: string): string {
  return `iris:plan:${userId}:${planKey}`;
}

/**
 * Mapeo de estados MP → PaymentStatus local.
 * Se aplica tanto al webhook directo (legado local) como al evento del Hub.
 */
const STATUS_MAP: Record<string, PaymentStatus> = {
  approved: PaymentStatus.APPROVED,
  rejected: PaymentStatus.REJECTED,
  cancelled: PaymentStatus.CANCELLED,
  refunded: PaymentStatus.REFUNDED,
  in_process: PaymentStatus.IN_PROCESS,
  pending: PaymentStatus.PENDING,
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  /**
   * Gateway de Mercado Pago (prizma-payments).
   * Instanciación LAZY: el constructor NO lanza si faltan credenciales.
   * La app arranca siempre; la validación de token ocurre solo al cobrar.
   */
  private readonly gateway: MercadoPagoGateway;

  private readonly plans: Record<string, PlanConfig> = {
    premium_monthly: {
      title: 'Plan Especial Iris - Mensual',
      description: 'Acceso completo a todas las funcionalidades premium de Iris por 1 mes',
      price: 88000,
      currency: 'COP',
      role: UserRole.PREMIUM,
    },
    premium_annual: {
      title: 'Plan Especial Iris - Anual',
      description: 'Acceso completo a todas las funcionalidades premium de Iris por 1 año (20% descuento)',
      price: 844800, // 88000 * 12 * 0.8
      currency: 'COP',
      role: UserRole.PREMIUM,
    },
  };

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(MessageLog)
    private messageLogRepository: Repository<MessageLog>,
    private configService: ConfigService,
    private readonly prizmaHub: PrizmaHubService,
  ) {
    // Gateway lazy: lee MP_ACCESS_TOKEN / MP_WEBHOOK_SECRET desde env.
    // Si aún no están cargados el boot NO falla; la primera llamada a cobrar sí.
    this.gateway = new MercadoPagoGateway();

    if (this.gateway.isConfigured()) {
      this.logger.log('MercadoPagoGateway (prizma-payments) initialized');
    } else {
      this.logger.warn(
        'MP_ACCESS_TOKEN not configured — payments will fail at runtime, but boot is OK',
      );
    }
  }

  async createPreference(dto: CreatePreferenceDto, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const planKey = `${dto.planType}_${dto.periodicity || 'monthly'}`;
    const plan = this.plans[planKey];
    if (!plan) {
      throw new BadRequestException(`Invalid plan: ${planKey}`);
    }

    const externalReference = buildExternalRef(userId, planKey);
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://emw.humanizar.cloud';

    try {
      const result = await this.gateway.createCheckout({
        items: [
          {
            id: planKey,
            title: plan.title,
            description: plan.description,
            quantity: 1,
            unit_price: plan.price,
            currency_id: plan.currency,
          },
        ],
        payer: {
          email: user.email,
          name: user.firstName,
          surname: user.lastName,
        },
        externalReference,
        notification_url: HUB_MP_WEBHOOK_URL,
        back_urls: {
          success: `${frontendUrl}/plans?status=approved`,
          failure: `${frontendUrl}/plans?status=rejected`,
          pending: `${frontendUrl}/plans?status=pending`,
        },
        auto_return: 'approved',
        statement_descriptor: 'Iris Premium',
        binary_mode: false,
      });

      // Guardar el registro de pago en DB
      const payment = this.paymentRepository.create({
        preferenceId: result.id,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.MERCADOPAGO,
        amount: plan.price,
        currency: plan.currency,
        planType: dto.planType,
        planPeriodicity: dto.periodicity || 'monthly',
        externalReference,
        payerEmail: user.email,
        userId,
      });

      await this.paymentRepository.save(payment);

      // Publicar evento pago.iniciado en el Hub (best-effort)
      await this.prizmaHub.publish(EVENTS.PAGO_INICIADO, {
        paymentRef: payment.id,
        gateway: 'mercadopago',
        tipo: 'checkout',
        monto: plan.price,
        moneda: plan.currency,
        externalReference,
        preferenceId: result.id,
      });

      this.logger.log(`Preference created: ${result.id} for user ${userId}, externalRef=${externalReference}`);

      return {
        preferenceId: result.id,
        initPoint: result.init_point,
        sandboxInitPoint: result.sandbox_init_point,
      };
    } catch (error: any) {
      this.logger.error(`Error creating preference: ${error.message}`, error.stack);
      throw new BadRequestException(`Error creating payment preference: ${error.message}`);
    }
  }

  /**
   * handleWebhook — procesamiento del webhook directo de MP.
   * En la arquitectura objetivo el Hub recibe los webhooks y nos entrega
   * eventos vía `handleHubPaymentEvent`. Este endpoint queda como fallback
   * por si el Hub aún no está en producción para Iris.
   */
  async handleWebhook(body: any) {
    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);

    if (body.type === 'payment') {
      const paymentId = body.data?.id;
      if (!paymentId) {
        this.logger.warn('Webhook received without payment ID');
        return { received: true };
      }

      try {
        const mpPayment = await this.gateway.getPayment(String(paymentId));

        this.logger.log(
          `MP Payment ${paymentId}: status=${mpPayment.status}, external_ref=${mpPayment.external_reference}`,
        );

        // Buscar el pago local por external_reference
        const localPayment = await this.paymentRepository.findOne({
          where: { externalReference: mpPayment.external_reference },
        });

        if (!localPayment) {
          this.logger.warn(
            `No local payment found for external_reference: ${mpPayment.external_reference}`,
          );
          return { received: true };
        }

        // Guard de idempotencia: verificar si ya estaba approved ANTES de actualizar
        const wasAlreadyApproved = localPayment.status === PaymentStatus.APPROVED;

        localPayment.mpPaymentId = String(paymentId);
        localPayment.status = STATUS_MAP[mpPayment.status] || PaymentStatus.PENDING;
        localPayment.mpResponse = mpPayment.raw as Record<string, any>;

        await this.paymentRepository.save(localPayment);

        // Si el pago fue aprobado y no era ya approved (idempotencia), actualizar usuario
        if (mpPayment.status === 'approved' && !wasAlreadyApproved) {
          await this._upgradeUserToPremium(localPayment);

          // Publicar evento pago.aprobado al Hub (best-effort)
          await this.prizmaHub.publish(EVENTS.PAGO_APROBADO, {
            paymentRef: localPayment.id,
            gateway: 'mercadopago',
            monto: localPayment.amount,
            moneda: localPayment.currency,
            externalReference: localPayment.externalReference,
            mpPaymentId: String(paymentId),
            status: mpPayment.status,
          });
        }
      } catch (error: any) {
        this.logger.error(
          `Error processing webhook for payment ${paymentId}: ${error.message}`,
          error.stack,
        );
      }
    }

    return { received: true };
  }

  /**
   * handleHubPaymentEvent — receptor del evento que el Hub entrega a Iris
   * tras procesar un webhook de MP.
   *
   * Endpoint: POST /api/webhooks/payments
   * Headers: x-prizma-event (eventType), x-prizma-signature
   * Body: { eventType, paymentRef, externalReference, mpPaymentId?, ... }
   *
   * Ver PAYMENTS_MIGRATION.md §Apéndice A.
   */
  async handleHubPaymentEvent(eventType: string, payload: Record<string, any>) {
    this.logger.log(`Hub payment event: ${eventType} — ${JSON.stringify(payload)}`);

    if (eventType === EVENTS.PAGO_APROBADO) {
      const { externalReference, mpPaymentId } = payload;
      if (!externalReference) {
        this.logger.warn('Hub event pago.aprobado sin externalReference');
        return;
      }

      const localPayment = await this.paymentRepository.findOne({
        where: { externalReference },
      });

      if (!localPayment) {
        this.logger.warn(`No local payment for externalRef: ${externalReference}`);
        return;
      }

      // Idempotencia: no acreditar dos veces
      if (localPayment.status === PaymentStatus.APPROVED) {
        this.logger.log(`Payment ${localPayment.id} ya aprobado (idempotencia Hub)`);
        return;
      }

      if (mpPaymentId) {
        localPayment.mpPaymentId = String(mpPaymentId);
      }
      localPayment.status = PaymentStatus.APPROVED;
      await this.paymentRepository.save(localPayment);

      await this._upgradeUserToPremium(localPayment);
    } else if (eventType === EVENTS.PAGO_RECHAZADO) {
      const { externalReference } = payload;
      if (!externalReference) return;

      const localPayment = await this.paymentRepository.findOne({
        where: { externalReference },
      });
      if (localPayment && localPayment.status === PaymentStatus.PENDING) {
        localPayment.status = PaymentStatus.REJECTED;
        await this.paymentRepository.save(localPayment);
        this.logger.log(`Payment ${localPayment.id} marcado como REJECTED por Hub`);
      }
    }
    // Eventos de suscripción reservados para futura implementación de PreApproval
  }

  /**
   * Lógica de negocio: actualizar usuario a PREMIUM tras pago aprobado.
   * Incluye cálculo de expiración y extensión de suscripción activa.
   */
  private async _upgradeUserToPremium(localPayment: Payment) {
    const user = await this.userRepository.findOne({ where: { id: localPayment.userId } });
    if (!user) return;

    user.role = UserRole.PREMIUM;
    user.credits = localPayment.amount;

    const now = new Date();
    const baseDate =
      user.subscriptionExpiresAt && user.subscriptionExpiresAt > now
        ? user.subscriptionExpiresAt
        : now;
    const periodicity = localPayment.planPeriodicity || 'monthly';

    if (periodicity === 'annual') {
      user.subscriptionExpiresAt = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    } else {
      user.subscriptionExpiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    this.logger.log(
      `Subscription extended from ${baseDate.toISOString()} to ${user.subscriptionExpiresAt.toISOString()}`,
    );
    user.subscriptionPlanType = periodicity;
    user.subscriptionCancelledAt = null;

    await this.userRepository.save(user);
    this.logger.log(
      `User ${user.id} upgraded to PREMIUM (${periodicity}), expires at ${user.subscriptionExpiresAt.toISOString()}`,
    );
  }

  async getPaymentStatus(preferenceId: string, userId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { preferenceId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      planType: payment.planType,
      createdAt: payment.createdAt,
    };
  }

  async getPaymentHistory(userId: string) {
    const payments = await this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return payments.map(p => ({
      id: p.id,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      planType: p.planType,
      planPeriodicity: p.planPeriodicity,
      createdAt: p.createdAt,
      mpPaymentId: p.mpPaymentId,
    }));
  }

  // Legacy methods (mantener compatibilidad)
  async processPayment(details: any, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const paymentResult = {
      transactionId: `txn_${Date.now()}`,
      status: 'completed',
      amount: details.amount || 0,
      currency: details.currency || 'COP',
      userId: userId,
      timestamp: new Date().toISOString(),
    };

    if (details.amount > 0) {
      user.credits = Number(user.credits) + details.amount * 100;
      if (details.planType === 'premium') {
        user.role = UserRole.PREMIUM;
      }
      await this.userRepository.save(user);
    }

    return {
      success: true,
      transaction: paymentResult,
      user: {
        id: user.id,
        credits: user.credits,
        role: user.role,
      },
    };
  }

  async validatePayment(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verificar último pago aprobado
    const lastApprovedPayment = await this.paymentRepository.findOne({
      where: { userId, status: PaymentStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });

    return {
      valid: true,
      userId: userId,
      credits: user.credits,
      role: user.role,
      status: user.status,
      lastPayment: lastApprovedPayment
        ? {
            id: lastApprovedPayment.id,
            amount: lastApprovedPayment.amount,
            date: lastApprovedPayment.createdAt,
            planType: lastApprovedPayment.planType,
          }
        : null,
      timestamp: new Date().toISOString(),
    };
  }

  async cancelSubscription(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.PREMIUM) {
      // Si tiene fecha de expiración, marcar como cancelada pero mantener activo hasta que expire
      if (user.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()) {
        user.subscriptionCancelledAt = new Date();
        await this.userRepository.save(user);

        const daysRemaining = Math.ceil(
          (user.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        return {
          success: true,
          message: `Suscripción cancelada. Tu plan premium seguirá activo hasta el ${user.subscriptionExpiresAt.toLocaleDateString('es-CO')}.`,
          userId,
          newRole: user.role,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
          daysRemaining,
          timestamp: new Date().toISOString(),
        };
      }

      // Si no tiene fecha de expiración (legacy), degradar inmediatamente
      user.role = UserRole.USER;
      user.subscriptionCancelledAt = new Date();
      user.subscriptionExpiresAt = null;
      user.subscriptionPlanType = null;
      await this.userRepository.save(user);
    }

    return {
      success: true,
      message: 'Suscripción cancelada exitosamente.',
      userId,
      newRole: user.role,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Devuelve los límites y uso actual del plan del usuario.
   */
  async getUsageLimits(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isPremium = user.role === UserRole.PREMIUM || user.role === UserRole.ADMIN;

    // Contar clientes
    const customerCount = await this.customerRepository.count({ where: { userId } });

    // Contar mensajes enviados hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messagesToday = await this.messageLogRepository
      .createQueryBuilder('msg')
      .where('msg.userId = :userId', { userId })
      .andWhere('msg.direction = :direction', { direction: MessageDirection.OUTBOUND })
      .andWhere('msg.createdAt >= :today', { today })
      .getCount();

    return {
      plan: isPremium ? 'premium' : 'free',
      role: user.role,
      customers: {
        current: customerCount,
        max: isPremium ? null : FREE_PLAN_LIMITS.MAX_CUSTOMERS,
        remaining: isPremium ? null : Math.max(0, FREE_PLAN_LIMITS.MAX_CUSTOMERS - customerCount),
      },
      messagesPerDay: {
        sent: messagesToday,
        max: isPremium ? null : FREE_PLAN_LIMITS.MAX_MESSAGES_PER_DAY,
        remaining: isPremium
          ? null
          : Math.max(0, FREE_PLAN_LIMITS.MAX_MESSAGES_PER_DAY - messagesToday),
      },
      bulkRecipients: {
        max: isPremium ? null : FREE_PLAN_LIMITS.MAX_BULK_RECIPIENTS,
      },
      features: {
        unlimitedCustomers: isPremium,
        unlimitedMessages: isPremium,
        unlimitedBulk: isPremium,
        prioritySupport: isPremium,
        fasterDelivery: isPremium,
      },
    };
  }

  // ─── Estado de suscripción ───

  async getSubscriptionStatus(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isPremium = user.role === UserRole.PREMIUM;
    const isCancelled = !!user.subscriptionCancelledAt;
    const expiresAt = user.subscriptionExpiresAt;
    const now = new Date();

    let daysRemaining: number | null = null;
    let isExpired = false;

    if (expiresAt) {
      daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      isExpired = daysRemaining <= 0;
    }

    // Último pago aprobado
    const lastPayment = await this.paymentRepository.findOne({
      where: { userId, status: PaymentStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });

    return {
      isPremium,
      plan: isPremium ? user.subscriptionPlanType || 'monthly' : 'free',
      subscriptionExpiresAt: expiresAt,
      daysRemaining: isPremium ? daysRemaining : null,
      isCancelled,
      cancelledAt: user.subscriptionCancelledAt,
      isExpired,
      willRenew: isPremium && !isCancelled,
      lastPayment: lastPayment
        ? {
            amount: lastPayment.amount,
            currency: lastPayment.currency,
            date: lastPayment.createdAt,
            periodicity: lastPayment.planPeriodicity,
          }
        : null,
    };
  }

  // ─── Verificar suscripciones expiradas (llamado por Cloud Scheduler) ───

  async handleExpiredSubscriptions() {
    const now = new Date();

    const expiredUsers = await this.userRepository.find({
      where: {
        role: UserRole.PREMIUM,
        subscriptionExpiresAt: LessThanOrEqual(now),
      },
    });

    if (expiredUsers.length === 0) return;

    this.logger.log(`Found ${expiredUsers.length} expired premium subscriptions`);

    for (const user of expiredUsers) {
      user.role = UserRole.USER;
      user.subscriptionPlanType = null;
      await this.userRepository.save(user);
      this.logger.log(
        `User ${user.id} (${user.email}) downgraded to USER - subscription expired at ${user.subscriptionExpiresAt?.toISOString()}`,
      );
    }

    this.logger.log(`Processed ${expiredUsers.length} expired subscriptions`);
  }
}

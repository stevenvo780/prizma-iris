import { Injectable, NotFoundException, BadRequestException, Logger, ConflictException, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, QueryFailedError } from 'typeorm';
import { WhatsAppAccount, AccountStatus, AccountType } from './entities/whatsapp-account.entity';
import { WhatsAppValidatorService } from './services/whatsapp-validator.service';
import axios from 'axios';

export interface CreateAccountDto {
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  appSecret?: string; // App Secret de Meta para validar webhooks
  type: AccountType;
  webhookConfig?: {
    url: string;
    verifyToken: string;
    fields: string[];
  };
}

export interface UpdateAccountDto extends Partial<CreateAccountDto> {
  status?: AccountStatus;
  isActive?: boolean;
}

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  private readonly GRAPH_API_URL = process.env.WHATSAPP_API_BASE_URL;
  constructor(
    @InjectRepository(WhatsAppAccount)
    private accountRepository: Repository<WhatsAppAccount>,
    private whatsappValidator: WhatsAppValidatorService,
  ) { }

  async create(createAccountDto: CreateAccountDto, userId: string): Promise<WhatsAppAccount> {

    if (process.env.NODE_ENV === 'development') {
      this.logger.warn('🔧 Development mode: Skipping WhatsApp credential validation');
    } else {
      this.logger.log('🔐 Validando credenciales de WhatsApp antes de guardar...');

      const validationResult = await this.whatsappValidator.validateWhatsAppAccount({
        accessToken: createAccountDto.accessToken,
        phoneNumberId: createAccountDto.phoneNumberId,
        businessAccountId: createAccountDto.businessAccountId,
      });

      if (!validationResult.valid) {
        throw new BadRequestException(
          validationResult.errorMessage || 'Las credenciales de WhatsApp no son válidas'
        );
      }

      this.logger.log('✅ Credenciales validadas exitosamente:', {
        phoneNumberId: validationResult.phoneNumberId,
        businessAccountId: validationResult.businessAccountId,
        accountName: validationResult.accountName,
        permissions: validationResult.permissions,
      });
    }

    const existingAccount = await this.accountRepository.findOne({
      where: { phoneNumberId: createAccountDto.phoneNumberId },
    });

    if (existingAccount) {

      if (existingAccount.userId === userId) {
        throw new BadRequestException(
          `Ya tienes una cuenta con este Phone Number ID. Puedes actualizarla desde la lista de cuentas.`
        );
      } else {

        throw new BadRequestException(
          'Este Phone Number ID ya está en uso. Los Phone Number IDs de WhatsApp Business deben ser únicos.'
        );
      }
    }

    let accountStatus = AccountStatus.PENDING;
    let verifiedAt: Date | null = null;

    if (process.env.NODE_ENV === 'development') {
      accountStatus = AccountStatus.ACTIVE;
      verifiedAt = new Date();
      this.logger.warn('🔧 Development mode: Auto-activating account');
    } else {
      try {
        const isValid = await this.verifyAccount(createAccountDto);
        if (isValid) {
          accountStatus = AccountStatus.ACTIVE;
          verifiedAt = new Date();
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          'Account verification failed, creating account with pending status:',
          errorMsg,
        );
      }
    }

    const account = this.accountRepository.create({
      ...createAccountDto,
      userId,
      status: accountStatus,
      verifiedAt,
      lastActiveAt: new Date(),
    });

    const savedAccount = await this.accountRepository.save(account);

    const userAccountsCount = await this.accountRepository.count({ where: { userId } });
    if (userAccountsCount === 1) {
      await this.setActiveAccount(savedAccount.id, userId);
    }

    return savedAccount;
  }

  async findAll(userId: string): Promise<WhatsAppAccount[]> {
    return this.accountRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<WhatsAppAccount> {
    const account = await this.accountRepository.findOne({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    userId: string,
  ): Promise<WhatsAppAccount> {
    const account = await this.findOne(id, userId);

    const validationMode = (process.env.WHATSAPP_VALIDATION_MODE as any) || 'strict';
    const shouldVerify = validationMode !== 'off' && (updateAccountDto.accessToken || updateAccountDto.phoneNumberId);

    if (shouldVerify) {
      const verificationData = {
        ...account,
        ...updateAccountDto,
      } as { phoneNumberId: string; accessToken: string; businessAccountId: string };

      const isValid = await this.verifyAccount(verificationData);
      if (!isValid) {
        throw new BadRequestException('Invalid WhatsApp Business account credentials');
      }
    }

    Object.assign(account, updateAccountDto);
    account.lastActiveAt = new Date();

    return this.accountRepository.save(account);
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const account = await this.findOne(id, userId);

      if (account.isActive) {
        const otherAccounts = await this.accountRepository.find({
          where: { userId, id: Not(id) },
          order: { createdAt: 'DESC' },
        });

        if (otherAccounts.length > 0) {
          otherAccounts[0].isActive = true;
          await this.accountRepository.save(otherAccounts[0]);
        }
      }

      await this.accountRepository.softDelete(account);
      this.logger.log(`Account ID: ${id} deleted successfully for user ID: ${userId}`);
    } catch (error: Error | any) {
      if (error instanceof QueryFailedError) {
        if (error.message.includes('foreign key constraint')) {
          this.logger.error('Conflict error during account deletion:', error.message || error);
          throw new ConflictException('Failed to delete account. It may be linked to other records.');
        }
        this.logger.error(`Database error during account deletion: ${error.message || error}`);
        throw new BadRequestException('Database error occurred while deleting the account.');
      }
      throw error;
    }
  }

  async deactivateAccount(id: string, userId: string): Promise<WhatsAppAccount> {
    const account = await this.findOne(id, userId);
    account.isActive = false;
    account.status = AccountStatus.INACTIVE;
    account.lastActiveAt = new Date();

    return this.accountRepository.save(account);
  }

  async setActiveAccount(id: string, userId: string): Promise<WhatsAppAccount> {
    await this.accountRepository.update({ userId }, { isActive: false });

    const account = await this.findOne(id, userId);
    account.isActive = true;
    account.status = AccountStatus.ACTIVE;
    account.lastActiveAt = new Date();

    return this.accountRepository.save(account);
  }

  async getActiveAccount(userId: string): Promise<WhatsAppAccount | null> {
    return this.accountRepository.findOne({
      where: { userId, isActive: true },
    });
  }

  async testConnection(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    const account = await this.findOne(id, userId);

    try {
      const response = await axios.get(
        `${this.GRAPH_API_URL}/${account.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
          },
        },
      );

      account.lastActiveAt = new Date();
      await this.accountRepository.save(account);

      return {
        success: true,
        message: 'Connection successful',
        details: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Connection failed',
        details: error.response?.data || error.message,
      };
    }
  }

  private async verifyAccount(accountData: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
  }): Promise<boolean> {
    try {
      const phoneResponse = await axios.get(
        `${this.GRAPH_API_URL}/${accountData.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${accountData.accessToken}`,
          },
        },
      );

      const businessResponse = await axios.get(
        `${this.GRAPH_API_URL}/${accountData.businessAccountId}/phone_numbers`,
        {
          headers: {
            Authorization: `Bearer ${accountData.accessToken}`,
          },
        },
      );

      const phoneNumbers = businessResponse.data.data;
      const hasAccess = phoneNumbers.some((phone: any) => phone.id === accountData.phoneNumberId);

      return hasAccess;
    } catch (error: Error | any) {
      this.logger.error(`Account verification failed: ${error.message || error}`);
      throw new BadRequestException(
        'Failed to verify WhatsApp Business account. Please check your credentials and ensure they are valid.',
      );
    }
  }

  async getAccountStats(
    id: string,
    userId: string,
  ): Promise<{
    messagesThisMonth: number;
    conversationsThisMonth: number;
    lastActivity: Date | null;
    status: AccountStatus;
  }> {
    const account = await this.findOne(id, userId);

    return {
      messagesThisMonth: 0,
      conversationsThisMonth: 0,
      lastActivity: account.lastActiveAt,
      status: account.status,
    };
  }

  async refreshAccountInfo(id: string, userId: string): Promise<WhatsAppAccount> {
    const account = await this.findOne(id, userId);

    try {
      const response = await axios.get(
        `${this.GRAPH_API_URL}/${account.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
          },
          params: {
            fields: 'display_phone_number,verified_name,status',
          },
        },
      );

      const data = response.data;

      if (data.display_phone_number) {
        account.phoneNumber = data.display_phone_number;
      }

      if (data.verified_name) {
        account.name = data.verified_name;
      }

      account.lastActiveAt = new Date();

      return this.accountRepository.save(account);
    } catch (error) {
      this.logger.error('Failed to refresh account info:', error);
      throw new BadRequestException('Failed to refresh account information');
    }
  }
}

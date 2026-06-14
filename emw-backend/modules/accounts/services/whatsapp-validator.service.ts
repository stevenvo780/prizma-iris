import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';

export interface WhatsAppTokenValidationResult {
  valid: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  accountName?: string;
  errorMessage?: string;
  permissions?: string[];
}

@Injectable()
export class WhatsAppValidatorService {
  private readonly logger = new Logger(WhatsAppValidatorService.name);
  private readonly GRAPH_API_URL = process.env.WHATSAPP_API_BASE_URL;

  private readonly VALIDATION_MODE: 'strict' | 'relaxed' | 'off' =
    (process.env.WHATSAPP_VALIDATION_MODE as any) || 'strict';

  /**
   * Valida un access token de WhatsApp Business API
   * Verifica que el token tenga los permisos necesarios y sea válido
   */
  async validateAccessToken(accessToken: string): Promise<WhatsAppTokenValidationResult> {

    if (this.VALIDATION_MODE === 'off') {
      return {
        valid: true,
        permissions: ['whatsapp_business_management', 'whatsapp_business_messaging'],
      };
    }
    if (!accessToken || accessToken.trim() === '') {
      throw new BadRequestException('El access token no puede estar vacío');
    }

    if (accessToken.length < 20) {
      throw new BadRequestException('El access token parece ser inválido (muy corto)');
    }

    try {

      const debugResponse = await axios.get(`${this.GRAPH_API_URL}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: accessToken,
        },
      }).catch(error => {
        this.logger.error('Error validando token:', error.response?.data || error.message);
        if (this.VALIDATION_MODE === 'relaxed') {

          return { data: { data: null } } as any;
        }
        throw new BadRequestException(
          `Token inválido: ${error.response?.data?.error?.message || 'No se pudo validar el token'}`
        );
      });

      const tokenData = debugResponse.data?.data;

      if (!tokenData || tokenData.error) {
        if (this.VALIDATION_MODE === 'relaxed') {
          return { valid: false, errorMessage: tokenData?.error?.message || 'Token no reconocido' };
        }
        throw new BadRequestException(
          `Token inválido: ${tokenData?.error?.message || 'Token no reconocido'}`
        );
      }

      if (tokenData.expires_at && tokenData.expires_at > 0) {
        const expiresAt = new Date(tokenData.expires_at * 1000);
        if (expiresAt < new Date()) {
          if (this.VALIDATION_MODE === 'relaxed') {
            return { valid: false, errorMessage: 'El token ha expirado' };
          }
          throw new BadRequestException('El token ha expirado');
        }
      }

      const requiredPermissions = [
        'whatsapp_business_management',
        'whatsapp_business_messaging',
      ];

      const scopes = tokenData.scopes || [];
      const missingPermissions = requiredPermissions.filter(perm => !scopes.includes(perm));

      if (missingPermissions.length > 0) {
        if (this.VALIDATION_MODE === 'relaxed') {
          this.logger.warn(
            `⚠️ Validación relajada: faltan permisos en el token: ${missingPermissions.join(', ')}`
          );
        } else {
          throw new BadRequestException(
            `El token no tiene los permisos necesarios: ${missingPermissions.join(', ')}`
          );
        }
      }

      let phoneNumberId: string | undefined;
      let businessAccountId: string | undefined;
      let accountName: string | undefined;

      if (tokenData.profile_id) {
        try {
          const profileResponse = await axios.get(
            `${this.GRAPH_API_URL}/${tokenData.profile_id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: { fields: 'id,display_phone_number,verified_name' },
            }
          );

          phoneNumberId = profileResponse.data?.id;
          accountName = profileResponse.data?.verified_name || profileResponse.data?.display_phone_number;
        } catch (error) {
          this.logger.warn('No se pudo obtener información del perfil:', error);
        }
      }

      try {
        const meResponse = await axios.get(`${this.GRAPH_API_URL}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'id,name' },
        });

        businessAccountId = meResponse.data?.id;
        if (!accountName) {
          accountName = meResponse.data?.name;
        }
      } catch (error) {
        this.logger.warn('No se pudo obtener información de la cuenta:', error);
      }

      return {
        valid: true,
        phoneNumberId,
        businessAccountId,
        accountName,
        permissions: scopes,
      };
    } catch (error: any) {
      if (this.VALIDATION_MODE === 'relaxed') {
        this.logger.warn('⚠️ Validación relajada: error inesperado validando token:', error?.message || error);
        return { valid: false, errorMessage: error?.message || 'Error validando token' };
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error('Error inesperado validando token:', error);
      throw new BadRequestException(
        'Error al validar el token de WhatsApp. Verifica tu conexión y que el token sea correcto.'
      );
    }
  }

  /**
   * Valida un phone number ID de WhatsApp
   */
  async validatePhoneNumberId(phoneNumberId: string, accessToken: string): Promise<boolean> {

    if (this.VALIDATION_MODE === 'off') {
      return true;
    }
    if (!phoneNumberId || phoneNumberId.trim() === '') {
      throw new BadRequestException('El phone number ID no puede estar vacío');
    }

    try {
      const response = await axios.get(
        `${this.GRAPH_API_URL}/${phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { fields: 'id,display_phone_number,verified_name,code_verification_status' },
        }
      );

      if (!response.data || !response.data.id) {
        if (this.VALIDATION_MODE === 'relaxed') {
          this.logger.warn('⚠️ Validación relajada: phone number ID no encontrado, continuando.');
          return true;
        }
        throw new BadRequestException('Phone number ID inválido o no encontrado');
      }

      if (response.data.code_verification_status !== 'VERIFIED') {
        this.logger.warn(`Phone number ${phoneNumberId} no está verificado: ${response.data.code_verification_status}`);
      }

      return true;
    } catch (error: any) {
      if (this.VALIDATION_MODE === 'relaxed') {
        this.logger.warn(
          `⚠️ Validación relajada: error validando phone number ID: ${error.response?.data?.error?.message || error.message}`
        );
        return true;
      }

      if (error.response?.status === 404) {
        throw new BadRequestException('Phone number ID no encontrado');
      }

      if (error.response?.status === 403) {
        throw new BadRequestException('No tienes permisos para acceder a este phone number ID');
      }

      throw new BadRequestException(
        `Error al validar phone number ID: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Valida un business account ID de WhatsApp
   */
  async validateBusinessAccountId(businessAccountId: string, accessToken: string): Promise<boolean> {

    if (this.VALIDATION_MODE === 'off') {
      return true;
    }
    if (!businessAccountId || businessAccountId.trim() === '') {
      throw new BadRequestException('El business account ID no puede estar vacío');
    }

    try {
      const response = await axios.get(
        `${this.GRAPH_API_URL}/${businessAccountId}/phone_numbers`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { limit: 1 },
        }
      );

      if (!response.data) {
        if (this.VALIDATION_MODE === 'relaxed') {
          this.logger.warn('⚠️ Validación relajada: business account ID inválido, continuando.');
          return true;
        }
        throw new BadRequestException('Business account ID inválido');
      }

      return true;
    } catch (error: any) {
      if (this.VALIDATION_MODE === 'relaxed') {
        this.logger.warn(
          `⚠️ Validación relajada: error validando business account ID: ${error.response?.data?.error?.message || error.message}`
        );
        return true;
      }

      if (error.response?.status === 404) {
        throw new BadRequestException('Business account ID no encontrado');
      }

      if (error.response?.status === 403) {
        throw new BadRequestException('No tienes permisos para acceder a este business account ID');
      }

      throw new BadRequestException(
        `Error al validar business account ID: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Valida todos los campos de una cuenta de WhatsApp antes de guardar
   */
  async validateWhatsAppAccount(data: {
    accessToken: string;
    phoneNumberId?: string;
    businessAccountId?: string;
  }): Promise<WhatsAppTokenValidationResult> {

    if (this.VALIDATION_MODE === 'off') {
      return {
        valid: true,
        phoneNumberId: data.phoneNumberId,
        businessAccountId: data.businessAccountId,
        permissions: ['whatsapp_business_management', 'whatsapp_business_messaging'],
      };
    }

    const tokenValidation = await this.validateAccessToken(data.accessToken);

    if (!tokenValidation.valid) {
      if (this.VALIDATION_MODE === 'relaxed') {
        this.logger.warn(`⚠️ Validación relajada: token inválido: ${tokenValidation.errorMessage}`);
      } else {
        throw new BadRequestException(tokenValidation.errorMessage || 'Token inválido');
      }
    }

    if (data.phoneNumberId) {
      try {
        await this.validatePhoneNumberId(data.phoneNumberId, data.accessToken);
      } catch (err) {
        if (this.VALIDATION_MODE === 'relaxed') {
          this.logger.warn(`⚠️ Validación relajada: error validando phone number ID: ${String(err)}`);
        } else {
          throw err;
        }
      }
      tokenValidation.phoneNumberId = data.phoneNumberId;
    }

    if (data.businessAccountId) {
      try {
        await this.validateBusinessAccountId(data.businessAccountId, data.accessToken);
      } catch (err) {
        if (this.VALIDATION_MODE === 'relaxed') {
          this.logger.warn(`⚠️ Validación relajada: error validando business account ID: ${String(err)}`);
        } else {
          throw err;
        }
      }
      tokenValidation.businessAccountId = data.businessAccountId;
    }

    return tokenValidation;
  }
}

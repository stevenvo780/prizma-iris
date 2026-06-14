import { AxiosError } from 'axios';

export interface ErrorDetails {
  code: string;
  message: string;
  details?: string;
  field?: string;
  statusCode?: number;
}

export interface ParsedError {
  userMessage: string;
  technicalMessage: string;
  errorCode?: string;
  statusCode?: number;
  retryable: boolean;
}

/**
 * Parsea errores del backend y proporciona mensajes user-friendly
 */
export const parseError = (error: any): ParsedError => {

  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      userMessage: 'La operación tardó demasiado tiempo. Por favor, intenta nuevamente.',
      technicalMessage: `Network timeout: ${error.message}`,
      errorCode: 'TIMEOUT',
      statusCode: 0,
      retryable: true,
    };
  }

  if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
    return {
      userMessage: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
      technicalMessage: `Connection error: ${error.code} - ${error.message}`,
      errorCode: 'CONNECTION_ERROR',
      statusCode: 0,
      retryable: true,
    };
  }

  if (error?.isAxiosError || error?.response) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    switch (status) {
      case 400:
        return {
          userMessage: responseData?.message || 'Los datos enviados no son válidos.',
          technicalMessage: `Bad Request: ${responseData?.message || axiosError.message}`,
          errorCode: responseData?.code || 'BAD_REQUEST',
          statusCode: 400,
          retryable: false,
        };

      case 401:
        return {
          userMessage: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          technicalMessage: `Unauthorized: ${responseData?.message || axiosError.message}`,
          errorCode: 'UNAUTHORIZED',
          statusCode: 401,
          retryable: false,
        };

      case 403:
        return {
          userMessage: 'No tienes permisos para realizar esta acción.',
          technicalMessage: `Forbidden: ${responseData?.message || axiosError.message}`,
          errorCode: 'FORBIDDEN',
          statusCode: 403,
          retryable: false,
        };

      case 404:
        return {
          userMessage: 'El recurso solicitado no fue encontrado.',
          technicalMessage: `Not Found: ${responseData?.message || axiosError.message}`,
          errorCode: 'NOT_FOUND',
          statusCode: 404,
          retryable: false,
        };

      case 409:
        return {
          userMessage: responseData?.message || 'Ya existe un registro con estos datos.',
          technicalMessage: `Conflict: ${responseData?.message || axiosError.message}`,
          errorCode: 'CONFLICT',
          statusCode: 409,
          retryable: false,
        };

      case 422:
        return {
          userMessage: 'Los datos proporcionados no son válidos.',
          technicalMessage: `Validation Error: ${JSON.stringify(responseData)}`,
          errorCode: 'VALIDATION_ERROR',
          statusCode: 422,
          retryable: false,
        };

      case 429:
        return {
          userMessage: 'Demasiadas solicitudes. Por favor, espera unos momentos e intenta nuevamente.',
          technicalMessage: `Rate Limited: ${responseData?.message || axiosError.message}`,
          errorCode: 'RATE_LIMITED',
          statusCode: 429,
          retryable: true,
        };

      case 500:
        return {
          userMessage: 'Error interno del servidor. Nuestro equipo ha sido notificado.',
          technicalMessage: `Internal Server Error: ${responseData?.message || axiosError.message}`,
          errorCode: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
          retryable: true,
        };

      case 502:
      case 503:
      case 504:
        return {
          userMessage: 'El servicio no está disponible temporalmente. Intenta nuevamente en unos minutos.',
          technicalMessage: `Service Unavailable (${status}): ${responseData?.message || axiosError.message}`,
          errorCode: 'SERVICE_UNAVAILABLE',
          statusCode: status,
          retryable: true,
        };

      default:
        return {
          userMessage: responseData?.message || 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
          technicalMessage: `HTTP ${status}: ${responseData?.message || axiosError.message}`,
          errorCode: 'UNKNOWN_HTTP_ERROR',
          statusCode: status || 0,
          retryable: status ? status >= 500 : false,
        };
    }
  }

  if (error instanceof Error) {
    return {
      userMessage: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
      technicalMessage: `JavaScript Error: ${error.name} - ${error.message}`,
      errorCode: 'JAVASCRIPT_ERROR',
      retryable: false,
    };
  }

  return {
    userMessage: 'Ocurrió un error desconocido. Por favor, contacta a soporte técnico.',
    technicalMessage: `Unknown Error: ${JSON.stringify(error)}`,
    errorCode: 'UNKNOWN_ERROR',
    retryable: false,
  };
};

/**
 * Errores específicos de WhatsApp Business API
 */
export const parseWhatsAppError = (error: any): ParsedError => {
  const parsedError = parseError(error);
  const responseData = error?.response?.data;

  if (responseData?.error?.code) {
    const whatsappErrorCode = responseData.error.code;

    switch (whatsappErrorCode) {
      case 100:
        return {
          ...parsedError,
          userMessage: 'Token de acceso inválido. Verifica tus credenciales de WhatsApp.',
          errorCode: 'WHATSAPP_INVALID_TOKEN',
        };

      case 190:
        return {
          ...parsedError,
          userMessage: 'Token de acceso expirado. Por favor, genera un nuevo token.',
          errorCode: 'WHATSAPP_EXPIRED_TOKEN',
        };

      case 200:
        return {
          ...parsedError,
          userMessage: 'No tienes permisos para esta operación de WhatsApp.',
          errorCode: 'WHATSAPP_PERMISSION_DENIED',
        };

      case 4:
        return {
          ...parsedError,
          userMessage: 'Límite de solicitudes de WhatsApp excedido. Intenta más tarde.',
          errorCode: 'WHATSAPP_RATE_LIMITED',
          retryable: true,
        };

      case 1000:
        return {
          ...parsedError,
          userMessage: 'Número de teléfono no válido o no registrado en WhatsApp Business.',
          errorCode: 'WHATSAPP_INVALID_PHONE',
        };

      case 131056:
        return {
          ...parsedError,
          userMessage: 'El template de WhatsApp ha sido rechazado o no está aprobado.',
          errorCode: 'WHATSAPP_TEMPLATE_REJECTED',
        };

      default:
        return {
          ...parsedError,
          userMessage: `Error de WhatsApp: ${responseData.error.message || 'Error desconocido'}`,
          errorCode: `WHATSAPP_${whatsappErrorCode}`,
        };
    }
  }

  return parsedError;
};

/**
 * Maneja errores y proporciona logging automático
 */
export const handleError = (error: any, context: string = 'Unknown'): ParsedError => {
  const parsedError = parseError(error);

  console.group(`🚨 Error en ${context}`);
  console.error('Error original:', error);
  console.error('Mensaje para usuario:', parsedError.userMessage);
  console.error('Mensaje técnico:', parsedError.technicalMessage);
  console.error('Código de error:', parsedError.errorCode);
  console.error('¿Se puede reintentar?:', parsedError.retryable);
  console.groupEnd();

  return parsedError;
};

/**
 * Maneja errores específicamente para operaciones de WhatsApp
 */
export const handleWhatsAppError = (error: any, context: string = 'WhatsApp Operation'): ParsedError => {
  const parsedError = parseWhatsAppError(error);

  console.group(`📱 Error de WhatsApp en ${context}`);
  console.error('Error original:', error);
  console.error('Mensaje para usuario:', parsedError.userMessage);
  console.error('Mensaje técnico:', parsedError.technicalMessage);
  console.error('Código de error:', parsedError.errorCode);
  console.error('Status HTTP:', parsedError.statusCode);
  console.groupEnd();

  return parsedError;
};

/**
 * Crea mensajes de error específicos para formularios
 */
export const getFieldError = (error: any, fieldName: string): string | null => {
  const responseData = error?.response?.data;

  if (responseData?.errors && Array.isArray(responseData.errors)) {
    const fieldError = responseData.errors.find((err: any) =>
      err.field === fieldName || err.path === fieldName
    );

    if (fieldError) {
      return fieldError.message || `Error en el campo ${fieldName}`;
    }
  }

  if (responseData?.fieldErrors && responseData.fieldErrors[fieldName]) {
    return responseData.fieldErrors[fieldName];
  }

  return null;
};

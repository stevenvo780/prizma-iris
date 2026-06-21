import service from '../utils/axios';

export function getQRCode(forceNew = false) {
  return service.get('/whatsapp/qr', { params: { forceNew } });
}

export function reconnectWhatsApp() {
  return service.post('/whatsapp/reconnect');
}

export function createWppAccount(data: any) {
  // Validar que accessToken no esté vacío
  if (!data.accessToken || typeof data.accessToken !== 'string' || data.accessToken.trim() === '') {
    throw new Error('accessToken es requerido y no puede estar vacío');
  }

  const payload = {
    name: data.name,
    phoneNumber: data.phoneNumber,
    phoneNumberId: data.phoneNumberId,
    businessAccountId: data.businessAccountId,
    accessToken: data.accessToken,
  };

  // Log seguro sin exponer el token
  const logPayload = {
    name: data.name,
    phoneNumber: data.phoneNumber,
    phoneNumberId: data.phoneNumberId,
    businessAccountId: data.businessAccountId,
    accessToken: '***REDACTED***',
  };
  console.log('📤 Creando cuenta WhatsApp:', logPayload);
  return service.post('/accounts', payload);
}

export function getWppAccounts() {
  return service.get('/accounts');
}

export function getActiveWppAccount() {
  return service.get('/accounts/active');
}

export function setActiveWppAccount(id: string) {
  return service.post(`/accounts/${id}/set-active`);
}

export function deleteWppAccount(id: string) {
  return service.delete(`/accounts/${id}`);
}

export function updateWppAccount(id: string, data: Partial<{ name: string; accessToken: string; businessAccountId: string }>) {
  const payload: any = {};
  if (data.name) payload.name = data.name;
  if (data.accessToken) payload.accessToken = data.accessToken;
  if (data.businessAccountId) payload.businessAccountId = data.businessAccountId;

  const logData = { ...data, accessToken: data.accessToken ? 'access_token_***' : undefined };
  const logPayload = { ...payload, accessToken: payload.accessToken ? 'access_token_***' : undefined };
  console.log('🔧 updateWppAccount - Datos recibidos:', logData);
  console.log('🔧 updateWppAccount - Payload a enviar:', logPayload);

  return service.put(`/accounts/${id}`, payload);
}

export function deleteAllWppAccounts() {
  return service.delete('/accounts/all');
}

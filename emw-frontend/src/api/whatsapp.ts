import service from '../utils/axios';

export function getQRCode(forceNew = false) {
  return service.get('/whatsapp/qr', { params: { forceNew } });
}

export function reconnectWhatsApp() {
  return service.post('/whatsapp/reconnect');
}

export function createWppAccount(data: any) {

  const payload = {
    name: data.name,
    phoneNumber: data.phoneNumber,
    phoneNumberId: data.phoneNumberId,
    businessAccountId: data.businessAccountId,
    accessToken: data.accessToken,
  };
  console.log('📤 Creando cuenta WhatsApp con payload (sin type):', payload);
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

  console.log('🔧 updateWppAccount - Datos recibidos:', data);
  console.log('🔧 updateWppAccount - Payload a enviar:', payload);

  return service.put(`/accounts/${id}`, payload);
}

export function deleteAllWppAccounts() {
  return service.delete('/accounts/all');
}

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:43017';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:43011/api';

const CREDENTIALS = {
  email: process.env.E2E_EMAIL || 'admin@example.com',
  password: process.env.E2E_PASSWORD || 'Password123!',
};

async function ensureUserExists(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: CREDENTIALS.email,
        password: CREDENTIALS.password,
        firstName: 'E2E',
        lastName: 'Tester',
      }),
    });
    if (!res.ok && res.status !== 409) {
      console.warn('No se pudo registrar el usuario de prueba. Status:', res.status);
    }
  } catch (e) {
    console.warn('Fallo al crear usuario de prueba vía API:', e);
  }
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('Correo electrónico').fill(CREDENTIALS.email);
  await page.getByPlaceholder('Contraseña').fill(CREDENTIALS.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForLoadState('networkidle');
}

test.describe('E2E - Templates', () => {
  test('Crear, activar/desactivar y eliminar template', async ({ page }) => {
    await ensureUserExists();
    await login(page);

    await page.goto(`${BASE_URL}/templates`);
    await expect(page.getByRole('heading', { name: /Templates/i })).toBeVisible();


  await page.getByRole('button', { name: /Crear Nuevo Template/i }).click();
  const nameInput = page.getByPlaceholder('ej: solicitud_autorizacion');
  await expect(nameInput).toBeVisible();
  await nameInput.fill('solicitud_autorizacion_e2e');
  await page.getByPlaceholder('Ej: Hola, ¿te gustaría recibir ofertas especiales de nuestra tienda? Responde SÍ para continuar.').fill('Hola {{firstName}}, ¿aceptas recibir mensajes? Responde SI.');


  const activeSwitch = page.getByText('Template activo');
  await activeSwitch.click();

    await page.getByRole('button', { name: 'Crear Template' }).click();


    await expect(page.locator('text=solicitud_autorizacion_e2e')).toBeVisible();


    const card = page.locator('.card').filter({ hasText: 'solicitud_autorizacion_e2e' });
    const switchLabel = card.getByText(/Activo|Inactivo/);
    if (await switchLabel.count()) {
      await switchLabel.first().click();
      await page.waitForTimeout(500);
    }


    const deleteBtn = card.locator('button').last();
    await deleteBtn.click();


    await page.getByRole('button', { name: 'Eliminar' }).click().catch(() => {});
  });
});

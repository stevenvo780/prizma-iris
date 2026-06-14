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

test.describe('E2E - Mensajes', () => {
  test('Crear mensaje y programar por etiquetas', async ({ page }) => {
    await ensureUserExists();
    await login(page);

    await page.goto(`${BASE_URL}/messages`);
    await expect(page.getByRole('heading', { name: /Mensajes/i })).toBeVisible();


  await page.getByRole('button', { name: 'Crear Nuevo Mensaje' }).click();
  const contentTextarea = page.getByPlaceholder('Escribe el contenido de tu mensaje aquí...');
  await expect(contentTextarea).toBeVisible();
  await contentTextarea.fill('Hola {{firstName}}, este es un mensaje de prueba');


  const createBtn = page.getByRole('button', { name: 'Crear Mensaje' });
  await expect(createBtn).toBeEnabled();
  await createBtn.click();


  await expect(page.getByPlaceholder('Escribe el contenido de tu mensaje aquí...')).toBeHidden();


    const input = page.locator('#react-select-labels-input');
    if (await input.count()) {
      await input.click({ force: true });
      await input.type('default');
      await page.keyboard.press('Enter');
    }

    const enviarMasivoBtn = page.getByRole('button', { name: /Enviar Masivo/i });
    if (await enviarMasivoBtn.isEnabled()) {
      await enviarMasivoBtn.click();
    }


    await page.waitForTimeout(800);
  });
});

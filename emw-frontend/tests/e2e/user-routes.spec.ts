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

test.describe('Rutas de usuario protegidas', () => {
  test('acceso a /customers sin sesión: login o auto-login dev', async ({ page }) => {

    await page.goto(`${BASE_URL}/customers`);

    await page.waitForTimeout(2000);

    try {

      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (e) {
      console.log('Network no se estabilizó completamente, continuando...');
    }

    let currentUrl = '';
    let attemptCount = 0;
    const maxAttempts = 15;

    while (attemptCount < maxAttempts) {
      currentUrl = page.url();

      if (currentUrl.includes('/login') || currentUrl.includes('/customers')) {
        break;
      }

      await page.waitForTimeout(1000);
      attemptCount++;
    }

    console.log(`Final URL after ${attemptCount} seconds: ${currentUrl}`);

    if (currentUrl.includes('/login')) {

      console.log('Redirected to login - performing manual login');

      try {
        await page.getByPlaceholder('Correo electrónico').fill(CREDENTIALS.email);
        await page.getByPlaceholder('Contraseña').fill(CREDENTIALS.password);
        await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      } catch {
        await page.fill('[data-testid="email-input"], input[name="email"], input[type="email"]', CREDENTIALS.email);
        await page.fill('[data-testid="password-input"], input[name="password"], input[type="password"]', CREDENTIALS.password);
        await page.click('[data-testid="submit-button"], button[type="submit"], .btn-primary');
      }

      await page.waitForURL('**/customers**', { timeout: 20000 });
    } else if (currentUrl.includes('/customers')) {
      console.log('Auto-login successful - already on customers page');
    } else {
      throw new Error(`Unexpected URL after navigation: ${currentUrl}`);
    }

    await expect(page).toHaveURL(/.*\/customers/);
    console.log('Successfully accessed customers page');
  });

  test('carga clientes, mensajes y cuentas tras login', async ({ page }) => {
    await ensureUserExists();
    await login(page);

    await page.goto(`${BASE_URL}/customers`);
    await expect(page.getByRole('heading', { name: /Clientes/i })).toBeVisible();

    await page.goto(`${BASE_URL}/messages`);
    await expect(page.getByRole('heading', { name: /Mensajes/i })).toBeVisible();

    await page.goto(`${BASE_URL}/whatsapp-sessions`);
    await expect(page.getByRole('heading', { name: /Cuentas de WhatsApp Business/i })).toBeVisible();
  });
});

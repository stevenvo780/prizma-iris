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

test.describe('E2E - Clientes CRUD', () => {
  test('Crear, ver, actualizar y eliminar un cliente', async ({ page }) => {
    await ensureUserExists();
    await login(page);


    await page.goto(`${BASE_URL}/customers`);
    await expect(page.getByRole('heading', { name: /Clientes/i })).toBeVisible();


  await page.getByRole('button', { name: /Nuevo cliente/i }).click();
  await expect(page.getByPlaceholder('Nombre *')).toBeVisible();


  await page.getByPlaceholder('Nombre *').fill('Juan');
  await page.getByPlaceholder('Apellido *').fill('Pérez');
    const phoneByPlaceholder = page.getByPlaceholder('Número de teléfono (ej: +573001234567) *');
    if (await phoneByPlaceholder.count()) {
      await phoneByPlaceholder.fill('+573001111111');
    } else {

      const phoneByName = page.locator('input[name="phoneNumber"]');
      await expect(phoneByName).toBeVisible();
      await phoneByName.fill('+573001111111');
    }


  await page.getByRole('button', { name: /^Crear$/ }).click();


    await expect(page.locator('text=Juan Pérez')).toBeVisible();
    await expect(page.locator('text=+573001111111')).toBeVisible();


    await page.getByRole('button', { name: 'Ver' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText(/Nombre\s*:\s*Juan/i)).toBeVisible();
    await expect(dialog.getByText(/Apellido\s*:\s*Pérez/i)).toBeVisible();

    const closeBtn = dialog.getByRole('button', { name: /Cerrar|Close|Ok|Entendido/i });
    if (await closeBtn.count()) {
      await closeBtn.first().click();
    } else {

      await page.keyboard.press('Escape');
    }


  await page.getByRole('button', { name: 'Actualizar' }).first().click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog).toBeVisible();
  const phoneInput = editDialog.locator('input[name="phoneNumber"]');
  await expect(phoneInput).toBeVisible();
  await phoneInput.fill('+573002222222');
  await editDialog.getByRole('button', { name: /^Actualizar$/ }).click();

    await expect(page.locator('text=+573002222222')).toBeVisible();


    await page.getByRole('button', { name: 'Eliminar' }).first().click();


    await page.waitForTimeout(1000);
  });
});

# Pruebas E2E con Playwright

Requisitos:
- Frontend corriendo en `http://localhost:43017` (Docker compose ya mapea el puerto)
- Backend corriendo en `http://localhost:43011/api`
- Node 20+ instalado (para correr Playwright localmente)

Instalación de dependencias:

```
npm ci
npx playwright install --with-deps
```

Ejecución:

```
# Headless
npm run test:e2e

# Con UI de Playwright
npm run test:e2e:ui

# Ver reportes
npm run test:e2e:report
```

Variables de entorno (opcional para flujo real con WABA):

- `E2E_EMAIL` y `E2E_PASSWORD`: credenciales para login.
- `E2E_WPP_NAME`, `E2E_WPP_PHONE_NUMBER_ID`, `E2E_WPP_ACCESS_TOKEN`, `E2E_WPP_WABA_ID`: datos para registrar la cuenta de WhatsApp.
- `E2E_BASE_URL`: URL del frontend. Por defecto `http://localhost:43017`.
- `NEXT_PUBLIC_API_URL`: URL del backend. Por defecto `http://localhost:43011/api`.

Notas:
- Si no se proveen credenciales WABA, la prueba valida la UI y el flujo básico de creación/visualización sin exigir conexión real.
- En Dockerfile se ha deshabilitado la descarga de navegadores durante el build (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`) para evitar builds lentos.

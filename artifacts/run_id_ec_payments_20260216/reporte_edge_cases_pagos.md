# 🧪 Reporte de Edge Cases — Sistema de Pagos IRIS

**Fecha:** 2026-02-16  
**Ambiente:** Producción (https://iris.prizma.cloud)  
**Backend:** iris-backend-00080-pwx  
**Frontend:** iris-frontend-00072-5n6  

---

## 📊 Resumen Ejecutivo

| # | Edge Case | Estado | Evidencia |
|---|-----------|--------|-----------|
| EC4 | Usuario premium ve vista "¡Felicidades!" en /plans | ✅ PASÓ | Snapshot: heading "¡Felicidades!", beneficios listados, botón cancelar |
| EC5 | Usuario free ve PremiumBanner con barras de progreso | ✅ PASÓ | Snapshot: "Clientes: 0/50", "Msgs hoy: 0/100" con ProgressBar |
| EC6 | Usuario free ve página /plans con formulario de pago | ✅ PASÓ | Snapshot: Plan Especial $88,000/mes, botón "Pagar con Mercado Pago" |
| EC7 | Plan anual muestra precios correctos con descuento | ✅ PASÓ | $844,800/año, 20% DESCUENTO, Ahorras $211,200, equiv $70,400/mes |
| EC8 | Cancelar suscripción funciona correctamente | ✅ PASÓ | Alert "Suscripción cancelada con éxito", transición premium→user, PremiumBanner aparece, formulario de pago regresa |
| EC9 | Límite de clientes se aplica para plan gratuito | ✅ PASÓ | Con límite=2: "Has alcanzado el límite de 2 clientes...", 400 Bad Request, tercer cliente NO creado |
| EC10 | Barras de progreso se actualizan en tiempo real | ✅ PASÓ | "Clientes: 1/2" después de crear cliente, actualización automática |
| EC11 | Usuario premium NO tiene límites | ✅ PASÓ | Sin PremiumBanner, creación de clientes sin restricción, vista "¡Felicidades!" en /plans |
| EC12 | Vista premium en /plans muestra beneficios correctos | ✅ PASÓ | Beneficios: Msgs ilimitados, Clientes ilimitados, Soporte prioritario, Envíos rápidos |

**Total: 9/9 edge cases pasaron** ✅

---

## 🔧 Bugs Encontrados y Corregidos

### Bug #1: PremiumBanner no mostraba barras de progreso al cargar
- **Causa:** El `useEffect` en `PremiumBanner.tsx` dependía solo de `user?.role`, pero el token de Firebase no estaba disponible cuando el efecto se disparaba por primera vez.
- **Fix:** Agregada dependencia `token` al `useEffect`: `[user?.role, token]`
- **Impacto:** Las barras de progreso ahora aparecen correctamente después de ~2-3 segundos cuando Firebase restaura la sesión.
- **Archivo:** `iris-frontend/src/components/PremiumBanner.tsx`

---

## 🏗️ Implementaciones Realizadas

### Límites del Plan Gratuito (FREE_PLAN_LIMITS)
```
MAX_CUSTOMERS: 50
MAX_MESSAGES_PER_DAY: 100  
MAX_BULK_RECIPIENTS: 10
MAX_TEMPLATES: 5
```

### Archivos Modificados (Backend)
| Archivo | Cambio |
|---------|--------|
| `customers.service.ts` | `checkCustomerLimit()`, límite en `create()` e `importCustomers()` |
| `messages.service.ts` | `checkDailyMessageLimit()`, límite en `sendMessage()` y `bulkSend()` |
| `messages.module.ts` | User entity añadido a TypeOrmModule |
| `payments.service.ts` | `getUsageLimits()` endpoint |
| `payments.controller.ts` | `GET /limits` endpoint |
| `payments.module.ts` | Customer, MessageLog entities añadidos |

### Archivos Modificados (Frontend)
| Archivo | Cambio |
|---------|--------|
| `PremiumBanner.tsx` | Barras de progreso, fetch de límites, fix de timing con token |
| `store/payments/index.tsx` | `getUsageLimits()` función |

---

## 📋 Cuentas de Test Utilizadas

| Usuario | Email | Role | ID |
|---------|-------|------|-----|
| Carlos | test-ec1-pago-aprobado@prueba.com | user | 6bf8138c-a36e-4f8e-b255-8b7ce59d6aa7 |
| María | test-ec2-pago-rechazado@prueba.com | user | ac481473-9a4c-4408-bbad-1dd2858dea7f |
| Pedro | test-ec3-cancelar-sub@prueba.com | user | 7e90a86d-85ff-4c7f-8449-4d611e78330e |

---

## 🧹 Limpieza Post-Test
- ✅ Carlos restaurado a role `user`
- ✅ 3 clientes de prueba eliminados (ClienteTest, SegundoTest, PremiumTest)
- ✅ Backend con FREE_PLAN_LIMITS restaurado a 50 clientes (no 2 del test temporal)

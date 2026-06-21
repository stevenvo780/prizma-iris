#!/bin/bash

# Test 11: Nous Notification Queuing
# Verifica que el NotificationController encola mensajes reales en MessagesService
# en vez de devolver ACK falsos.
#
# Modo sin servidor (unit-like): verifica la lógica del controller cableado
# inspeccionando el código fuente y el módulo.
# Modo con servidor: lanza peticiones reales contra el endpoint.

set -euo pipefail

API_URL="${API_URL:-http://localhost:3001/api}"
NOUS_SERVICE_USER_ID="${NOUS_SERVICE_USER_ID:-}"

PASS=0
FAIL=0
SKIP=0

pass() { echo "PASS $1"; PASS=$((PASS+1)); }
fail() { echo "FAIL $1"; FAIL=$((FAIL+1)); }
skip() { echo "SKIP $1 — $2"; SKIP=$((SKIP+1)); }

CONTROLLER="$(dirname "$0")/../modules/NotificationAPI/notification.controller.ts"
MODULE="$(dirname "$0")/../modules/NotificationAPI/index.ts"

echo "=== Test 11: Nous Notification Queuing ==="
echo ""

# ── Test 1: Controller importa MessagesService (no es un sink vacío) ──────────
echo "▶ Test 1: Controller importa MessagesService"
if grep -q "MessagesService" "$CONTROLLER" 2>/dev/null; then
  pass "Controller importa MessagesService"
else
  fail "Controller NO importa MessagesService — sigue siendo un sink"
fi

# ── Test 2: Controller inyecta MessagesService en constructor ─────────────────
echo "▶ Test 2: Constructor inyecta MessagesService"
if grep -q "private readonly messagesService: MessagesService" "$CONTROLLER" 2>/dev/null; then
  pass "Constructor inyecta MessagesService"
else
  fail "Constructor no inyecta MessagesService"
fi

# ── Test 3: createNotification llama a sendMessage (no solo loguea) ──────────
echo "▶ Test 3: createNotification llama a messagesService.sendMessage"
if grep -A 40 "async createNotification" "$CONTROLLER" | grep -q "messagesService.sendMessage"; then
  pass "createNotification llama a messagesService.sendMessage"
else
  fail "createNotification NO llama a messagesService.sendMessage"
fi

# ── Test 4: createWhatsAppNotification llama a sendMessage ───────────────────
echo "▶ Test 4: createWhatsAppNotification llama a messagesService.sendMessage"
if grep -A 40 "async createWhatsAppNotification" "$CONTROLLER" | grep -q "messagesService.sendMessage"; then
  pass "createWhatsAppNotification llama a messagesService.sendMessage"
else
  fail "createWhatsAppNotification NO llama a messagesService.sendMessage"
fi

# ── Test 5: sendTemplate llama a sendMessage ─────────────────────────────────
echo "▶ Test 5: sendTemplate llama a messagesService.sendMessage"
if grep -A 60 "async sendTemplate" "$CONTROLLER" | grep -q "messagesService.sendMessage"; then
  pass "sendTemplate llama a messagesService.sendMessage"
else
  fail "sendTemplate NO llama a messagesService.sendMessage"
fi

# ── Test 6: getNotificationStatus consulta QueueService (no hardcoded 'sent') ─
echo "▶ Test 6: getNotificationStatus consulta QueueService en vez de hardcodear 'sent'"
if grep -A 20 "async getNotificationStatus" "$CONTROLLER" | grep -q "queueService.getJob"; then
  pass "getNotificationStatus consulta queueService.getJob"
else
  fail "getNotificationStatus sigue usando status hardcodeado"
fi

# ── Test 7: Controller lanza error real si falta NOUS_SERVICE_USER_ID ─────────
echo "▶ Test 7: Controller lanza ServiceUnavailableException si falta NOUS_SERVICE_USER_ID"
if grep -q "ServiceUnavailableException" "$CONTROLLER" 2>/dev/null && \
   grep -q "NOUS_SERVICE_USER_ID" "$CONTROLLER" 2>/dev/null; then
  pass "Controller lanza ServiceUnavailableException si falta NOUS_SERVICE_USER_ID"
else
  fail "Controller no tiene guard para NOUS_SERVICE_USER_ID faltante"
fi

# ── Test 8: Módulo importa MessagesModule y QueueModule ─────────────────────
echo "▶ Test 8: NotificationAPIModule importa MessagesModule y QueueModule"
IMPORTS_MESSAGES=$(grep -c "MessagesModule" "$MODULE" 2>/dev/null || echo 0)
IMPORTS_QUEUE=$(grep -c "QueueModule" "$MODULE" 2>/dev/null || echo 0)
if [ "$IMPORTS_MESSAGES" -gt 0 ] && [ "$IMPORTS_QUEUE" -gt 0 ]; then
  pass "NotificationAPIModule importa MessagesModule y QueueModule"
else
  fail "NotificationAPIModule NO importa MessagesModule($IMPORTS_MESSAGES) o QueueModule($IMPORTS_QUEUE)"
fi

# ── Test 9: Health check reporta degraded si falta NOUS_SERVICE_USER_ID ──────
echo "▶ Test 9: Health check reporta estado según NOUS_SERVICE_USER_ID"
if grep -A 10 "healthCheck" "$CONTROLLER" | grep -q "serviceUserConfigured"; then
  pass "Health check reporta estado según NOUS_SERVICE_USER_ID"
else
  fail "Health check no reporta estado de configuración"
fi

# ── Test 10: Integración HTTP (solo si hay servidor corriendo) ────────────────
echo "▶ Test 10: HTTP health endpoint (requiere servidor en $API_URL)"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/notifications/health" 2>/dev/null || echo "000")
if [ "$HEALTH_CODE" = "200" ]; then
  HEALTH_BODY=$(curl -s "$API_URL/notifications/health" 2>/dev/null)
  SERVICE=$(echo "$HEALTH_BODY" | grep -o '"service":"[^"]*"' | cut -d'"' -f4)
  CONFIGURED=$(echo "$HEALTH_BODY" | grep -o '"serviceUserConfigured":[a-z]*' | cut -d: -f2)
  pass "Health endpoint responde 200 | service=$SERVICE | serviceUserConfigured=$CONFIGURED"
elif [ "$HEALTH_CODE" = "000" ] || [ "$HEALTH_CODE" = "000000" ]; then
  skip "Test 10" "Servidor no disponible en $API_URL"
else
  fail "Health endpoint devolvió HTTP $HEALTH_CODE (esperado 200)"
fi

# ── Test 11: Rechaza si falta customerPhone ──────────────────────────────────
echo "▶ Test 11: HTTP createNotification rechaza payload sin customerPhone (requiere servidor)"
if [ "$HEALTH_CODE" = "000" ] || [ "$HEALTH_CODE" = "000000" ]; then
  skip "Test 11" "Servidor no disponible"
else
  BAD_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"orderId":"ord_001","notificationType":"order_created"}' \
    "$API_URL/notifications" 2>/dev/null || echo "000")
  if [ "$BAD_CODE" = "500" ] || [ "$BAD_CODE" = "503" ] || [ "$BAD_CODE" = "400" ]; then
    pass "Rechaza payload sin customerPhone con HTTP $BAD_CODE (no ACK falso)"
  elif [ "$BAD_CODE" = "000" ] || [ "$BAD_CODE" = "000000" ]; then
    skip "Test 11" "Servidor no disponible"
  else
    fail "Devolvió HTTP $BAD_CODE — debería ser 4xx/5xx por payload inválido"
  fi
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo "=== Resumen ==="
echo "PASS: $PASS | FAIL: $FAIL | SKIP: $SKIP"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "RESULTADO: FALLO ($FAIL tests fallaron)"
  exit 1
else
  echo "RESULTADO: OK"
  exit 0
fi

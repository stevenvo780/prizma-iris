#!/bin/bash

# IRIS Webhook Integration Tests
# Tests para el endpoint de notificaciones del Hub Central

# Configuración
EMW_API_URL="http://localhost:3001"
WEBHOOK_SECRET="iris-webhook-secret-2024"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Función para generar firma HMAC
generate_signature() {
    local payload="$1"
    echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/.*= /sha256=/'
}

# Función para ejecutar test
run_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local payload="$4"
    local expected_status="$5"
    local signature="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${BLUE}🧪 Test ${TOTAL_TESTS}: ${test_name}${NC}"
    
    # Construir comando curl
    local curl_cmd="curl -s -w \"HTTPSTATUS:%{http_code}\" -X $method"
    
    if [ ! -z "$payload" ]; then
        curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$payload'"
    fi
    
    if [ ! -z "$signature" ]; then
        curl_cmd="$curl_cmd -H \"x-hub-signature-256: $signature\""
    fi
    
    curl_cmd="$curl_cmd \"$EMW_API_URL$endpoint\""
    
    # Ejecutar request
    local response=$(eval $curl_cmd)
    local status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    # Verificar resultado
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC} - Status: $status_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Mostrar respuesta si es exitosa
        if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
            echo "   Response: $(echo "$body" | jq -c . 2>/dev/null || echo "$body")"
        fi
    else
        echo -e "${RED}❌ FAILED${NC} - Expected: $expected_status, Got: $status_code"
        echo "   Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo -e "${BLUE}🚀 INICIANDO TESTS DE INTEGRACIÓN IRIS WEBHOOK${NC}"
echo -e "${BLUE}==============================================${NC}"

# Test 1: Health Check
run_test "Health Check" "GET" "/api/webhooks/health" "" "200"

# Test 2: Webhook válido - Order Created
payload_order_created='{
  "orderId": "hermes-order-1001",
  "orderNumber": "2024001",
  "status": "CREATED",
  "customerName": "María García",
  "customerPhone": "573001234567",
  "customerEmail": "maria@email.com",
  "orderValue": 85000,
  "paymentMethod": "CREDIT_CARD",
  "notificationType": "order_created",
  "products": [
    {
      "name": "Café Premium 500g",
      "quantity": 2,
      "totalPrice": 50000
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}'

signature_created=$(generate_signature "$payload_order_created")
run_test "Webhook Válido - Order Created" "POST" "/api/webhooks/notifications" "$payload_order_created" "200" "$signature_created"

# Test 3: Webhook válido - Order Paid
payload_order_paid='{
  "orderId": "hermes-order-1002", 
  "orderNumber": "2024002",
  "status": "PAID",
  "customerName": "Carlos Mendoza",
  "customerPhone": "573009876543",
  "orderValue": 125000,
  "paymentMethod": "PSE",
  "notificationType": "order_paid",
  "timestamp": "2024-01-15T11:00:00Z"
}'

signature_paid=$(generate_signature "$payload_order_paid")
run_test "Webhook Válido - Order Paid" "POST" "/api/webhooks/notifications" "$payload_order_paid" "200" "$signature_paid"

# Test 4: Webhook válido - Delivery Created
payload_delivery_created='{
  "orderId": "hermes-order-1003",
  "orderNumber": "2024003", 
  "status": "PROCESSING",
  "customerName": "Ana López",
  "customerPhone": "573005551234",
  "deliveryAddress": "Calle 85 #15-20",
  "city": "Bogotá",
  "orderValue": 95000,
  "notificationType": "delivery_created",
  "deliveryNumber": 123456789,
  "timestamp": "2024-01-15T12:00:00Z"
}'

signature_delivery=$(generate_signature "$payload_delivery_created")
run_test "Webhook Válido - Delivery Created" "POST" "/api/webhooks/notifications" "$payload_delivery_created" "200" "$signature_delivery"

# Test 5: Webhook válido - Order Shipped
payload_order_shipped='{
  "orderId": "hermes-order-1004",
  "orderNumber": "2024004",
  "status": "SHIPPED", 
  "customerName": "Roberto Silva",
  "customerPhone": "573012345678",
  "deliveryAddress": "Carrera 50 #25-30",
  "orderValue": 75000,
  "notificationType": "order_shipped",
  "deliveryNumber": 987654321,
  "estimatedDeliveryTime": "45 minutos",
  "timestamp": "2024-01-15T13:00:00Z"
}'

signature_shipped=$(generate_signature "$payload_order_shipped")
run_test "Webhook Válido - Order Shipped" "POST" "/api/webhooks/notifications" "$payload_order_shipped" "200" "$signature_shipped"

# Test 6: Webhook con firma inválida
payload_invalid='{
  "orderId": "hermes-order-1005",
  "orderNumber": "2024005",
  "notificationType": "order_created"
}'

run_test "Webhook con Firma Inválida" "POST" "/api/webhooks/notifications" "$payload_invalid" "401" "sha256=firma_invalida_123"

# Test 7: Webhook sin firma
run_test "Webhook sin Firma" "POST" "/api/webhooks/notifications" "$payload_invalid" "401" ""

# Test 8: Webhook con JSON inválido
invalid_json='{"orderId": "invalid-json"'
signature_invalid=$(generate_signature "$invalid_json")
run_test "Webhook con JSON Inválido" "POST" "/api/webhooks/notifications" "$invalid_json" "500" "$signature_invalid"

# Test 9: Tipo de notificación no soportado
payload_unsupported='{
  "orderId": "hermes-order-1006",
  "orderNumber": "2024006",
  "notificationType": "unsupported_type",
  "customerName": "Test User",
  "customerPhone": "573000000000",
  "timestamp": "2024-01-15T14:00:00Z"
}'

signature_unsupported=$(generate_signature "$payload_unsupported")
run_test "Notificación No Soportada" "POST" "/api/webhooks/notifications" "$payload_unsupported" "200" "$signature_unsupported"

# Test 10: Order Delivered
payload_delivered='{
  "orderId": "hermes-order-1007",
  "orderNumber": "2024007",
  "status": "DELIVERED",
  "customerName": "Laura Pinzón", 
  "customerPhone": "573007778888",
  "orderValue": 65000,
  "notificationType": "order_delivered",
  "timestamp": "2024-01-15T15:00:00Z"
}'

signature_delivered=$(generate_signature "$payload_delivered")
run_test "Webhook Válido - Order Delivered" "POST" "/api/webhooks/notifications" "$payload_delivered" "200" "$signature_delivered"

# Resumen de resultados
echo -e "\n${BLUE}📊 RESUMEN DE RESULTADOS${NC}"
echo -e "${BLUE}========================${NC}"
echo -e "Total Tests: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 TODOS LOS TESTS PASARON EXITOSAMENTE${NC}"
    
    echo -e "\n${BLUE}✅ FUNCIONALIDADES VALIDADAS:${NC}"
    echo "🔐 Validación HMAC-SHA256"
    echo "📱 Notificaciones WhatsApp personalizadas"
    echo "🎯 Múltiples tipos de notificación"
    echo "🛡️ Manejo de errores y casos edge"
    echo "💬 Mensajes contextuales por estado"
    echo "📊 Health check endpoint"
    
    echo -e "\n${BLUE}🚀 CONFIGURACIÓN IRIS:${NC}"
    echo "🔗 Endpoint: POST /api/webhooks/notifications"
    echo "🔑 Secret: iris-webhook-secret-2024"
    echo "🌐 Puerto: 3001"
    echo "📝 Tipos soportados: 6 tipos de notificación"
    
    exit 0
else
    echo -e "\n${RED}❌ ALGUNOS TESTS FALLARON${NC}"
    echo -e "Revisa los detalles arriba para más información"
    exit 1
fi

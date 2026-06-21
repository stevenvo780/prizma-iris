# IRIS Platform - Casos de Uso para Testing QA

## Información del Proyecto
- **Nombre**: IRIS (Enterprise Messaging for WhatsApp)
- **Versión**: 2.0.0
- **Arquitectura**: Full-stack (NestJS + Next.js)
- **Propósito**: Plataforma empresarial para gestión de mensajería WhatsApp

## Configuración de Testing

### Ambiente de Pruebas
- **Backend**: `http://localhost:3001`
- **Frontend**: `http://localhost:3000`
- **Base de Datos**: MySQL (puerto 3306)
- **Redis**: localhost:6379

### Credenciales de Prueba
```json
{
  "admin": {
    "email": "admin@iris.com",
    "password": "admin123",
    "role": "admin"
  },
  "user": {
    "email": "user@iris.com", 
    "password": "user123",
    "role": "user"
  }
}
```

### Datos de Prueba Estándar
```json
{
  "cliente_test": {
    "name": "Juan Pérez Test",
    "phone": "+1234567890",
    "email": "juan.test@example.com"
  },
  "template_test": {
    "name": "Bienvenida Test",
    "content": "Hola {{name}}, bienvenido a nuestro servicio"
  }
}
```

---

## 🚀 CASO DE USO 1: Setup Empresarial Completo

**Objetivo**: Validar que una nueva empresa puede configurar completamente su cuenta IRIS desde cero hasta enviar su primer mensaje.

**Tiempo Estimado**: 15-20 minutos  
**Prioridad**: CRÍTICA  
**Actor**: Administrador de empresa

### Precondiciones
- Base de datos limpia
- Servidor backend corriendo
- Frontend accesible

### Pasos del Flujo

#### Paso 1: Registro inicial
- **Acción**: Ir a `http://localhost:3000/login` → "Registrarse"
- **Datos**: Email: `empresa.test@iris.com`, Password: `Test123!`, Nombre: `Empresa Test`
- **Validación**: Usuario creado, token JWT generado, redirección a dashboard

#### Paso 2: Configurar cuenta WhatsApp
- **Acción**: Navegar a `http://localhost:3000/whatsapp-sessions` → "Agregar Cuenta"
- **Datos**: Nombre: `Cuenta Principal`, Teléfono: `+5491234567890`
- **Validación**: Cuenta creada con status "disconnected"

#### Paso 3: Activar cuenta WhatsApp
- **Acción**: Seleccionar cuenta creada → "Establecer como activa"
- **Validación**: Status cambia a "active", aparece como cuenta principal

#### Paso 4: Crear primer template
- **Acción**: Ir a `http://localhost:3000/templates` → "Crear Template"
- **Datos**: 
  ```json
  {
    "name": "Bienvenida Empresa",
    "content": "Hola {{name}}, gracias por contactar a Empresa Test. ¿En qué podemos ayudarte?",
    "language": "es",
    "category": "customer_service"
  }
  ```
- **Validación**: Template creado con status "pending"

#### Paso 5: Agregar primer cliente
- **Acción**: Ir a `http://localhost:3000/customers` → "Agregar Cliente"
- **Datos**: Nombre: `Cliente Prueba`, Teléfono: `+5491111111111`, Email: `cliente@test.com`
- **Validación**: Cliente aparece en lista con status "active"

#### Paso 6: Enviar primer mensaje
- **Acción**: Ir a `http://localhost:3000/messages` → "Enviar Mensaje"
- **Datos**: Destinatario: `Cliente Prueba`, Mensaje: `Hola, este es nuestro primer mensaje de prueba`
- **Validación**: Mensaje enviado, aparece en historial con status "sent"

#### Paso 7: Verificar dashboard
- **Acción**: Ir a `http://localhost:3000` (dashboard principal)
- **Validación**: 
  - 1 cuenta WhatsApp activa
  - 1 cliente registrado
  - 1 mensaje enviado
  - 1 template creado

### Criterios de Éxito
✅ Usuario puede completar setup sin errores  
✅ Cuenta WhatsApp configurada y activa  
✅ Primer mensaje enviado exitosamente  
✅ Dashboard muestra métricas correctas  

### Evidencia a Capturar
- Screenshot del dashboard final
- Log del mensaje enviado
- Lista de clientes con el nuevo cliente

---

## 📋 CASO DE USO 2: Gestión Completa de Cliente con Segmentación

**Objetivo**: Validar el ciclo completo de gestión de cliente desde creación hasta campaña segmentada.

**Tiempo Estimado**: 12-15 minutos  
**Prioridad**: CORE  
**Actor**: Usuario de marketing

### Precondiciones
- Sistema configurado (Caso de Uso 1 completado)
- Usuario con sesión activa

### Pasos del Flujo

#### Paso 1: Crear cliente con información completa
- **Acción**: `POST /customers` vía Postman o Frontend
- **Datos**: 
  ```json
  {
    "name": "María García Premium",
    "phone": "+5492222222222",
    "email": "maria.premium@test.com",
    "notes": "Cliente potencial VIP"
  }
  ```
- **Validación**: Cliente creado con ID único

#### Paso 2: Crear tags de segmentación
- **Acción**: `POST /customer-tags` 
- **Datos**: 
  ```json
  [
    {"name": "VIP", "description": "Cliente VIP", "color": "#gold"},
    {"name": "Premium", "description": "Cliente Premium", "color": "#blue"},
    {"name": "Activo", "description": "Cliente activo", "color": "#green"}
  ]
  ```
- **Validación**: 3 tags creados exitosamente

#### Paso 3: Asignar tags al cliente
- **Acción**: `POST /customer-tags/assign`
- **Datos**: 
  ```json
  {
    "customerIds": ["<id_maria>"],
    "tagIds": ["<id_vip>", "<id_premium>", "<id_activo>"]
  }
  ```
- **Validación**: Tags asignados, cliente aparece con etiquetas

#### Paso 4: Crear template personalizado para VIPs
- **Acción**: `POST /templates`
- **Datos**: 
  ```json
  {
    "name": "Mensaje VIP",
    "content": "Estimado/a {{name}}, como cliente VIP tiene acceso exclusivo a nuestras ofertas especiales.",
    "language": "es"
  }
  ```
- **Validación**: Template creado

#### Paso 5: Filtrar clientes por tags
- **Acción**: `GET /customers?tags=VIP,Premium`
- **Validación**: Solo aparece María García en resultados

#### Paso 6: Enviar mensaje segmentado
- **Acción**: `POST /messages/send` con template VIP
- **Datos**: Usar template creado para cliente VIP
- **Validación**: Mensaje enviado con template personalizado

#### Paso 7: Verificar historial del cliente
- **Acción**: `GET /customers/<id_maria>`
- **Validación**: 
  - Cliente muestra tags asignados
  - Historial de mensajes completo
  - Información de contacto actualizada

### Criterios de Éxito
✅ Cliente creado con información completa  
✅ Sistema de tags funcionando  
✅ Segmentación por tags efectiva  
✅ Mensajes personalizados por segmento  
✅ Historial de interacciones completo  

### Evidencia a Capturar
- Lista de clientes filtrada por tags
- Mensaje enviado con template personalizado
- Vista de detalle del cliente con tags

---

## 🎯 CASO DE USO 3: Campaña de Marketing Masiva End-to-End

**Objetivo**: Ejecutar una campaña completa desde template hasta análisis de resultados.

**Tiempo Estimado**: 20-25 minutos  
**Prioridad**: CORE  
**Actor**: Gerente de marketing

### Precondiciones
- 10+ clientes en base de datos
- Sistema de tags configurado
- Cuenta WhatsApp activa

### Pasos del Flujo

#### Paso 1: Importar lista de clientes masivamente
- **Acción**: `POST /customers/import/csv`
- **Datos**: CSV con 50 clientes de prueba
- **Estructura CSV**:
  ```csv
  name,phone,email,status
  Cliente 1,+5491111111111,c1@test.com,active
  Cliente 2,+5491111111112,c2@test.com,active
  ...
  ```
- **Validación**: 50 clientes importados exitosamente

#### Paso 2: Segmentar clientes importados
- **Acción**: Asignar tags masivamente por lotes
- **Datos**: 
  - 20 clientes → Tag "Promoción"
  - 15 clientes → Tag "Newsletter"  
  - 15 clientes → Tag "VIP"
- **Validación**: Tags asignados correctamente

#### Paso 3: Crear template de campaña
- **Acción**: `POST /templates`
- **Datos**: 
  ```json
  {
    "name": "Campaña Febrero 2025",
    "content": "¡Hola {{name}}! 🎉 Tenemos una oferta especial para ti. Descuento del 30% en todos nuestros productos. Válido hasta el 28/02. ¿Te interesa?",
    "language": "es",
    "category": "marketing"
  }
  ```
- **Validación**: Template creado

#### Paso 4: Someter template a aprobación
- **Acción**: `POST /templates/<id>/submit`
- **Validación**: Status cambia a "pending_approval"

#### Paso 5: Aprobar template (como admin)
- **Acción**: `POST /templates/<id>/approve`
- **Datos**: `{"whatsappTemplateId": "campaign_feb_2025"}`
- **Validación**: Status cambia a "approved"

#### Paso 6: Ejecutar envío masivo por segmentos
- **Acción**: `POST /messages/bulk-send`
- **Datos**: 
  ```json
  {
    "customerIds": ["<todos_los_ids_con_tag_promocion>"],
    "templateId": "<id_template_aprobado>",
    "scheduleFor": "immediate"
  }
  ```
- **Validación**: Jobs creados en cola, mensajes programados

#### Paso 7: Monitorear progreso de campaña
- **Acción**: `GET /queue/status` y `GET /messages/stats`
- **Validación**: 
  - Cola procesando correctamente
  - Estadísticas de envío actualizándose
  - Sin errores críticos

#### Paso 8: Analizar resultados de campaña
- **Acción**: `GET /messages?dateFrom=hoy&type=template`
- **Validación**: 
  - 20 mensajes enviados exitosamente
  - Métricas de entrega correctas
  - Log de errores vacío o mínimo

### Criterios de Éxito
✅ Importación masiva exitosa  
✅ Segmentación automática funcionando  
✅ Workflow de aprobación completo  
✅ Envío masivo sin errores  
✅ Monitoreo en tiempo real  
✅ Métricas de campaña precisas  

### Evidencia a Capturar
- Dashboard de estadísticas de campaña
- Lista de mensajes enviados
- Estado de la cola de trabajos

---

## 📨 CASO DE USO 4: Procesamiento de Conversación Entrante

**Objetivo**: Validar el flujo completo de recepción y procesamiento de mensajes entrantes vía webhook.

**Tiempo Estimado**: 10-12 minutos  
**Prioridad**: CORE  
**Actor**: Sistema automatizado + Agente de soporte

### Precondiciones
- Webhook configurado en WhatsApp Business
- Cliente existente en sistema
- Respuestas automáticas configuradas

### Pasos del Flujo

#### Paso 1: Simular mensaje entrante vía webhook
- **Acción**: `POST /webhook/whatsapp`
- **Datos**: 
  ```json
  {
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "ENTRY_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "5491234567890",
            "phone_number_id": "PHONE_ID"
          },
          "messages": [{
            "from": "+5491111111111",
            "id": "MSG_123456",
            "timestamp": "1640995200",
            "text": {
              "body": "Hola, necesito información sobre sus productos"
            },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }
  ```
- **Validación**: Webhook procesado, status 200

#### Paso 2: Verificar registro de mensaje entrante
- **Acción**: `GET /messages?recipientNumber=+5491111111111`
- **Validación**: Mensaje aparece con status "received", dirección "inbound"

#### Paso 3: Verificar identificación de cliente
- **Acción**: `GET /customers?phone=+5491111111111`
- **Validación**: Cliente identificado correctamente, opt-in status actualizado

#### Paso 4: Activar respuesta automática
- **Acción**: Sistema debe activar template de respuesta automática
- **Validación**: Respuesta automática enviada dentro de 30 segundos

#### Paso 5: Verificar conversación completa
- **Acción**: `GET /messages?recipientNumber=+5491111111111&full=true`
- **Validación**: 
  - Mensaje entrante registrado
  - Respuesta automática enviada
  - Conversación vinculada correctamente

#### Paso 6: Simular respuesta manual del agente
- **Acción**: `POST /messages/send`
- **Datos**: 
  ```json
  {
    "recipientNumber": "+5491111111111",
    "content": "Hola! Gracias por contactarnos. Te voy a enviar información detallada sobre nuestros productos.",
    "type": "text",
    "replyToMessageId": "MSG_123456"
  }
  ```
- **Validación**: Mensaje manual enviado, conversación continuada

### Criterios de Éxito
✅ Webhook procesa mensajes entrantes  
✅ Clientes identificados automáticamente  
✅ Respuestas automáticas funcionando  
✅ Conversaciones hiladas correctamente  
✅ Agentes pueden responder manualmente  

### Evidencia a Capturar
- Log del webhook procesado
- Historial completo de conversación
- Timestamp de respuesta automática

---

## 📄 CASO DE USO 5: Workflow de Aprobación de Templates

**Objetivo**: Validar el ciclo completo de creación, revisión y aprobación de templates empresariales.

**Tiempo Estimado**: 15-18 minutos  
**Prioridad**: IMPORTANTE  
**Actor**: Creador de contenido + Supervisor + Admin

### Precondiciones
- Usuarios con diferentes roles (user, admin)
- Sistema de permisos configurado

### Pasos del Flujo

#### Paso 1: Crear template como usuario (rol: user)
- **Actor**: Usuario regular
- **Acción**: `POST /templates`
- **Datos**: 
  ```json
  {
    "name": "Oferta Black Friday",
    "content": "🔥 BLACK FRIDAY ESPECIAL 🔥\n\nHola {{name}}, aprovecha descuentos de hasta 70% en toda nuestra tienda. Solo por hoy!\n\n👉 Código: BF2025\n\n¿Te interesa conocer más?",
    "language": "es",
    "category": "promotional"
  }
  ```
- **Validación**: Template creado con status "draft"

#### Paso 2: Enviar para revisión
- **Acción**: `POST /templates/<id>/submit`
- **Validación**: Status cambia a "pending_approval", notificación a supervisores

#### Paso 3: Revisar template (como supervisor)
- **Actor**: Usuario admin
- **Acción**: `GET /templates?status=pending_approval`
- **Validación**: Template aparece en lista de pendientes

#### Paso 4: Rechazar template con feedback
- **Acción**: `POST /templates/<id>/reject`
- **Datos**: 
  ```json
  {
    "rejectionReason": {
      "code": "COMPLIANCE_ISSUE",
      "message": "El template debe incluir opción de opt-out",
      "details": "Agregar: 'Responde STOP para no recibir más mensajes'"
    }
  }
  ```
- **Validación**: Status cambia a "rejected", feedback visible para creador

#### Paso 5: Corregir template (como usuario original)
- **Acción**: `PATCH /templates/<id>`
- **Datos**: 
  ```json
  {
    "content": "🔥 BLACK FRIDAY ESPECIAL 🔥\n\nHola {{name}}, aprovecha descuentos de hasta 70% en toda nuestra tienda. Solo por hoy!\n\n👉 Código: BF2025\n\n¿Te interesa conocer más?\n\nResponde STOP para no recibir más mensajes."
  }
  ```
- **Validación**: Template actualizado, status vuelve a "draft"

#### Paso 6: Reenviar para aprobación
- **Acción**: `POST /templates/<id>/submit`
- **Validación**: Status cambia a "pending_approval" nuevamente

#### Paso 7: Aprobar template corregido
- **Actor**: Usuario admin
- **Acción**: `POST /templates/<id>/approve`
- **Datos**: `{"whatsappTemplateId": "bf_special_2025"}`
- **Validación**: Status cambia a "approved", template disponible para uso

#### Paso 8: Usar template aprobado en campaña
- **Acción**: `POST /messages/bulk-send` usando template aprobado
- **Validación**: Mensajes enviados exitosamente con template aprobado

### Criterios de Éxito
✅ Workflow de aprobación completo  
✅ Feedback de rechazo claro y útil  
✅ Correcciones aplicadas correctamente  
✅ Template aprobado funcional  
✅ Permisos por rol respetados  

### Evidencia a Capturar
- Historial de estados del template
- Feedback de rechazo documentado
- Template final aprobado y en uso

---

## 📊 CASO DE USO 6: Importación Masiva con Segmentación Inteligente

**Objetivo**: Validar la capacidad de importar grandes volúmenes de clientes y segmentarlos automáticamente.

**Tiempo Estimado**: 12-15 minutos  
**Prioridad**: IMPORTANTE  
**Actor**: Analista de datos

### Precondiciones
- Sistema configurado para importaciones
- Tags predefinidos disponibles
- Archivo CSV preparado

### Pasos del Flujo

#### Paso 1: Preparar archivo CSV con datos diversos
- **Acción**: Crear archivo con 100+ registros
- **Estructura**: 
  ```csv
  name,phone,email,status,source,value
  Cliente Premium A,+5491111111111,premium.a@test.com,active,web,1500
  Cliente Regular B,+5491111111112,regular.b@test.com,active,phone,300
  Cliente VIP C,+5491111111113,vip.c@test.com,active,referral,5000
  ...
  ```
- **Validación**: Archivo CSV válido preparado

#### Paso 2: Importar clientes vía API
- **Acción**: `POST /customers/import/csv`
- **Datos**: Upload del archivo CSV
- **Validación**: 
  - Procesamiento exitoso
  - Reporte de importación detallado
  - Clientes duplicados identificados

#### Paso 3: Verificar importación completa
- **Acción**: `GET /customers?limit=200`
- **Validación**: 100+ clientes nuevos en sistema

#### Paso 4: Crear reglas de segmentación automática
- **Acción**: Segmentar clientes basado en criterios:
  - Value > 1000 → Tag "VIP"
  - Source = "referral" → Tag "Referido"
  - Status = "active" → Tag "Activo"
- **Validación**: Reglas aplicadas correctamente

#### Paso 5: Ejecutar segmentación masiva
- **Acción**: Usar múltiples `POST /customer-tags/assign` para aplicar reglas
- **Validación**: Tags asignados según criterios establecidos

#### Paso 6: Validar segmentación
- **Acción**: 
  - `GET /customers?tags=VIP` (debe retornar clientes con value > 1000)
  - `GET /customers?tags=Referido` (debe retornar clientes con source = referral)
- **Validación**: Segmentación precisa según reglas

#### Paso 7: Crear campaña dirigida por segmento
- **Acción**: `POST /messages/bulk-send` para cada segmento
- **Datos**: Mensajes personalizados por tipo de cliente
- **Validación**: Campañas dirigidas enviadas correctamente

### Criterios de Éxito
✅ Importación masiva sin pérdida de datos  
✅ Segmentación automática precisa  
✅ Campañas dirigidas por segmento  
✅ Rendimiento aceptable con volúmenes altos  

### Evidencia a Capturar
- Reporte de importación completo
- Estadísticas de segmentación
- Métricas de campañas por segmento

---

## 🔧 CASO DE USO 7: Gestión Multi-Cuenta WhatsApp

**Objetivo**: Validar la capacidad de gestionar múltiples cuentas WhatsApp Business simultáneamente.

**Tiempo Estimado**: 18-20 minutos  
**Prioridad**: IMPORTANTE  
**Actor**: Administrador de cuentas

### Precondiciones
- Permisos de administrador
- Múltiples números WhatsApp Business disponibles para testing

### Pasos del Flujo

#### Paso 1: Agregar segunda cuenta WhatsApp
- **Acción**: `POST /accounts`
- **Datos**: 
  ```json
  {
    "name": "Cuenta Ventas",
    "phone": "+5491234567891",
    "businessVerified": true,
    "department": "sales"
  }
  ```
- **Validación**: Segunda cuenta creada exitosamente

#### Paso 2: Agregar tercera cuenta WhatsApp
- **Acción**: `POST /accounts`
- **Datos**: 
  ```json
  {
    "name": "Cuenta Soporte",
    "phone": "+5491234567892",
    "businessVerified": true,
    "department": "support"
  }
  ```
- **Validación**: Tercera cuenta creada exitosamente

#### Paso 3: Verificar listado de cuentas
- **Acción**: `GET /accounts`
- **Validación**: 3 cuentas listadas con información correcta

#### Paso 4: Probar conexión de cada cuenta
- **Acción**: Para cada cuenta: `POST /accounts/<id>/test-connection`
- **Validación**: Status de conexión reportado para cada una

#### Paso 5: Alternar cuenta activa
- **Acción**: 
  1. `POST /accounts/<id_ventas>/set-active`
  2. Verificar: `GET /accounts/active`
  3. `POST /accounts/<id_soporte>/set-active`
  4. Verificar: `GET /accounts/active`
- **Validación**: Cuenta activa cambia correctamente

#### Paso 6: Enviar mensajes desde diferentes cuentas
- **Acción**: 
  1. Activar "Cuenta Ventas"
  2. `POST /messages/send` (mensaje de ventas)
  3. Activar "Cuenta Soporte" 
  4. `POST /messages/send` (mensaje de soporte)
- **Validación**: Mensajes enviados desde cuentas correctas

#### Paso 7: Verificar estadísticas por cuenta
- **Acción**: Para cada cuenta: `GET /accounts/<id>/stats`
- **Validación**: Estadísticas independientes por cuenta

#### Paso 8: Gestionar cuenta problemática
- **Acción**: 
  1. Simular problema en una cuenta
  2. `POST /accounts/<id>/refresh`
  3. Verificar recuperación
- **Validación**: Sistema maneja cuentas problemáticas correctamente

### Criterios de Éxito
✅ Múltiples cuentas gestionadas simultáneamente  
✅ Alternancia entre cuentas sin errores  
✅ Mensajes enviados desde cuenta correcta  
✅ Estadísticas independientes por cuenta  
✅ Recuperación de cuentas problemáticas  

### Evidencia a Capturar
- Lista de cuentas configuradas
- Estadísticas por cuenta
- Log de mensajes por cuenta de origen

---

## 🔍 CASO DE USO 8: Monitoreo y Resolución de Problemas

**Objetivo**: Validar capacidades de monitoreo, detección de problemas y resolución automática.

**Tiempo Estimado**: 15-18 minutos  
**Prioridad**: OPERACIONAL  
**Actor**: Administrador de sistemas

### Precondiciones
- Sistema en funcionamiento con actividad
- Cola de mensajes con trabajos pendientes
- Logs habilitados

### Pasos del Flujo

#### Paso 1: Verificar health check completo
- **Acción**: 
  - `GET /health`
  - `GET /config`
  - `GET /wppMS`
- **Validación**: Todos los servicios reportan estado saludable

#### Paso 2: Monitorear estado de la cola
- **Acción**: `GET /queue/status`
- **Validación**: 
  - Cola procesando normalmente
  - Métricas de trabajos actualizadas
  - Sin trabajos fallidos antiguos

#### Paso 3: Simular falla en envío de mensajes
- **Acción**: 
  1. `POST /messages/send` con número inválido
  2. `POST /messages/bulk-send` con datos incorrectos
- **Validación**: Errores manejados correctamente, sin crash del sistema

#### Paso 4: Verificar manejo de errores
- **Acción**: `GET /messages?status=failed`
- **Validación**: 
  - Mensajes fallidos identificados
  - Razones de falla documentadas
  - Reintentos automáticos programados

#### Paso 5: Ejecutar recuperación automática
- **Acción**: `POST /queue/retry-failed`
- **Validación**: 
  - Trabajos fallidos reintentados
  - Algunos errores resueltos automáticamente
  - Log de recuperación detallado

#### Paso 6: Verificar estadísticas del sistema
- **Acción**: 
  - `GET /messages/stats`
  - `GET /customer-tags/stats`
- **Validación**: 
  - Métricas precisas y actualizadas
  - Tendencias identificables
  - Sin inconsistencias en datos

#### Paso 7: Simular problema de base de datos
- **Acción**: 
  1. Pausar conexión a MySQL temporalmente
  2. Intentar operaciones
  3. Restaurar conexión
- **Validación**: 
  - Sistema detecta problema de conectividad
  - Reconexión automática funciona
  - Operaciones se reanudan normalmente

#### Paso 8: Generar reporte de incidentes
- **Acción**: Compilar información de logs y métricas
- **Validación**: 
  - Información suficiente para debugging
  - Timestamps precisos
  - Correlación entre eventos

### Criterios de Éxito
✅ Monitoreo continuo funcionando  
✅ Detección automática de problemas  
✅ Recuperación automática efectiva  
✅ Logs informativos y útiles  
✅ Métricas precisas en tiempo real  

### Evidencia a Capturar
- Dashboard de health check
- Log de errores y recuperación
- Reporte de métricas del sistema

---

## ⚠️ CASOS DE ERROR CRÍTICOS

### ERROR CRÍTICO 1: Pérdida de Mensajes en Cola

**Escenario**: Sistema falla durante procesamiento masivo
**Pasos**:
1. Iniciar envío masivo de 100 mensajes
2. Simular caída del servidor a los 30 segundos
3. Reiniciar sistema
4. Verificar integridad de mensajes

**Criterio de Éxito**: ✅ Ningún mensaje se pierde, todos son reintentados

### ERROR CRÍTICO 2: Webhook Duplicado

**Escenario**: WhatsApp envía webhook duplicado
**Pasos**:
1. Procesar webhook inicial
2. Enviar mismo webhook inmediatamente
3. Verificar deduplicación

**Criterio de Éxito**: ✅ Mensaje no se duplica en sistema

### ERROR CRÍTICO 3: Autenticación Comprometida

**Escenario**: Token JWT comprometido
**Pasos**:
1. Generar token válido
2. Simular compromiso de token
3. Intentar operaciones sensibles
4. Verificar revocación

**Criterio de Éxito**: ✅ Acceso denegado inmediatamente

---

## 📋 Checklist de Ejecución

### Antes de Comenzar
- [ ] Ambiente de testing limpio
- [ ] Base de datos respaldada
- [ ] Servicios corriendo (MySQL, Redis, Backend, Frontend)
- [ ] Credenciales de prueba validadas
- [ ] Postman/herramientas de testing preparadas

### Durante la Ejecución
- [ ] Ejecutar casos en orden secuencial
- [ ] Capturar evidencia de cada paso crítico
- [ ] Documentar cualquier desviación o error
- [ ] Verificar criterios de éxito antes de continuar
- [ ] Limpiar datos entre casos cuando sea necesario

### Después de Completar
- [ ] Restaurar estado inicial del sistema
- [ ] Compilar reporte de resultados
- [ ] Documentar bugs encontrados
- [ ] Archivar evidencia capturada

---

## 🛠️ Herramientas Recomendadas

- **Postman**: Para tests de API
- **Browser DevTools**: Para debugging frontend
- **MySQL Workbench**: Para verificar datos
- **Redis CLI**: Para monitorear cola
- **Screenshots**: Para evidencia visual

---

**Tiempo Total Estimado**: 2-3 horas para ejecución completa  
**Casos Críticos**: 1, 2, 3, 4 (deben ejecutarse siempre)  
**Casos Importantes**: 5, 6, 7 (ejecutar según tiempo disponible)  
**Casos Operacionales**: 8 + Errores críticos (para testing exhaustivo)

**Última Actualización**: 21 de Agosto, 2025  
**Versión**: 2.0.0  
**Responsable**: QA Team IRIS

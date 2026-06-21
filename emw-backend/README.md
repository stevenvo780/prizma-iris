# 📱 IRIS Backend API

## Enhanced Marketing WhatsApp - Backend Service

<div align="center">

![IRIS Logo](https://img.shields.io/badge/IRIS-Backend-blue?style=for-the-badge&logo=whatsapp)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

**Plataforma unificada de marketing automation para WhatsApp Business**  
_Parte del Ecosistema Prizma_

</div>

## 🌟 Descripción General

IRIS Backend es el núcleo del sistema de marketing automation de WhatsApp del **Ecosistema Prizma**. Esta API robusta y escalable consolida las funcionalidades de iris-api y wpp-api-oficial en una sola aplicación NestJS moderna, proporcionando una solución completa para la gestión de campañas de marketing a través de WhatsApp Business.

### 🎯 Propósito en el Ecosistema

- **Centro de comunicación**: Gestiona todas las comunicaciones WhatsApp del ecosistema
- **Integración con Hermes**: Envía notificaciones de pedidos y promociones
- **Soporte a Talaria**: Notificaciones de entregas y estados
- **Marketing automation**: Campañas personalizadas y segmentadas

## ✨ Características Principales

### 🔐 Autenticación Avanzada

- **JWT Authentication** con refresh tokens
- **Control de acceso basado en roles** (Admin, Marketing, Operator)
- **Integración Firebase Auth** para autenticación unificada
- **API Key protection** para endpoints sensibles

### 📨 Gestión de Mensajes

- **Envío masivo** con rate limiting inteligente
- **Plantillas dinámicas** con variables personalizables
- **Media support** (imágenes, documentos, videos)
- **Message queuing** con Redis para alta disponibilidad
- **Delivery tracking** y análisis de entrega

### 🔄 Sistema de Colas

- **Redis-based queuing** para procesamiento asíncrono
- **Priority queues** para mensajes urgentes
- **Retry mechanisms** con backoff exponencial
- **Dead letter queues** para mensajes fallidos

### 📊 Analytics y Métricas

- **Real-time metrics** de envío y entrega
- **Conversion tracking** integrado
- **Customer engagement** analytics
- **Campaign performance** reporting

### 🔗 Integraciones del Ecosistema

- **Hermes Integration**: Notificaciones de pedidos
- **Talaria Integration**: Updates de entregas
- **Firebase Integration**: Autenticación y notificaciones
- **Webhook support**: Para servicios externos

## 🛠️ Stack Tecnológico

| Tecnología         | Versión | Propósito                     |
| ------------------ | ------- | ----------------------------- |
| **NestJS**         | ^10.0.0 | Framework backend principal   |
| **TypeScript**     | ^5.9.2  | Lenguaje de desarrollo        |
| **MySQL**          | ^8.0    | Base de datos principal       |
| **TypeORM**        | ^0.3.x  | ORM para base de datos        |
| **Redis**          | ^6.0    | Caching y sistema de colas    |
| **JWT**            | ^9.0.2  | Autenticación y autorización  |
| **Firebase Admin** | ^13.4.0 | Integración Firebase          |
| **Express**        | ^4.18.2 | Framework HTTP subyacente     |
| **Docker**         | Latest  | Containerización y despliegue |

## 🏗️ Arquitectura del Sistema

### Módulos Principales

```
📦 IRIS Backend
├── 🔐 Auth Module          # Autenticación y autorización
├── 📱 WhatsApp Module      # Integración WhatsApp Business API
├── 📨 Messages Module      # Gestión de mensajes
├── 👥 Customers Module     # Gestión de clientes
├── 📋 Templates Module     # Plantillas de mensajes
├── 🔄 Queue Module         # Sistema de colas
├── 📊 Metrics Module       # Analytics y métricas
├── 🔗 Webhook Module       # Webhooks entrantes
└── ⚙️ Config Module        # Configuración del sistema
```

### Estructura Detallada del Proyecto

```
📁 iris-backend/
├── 📄 app.module.ts              # Módulo principal de la aplicación
├── 📄 index.ts                   # Punto de entrada principal
├── 📁 config/                    # Archivos de configuración
│   ├── 📄 auth.config.ts         # Configuración de autenticación
│   ├── 📄 database.config.ts     # Configuración de base de datos
│   ├── 📄 firebase.config.ts     # Configuración Firebase
│   └── 📄 redis.config.ts        # Configuración Redis
├── 📁 models/                    # Entidades TypeORM
│   ├── 📄 base.entity.ts         # Entidad base común
│   ├── 📄 user.entity.ts         # Usuarios del sistema
│   ├── 📄 customer.entity.ts     # Clientes/contactos
│   ├── 📄 whatsapp-account.entity.ts # Cuentas WhatsApp
│   ├── 📄 message-log.entity.ts  # Historial de mensajes
│   └── 📄 template.entity.ts     # Plantillas de mensajes
├── 📁 modules/                   # Módulos funcionales
│   ├── 📁 auth/                  # Autenticación y autorización
│   ├── 📁 accounts/              # Gestión de cuentas WhatsApp
│   ├── 📁 customers/             # Gestión de clientes
│   ├── 📁 messages/              # Envío y gestión de mensajes
│   ├── 📁 templates/             # Plantillas de mensajes
│   ├── 📁 queue/                 # Sistema de colas
│   ├── 📁 webhook/               # Webhooks de WhatsApp
│   └── 📁 metrics/               # Analytics y métricas
├── 📁 middleware/                # Middleware personalizado
├── 📁 controllers/               # Controladores HTTP
├── 📁 scripts/                   # Scripts de utilidad
│   ├── 📄 setup-environment.sh   # Configuración del entorno
│   ├── 📄 seed-templates.js      # Sembrar plantillas
│   └── 📄 check-health.sh        # Health check
└── 📁 tests/                     # Framework de testing
    ├── 📄 run_all_tests.sh       # Ejecutar todos los tests
    ├── 📄 basic-structure-test.sh # Tests de estructura
    └── 📁 mock-data/             # Datos de prueba
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** >= 16.x
- **npm** >= 8.x o **yarn** >= 1.x
- **MySQL** >= 8.0
- **Redis** >= 6.0
- **Docker** (opcional)

### 1️⃣ Instalación de Dependencias

```bash
# Usando npm
npm install

# Usando yarn
yarn install
```

### 2️⃣ Configuración del Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar variables de entorno
nano .env
```

#### Variables de Entorno Principales

```bash
# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=irisuser
DB_PASSWORD=your_secure_password
DB_NAME=iris

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Firebase (Opcional)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Rate Limiting
RATE_LIMIT_MESSAGES_PER_MINUTE=100
RATE_LIMIT_WEBHOOK_PER_MINUTE=1000
```

### 3️⃣ Configuración de Base de Datos

```bash
# Crear base de datos MySQL
mysql -u root -p -e "CREATE DATABASE iris;"
mysql -u root -p -e "CREATE USER 'irisuser'@'localhost' IDENTIFIED BY 'your_secure_password';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON iris.* TO 'irisuser'@'localhost';"
mysql -u root -p -e "FLUSH PRIVILEGES;"
```

## 🏃‍♂️ Ejecución

### Desarrollo

```bash
# Modo desarrollo con hot reload
npm run dev

# Modo desarrollo con configuración específica
npm run dev:configurable  # Autenticación configurable
npm run dev:firebase      # Solo Firebase Auth
npm run dev:simple        # Configuración simple
```


### Producción

```bash
# Construir la aplicación
npm run build

# Ejecutar en producción
npm start
```

### Con Docker

```bash
# Construir imagen
docker build -t iris-backend .

# Ejecutar con docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f iris-backend
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm run test
# o
bash tests/run_all_tests.sh

# Tests específicos
bash tests/basic-structure-test.sh      # Estructura básica
bash tests/code-validation-test.sh      # Validación de código
bash tests/01-api-health.sh            # Health check
bash tests/03-auth-flow.sh             # Flujo de autenticación
bash tests/06-message-sending.sh       # Envío de mensajes
```

### Cobertura de Tests

```bash
# Generar reporte de cobertura
npm run test:coverage

# Ver reporte en navegador
open coverage/index.html
```

## 📡 API Endpoints

### 🔐 Autenticación

```http
POST /auth/login              # Iniciar sesión
POST /auth/register           # Registrar usuario
POST /auth/refresh            # Renovar token
POST /auth/logout             # Cerrar sesión
GET  /auth/profile            # Obtener perfil
```

### 📱 Cuentas WhatsApp

```http
GET    /accounts              # Listar cuentas
POST   /accounts              # Crear cuenta
GET    /accounts/:id          # Obtener cuenta
PUT    /accounts/:id          # Actualizar cuenta
DELETE /accounts/:id          # Eliminar cuenta
POST   /accounts/:id/verify   # Verificar cuenta
```

### 📨 Mensajes

```http
POST /messages/send           # Enviar mensaje individual
POST /messages/send-bulk      # Envío masivo
GET  /messages                # Historial de mensajes
GET  /messages/:id            # Obtener mensaje específico
GET  /messages/stats          # Estadísticas de envío
```

### 👥 Clientes

```http
GET    /customers             # Listar clientes
POST   /customers             # Crear cliente
GET    /customers/:id         # Obtener cliente
PUT    /customers/:id         # Actualizar cliente
DELETE /customers/:id         # Eliminar cliente
POST   /customers/import      # Importar clientes CSV/Excel
```

### 📋 Plantillas

```http
GET    /templates             # Listar plantillas
POST   /templates             # Crear plantilla
GET    /templates/:id         # Obtener plantilla
PUT    /templates/:id         # Actualizar plantilla
DELETE /templates/:id         # Eliminar plantilla
POST   /templates/:id/preview # Preview con variables
```


### 📊 Métricas

```http
GET /metrics/dashboard        # Dashboard principal
GET /metrics/messages         # Métricas de mensajes
GET /metrics/engagement       # Engagement de clientes
GET /metrics/campaigns        # Rendimiento de campañas
```

### 🔗 Webhooks

```http
POST /webhook/whatsapp        # Webhook de WhatsApp
GET  /webhook/verify          # Verificación de webhook
```

El webhook de WhatsApp valida opcionalmente la firma con `WHATSAPP_WEBHOOK_SECRET` (App Secret de Meta). Para la verificación inicial usa `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Si un usuario responde con "SÍ", "SI" o "YES", se registra opt-in y se disparan mensajes pendientes almacenados para ese número.

### ⚡ Health Check

```http
GET /health                   # Estado del servicio
GET /health/database          # Estado de la base de datos
GET /health/redis             # Estado de Redis
GET /health/whatsapp          # Estado WhatsApp API
```

## 🔧 Configuración Avanzada

### Modos de Autenticación

El sistema soporta múltiples modos de autenticación:

1. **Modo Configurable** (Recomendado)
   - JWT + Firebase Auth
   - Control granular de permisos

2. **Modo Firebase**
   - Solo Firebase Authentication
   - Ideal para integración ecosistema

3. **Modo Simple**
   - Solo JWT local
   - Para desarrollo y testing

### Rate Limiting

```javascript

{
  messages: 100,
  webhooks: 1000,
  auth: 5,
  windowMs: 60000
}
```

### Integración con Ecosistema Prizma

```bash
# Variables de integración
HERMES_API_URL=http://localhost:3001       # API de Hermes
TALARIA_API_URL=http://localhost:3002 # API de Talaria
ECOSYSTEM_API_KEY=your_ecosystem_key     # API Key compartida
```

## 🔗 Integraciones

### Hermes E-commerce

- Notificaciones de pedidos nuevos
- Confirmaciones de pago
- Updates de estado de pedidos
- Promociones y ofertas

### Talaria Entregas

- Notificaciones de asignación de pedidos
- Updates de estado de entrega
- Confirmaciones de entrega

### Firebase Services

- Authentication unificada
- Cloud messaging
- Real-time database sync

## 📈 Monitoreo y Logs

### Logs Estructurados

```bash
# Ver logs en desarrollo
npm run logs

# Logs de producción con Docker
docker-compose logs -f iris-backend
```

### Métricas de Performance

- Tiempo de respuesta API
- Throughput de mensajes
- Rate de entrega WhatsApp
- Uso de memoria y CPU

## 🚀 Despliegue

### Producción con Docker

```bash
# Producción
docker-compose -f docker-compose.prod.yml up -d

# Staging
docker-compose -f docker-compose.staging.yml up -d
```

### Variables de Entorno por Ambiente

```bash
# Desarrollo
source .env.development

# Staging
source .env.staging

# Producción
source .env.production
```

## 🤝 Contribución

### Proceso de Desarrollo

1. **Fork** del repositorio
2. **Branch** específico: `feature/nueva-funcionalidad`
3. **Tests** para nuevas funcionalidades
4. **Code review** antes del merge
5. **Pull request** con descripción detallada

### Estándares de Código

- **ESLint** para linting
- **Prettier** para formateo
- **Conventional Commits** para mensajes
- **TypeScript strict mode**

### Testing Requirements

- **Cobertura mínima**: 80%
- **Unit tests** para servicios
- **Integration tests** para endpoints
- **E2E tests** para flujos críticos

## 📞 Soporte

### Contacto

- **Maintainer**: Steven Vallejo Ortiz
- **Email**: stevenvallejo780@gmail.com
- **Issues**: GitHub Issues del repositorio

### Documentación Adicional

- [Ecosistema Prizma](../../README.md)
- [IRIS Frontend](../iris-frontend/README.md)
- [API Documentation](https://your-domain.com/api/docs)

---

<div align="center">

**IRIS Backend API v2.0.0**  
_Parte del Ecosistema Prizma_

![Prizma](https://img.shields.io/badge/Prizma-Ecosystem-orange?style=for-the-badge)

</div>

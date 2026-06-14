# 📱 EMW - Enhanced Marketing WhatsApp
## Sistema Completo de Mensajería Masiva para WhatsApp Business

<div align="center">

![EMW Logo](https://img.shields.io/badge/EMW-Full%20Stack-blue?style=for-the-badge&logo=whatsapp)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

**Plataforma completa de marketing automation para WhatsApp Business**  
*Desarrollado para el Ecosistema Humanizar*

[📱 Demo en Vivo](#demo) | [🚀 Instalación](#instalación) | [📖 Documentación](#documentación) | [🤝 Contribuir](#contribuir)

</div>

---

## 🌟 Descripción General

EMW es una plataforma completa de **mensajería masiva para WhatsApp Business** que permite a las empresas gestionar campañas de marketing, enviar mensajes masivos, crear plantillas dinámicas y administrar listas de clientes de manera eficiente y escalable.

### 🎯 Funcionalidades Principales

#### 📨 **Gestión de Mensajes**
- ✅ **Envío masivo** a listas de clientes segmentadas
- ✅ **Plantillas dinámicas** con variables personalizables
- ✅ **Programación** de mensajes para fechas específicas
- ✅ **Múltiples tipos**: Texto, imágenes, documentos, videos
- ✅ **Sistema de colas** para envío escalable
- ✅ **Tracking completo** de estados de entrega

#### 👥 **Gestión de Clientes**
- ✅ **Base de datos** completa de contactos
- ✅ **Importación masiva** desde CSV/Excel
- ✅ **Segmentación por tags** personalizables
- ✅ **Campos personalizados** flexibles
- ✅ **Historial de comunicaciones**
- ✅ **Preferencias de contacto**

#### 📝 **Sistema de Plantillas**
- ✅ **Editor visual** de plantillas
- ✅ **Variables dinámicas** con preview
- ✅ **Estados de aprobación** (draft, pending, approved)
- ✅ **Integración con WhatsApp Business API**
- ✅ **Plantillas multimedia** (header, footer, botones)
- ✅ **Reutilización** y organización

#### 📱 **Cuentas WhatsApp Business**
- ✅ **Múltiples cuentas** por usuario
- ✅ **Configuración automática** de webhooks
- ✅ **Verificación de tokens** y permisos
- ✅ **Monitoring de estado** y conectividad
- ✅ **Límites de envío** automáticos

#### 📊 **Analytics y Métricas**
- ✅ **Dashboard en tiempo real**
- ✅ **Estadísticas de entrega** detalladas
- ✅ **Métricas de engagement**
- ✅ **Reportes exportables**
- ✅ **Análisis de rendimiento** de campañas

---

## 🏗️ Arquitectura del Sistema

### Backend (NestJS)
```
📦 emw-backend/
├── 🔐 auth/              # Autenticación JWT + roles
├── 📱 accounts/          # Gestión cuentas WhatsApp
├── 📨 messages/          # Envío y tracking de mensajes
├── 👥 customers/         # CRUD y segmentación de clientes
├── 📝 templates/         # Gestión de plantillas
├── 🔄 queue/             # Sistema de colas Redis
├── 📊 metrics/           # Analytics y reportes
├── 🔗 webhook/           # Webhooks de WhatsApp
└── ⚙️ config/            # Configuraciones del sistema
```

### Frontend (Next.js)
```
📦 emw-frontend/
├── 🏠 pages/
│   ├── 📨 messages/      # Dashboard principal
│   ├── 📝 templates/     # Editor de plantillas
│   ├── 👥 customers/     # Gestión de clientes
│   ├── 📱 whatsapp-sessions/ # Config cuentas WA
│   └── 🔐 login/         # Autenticación
├── 🧩 components/        # Componentes reutilizables
├── 🗄️ store/            # Estado global Redux
├── 🎨 styles/            # Estilos CSS/SCSS
└── 🛠️ utils/            # Utilidades y helpers
```

---

## 🚀 Instalación y Configuración

### 📋 Prerequisitos
- **Node.js** >= 18.x
- **MySQL** >= 8.0
- **Redis** >= 6.0
- **Cuenta WhatsApp Business API**
- **Cuenta Facebook Developer**

### 🔧 Backend Setup

1. **Clonar el repositorio**
```bash
git clone https://github.com/stevenvo780/emw-backend.git
cd emw-backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Variables de entorno requeridas**
```env
# Base de datos
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=tu_usuario
DATABASE_PASSWORD=tu_password
DATABASE_NAME=emw_database

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu_redis_password

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=24h

# WhatsApp Business API
WHATSAPP_TOKEN=tu_token_de_whatsapp
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=tu_business_account_id

# Webhooks
WEBHOOK_VERIFY_TOKEN=tu_webhook_verify_token
WEBHOOK_URL=https://tu-dominio.com/webhook

# Firebase (opcional)
FIREBASE_PROJECT_ID=tu_proyecto_firebase
FIREBASE_PRIVATE_KEY=tu_private_key
FIREBASE_CLIENT_EMAIL=tu_client_email
```

5. **Ejecutar migraciones**
```bash
npm run migration:run
```

6. **Iniciar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

### 🎨 Frontend Setup

1. **Navegar al directorio frontend**
```bash
cd ../emw-frontend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

4. **Variables de entorno del frontend**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_CONFIG='{
  "apiKey": "tu_api_key",
  "authDomain": "tu_auth_domain",
  "projectId": "tu_project_id"
}'
```

5. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

---

## 🔌 Configuración de WhatsApp Business API

### 1. Configurar Webhook en Facebook Developer

1. Ve a [Facebook Developer Console](https://developers.facebook.com/)
2. Selecciona tu aplicación WhatsApp Business
3. Ve a **WhatsApp > Configuration**
4. Configura el webhook:
   - **URL**: `https://tu-dominio.com/webhook`
   - **Verify Token**: El mismo que configuraste en `WEBHOOK_VERIFY_TOKEN`
5. Suscríbete a los eventos: `messages`, `message_deliveries`, `message_reads`

### 2. Obtener Tokens y IDs

```bash
# Verificar configuración
curl -X GET "https://graph.facebook.com/v18.0/me/whatsapp_business_accounts" \
-H "Authorization: Bearer TU_ACCESS_TOKEN"

# Obtener Phone Number ID
curl -X GET "https://graph.facebook.com/v18.0/TU_BUSINESS_ACCOUNT_ID/phone_numbers" \
-H "Authorization: Bearer TU_ACCESS_TOKEN"
```

---

## 📱 Uso de la Aplicación

### 1. **Configuración Inicial**

1. **Registrar cuenta**: Crear cuenta de usuario admin
2. **Conectar WhatsApp**: Agregar cuenta WhatsApp Business
3. **Verificar conexión**: Probar conectividad con la API

### 2. **Gestión de Clientes**

```typescript

const customers = [
  {
    firstName: "Juan",
    lastName: "Pérez", 
    phoneNumber: "+34612345678",
    email: "juan@email.com",
    tags: ["vip", "madrid"]
  }
];


```

### 3. **Crear Plantillas**

```typescript

const template = {
  name: "bienvenida_personalizada",
  category: "MARKETING",
  language: "es",
  body: "¡Hola {{1}}! Bienvenido a {{2}}. Tu código de descuento es {{3}}",
  parameters: [
    { name: "nombre", type: "TEXT", example: "Juan" },
    { name: "empresa", type: "TEXT", example: "Mi Empresa" },
    { name: "codigo", type: "TEXT", example: "DESC20" }
  ]
};


```

### 4. **Envío Masivo**

```typescript

const bulkMessage = {
  templateId: "template_id",
  customerTags: ["vip", "madrid"],
  templateParams: ["Mi Empresa", "DESC20"],
  scheduledAt: "2024-12-25T10:00:00Z"
};


```

---

## 🛠️ Desarrollo y Personalización

### Agregar Nuevos Tipos de Mensaje

```typescript

export enum MessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  MEDIA = 'media',
  INTERACTIVE = 'interactive',
  LOCATION = 'location',
  CONTACT = 'contact',
  CUSTOM_NEW_TYPE = 'custom_new_type'
}


private async sendCustomNewTypeMessage(messageLog: MessageLog, whatsappAccount: WhatsAppAccount): Promise<string> {

}
```

### Agregar Nuevos Campos a Clientes

```typescript

@Column({ type: 'json', nullable: true })
customFields: {
  empresa?: string;
  sector?: string;
  ingresos?: number;

};


export interface CreateCustomerDto {

  customFields?: {
    empresa?: string;
    sector?: string;
    ingresos?: number;
  };
}
```

### Personalizar Dashboard

```tsx

import { useMessages } from '@/hooks/useMessages';
import { Chart } from 'chart.js';

export const CustomDashboard = () => {
  const { getMessageStats } = useMessages();
  

  return (
    <div className="dashboard-grid">
      <MetricCard title="Mensajes Enviados" value={stats.sent} />
      <ConversionChart data={conversionData} />
      <RecentActivity activities={activities} />
    </div>
  );
};
```

---

## 📊 API Reference

### 🔐 **Autenticación**

```bash
# Login
POST /auth/login
{
  "email": "admin@empresa.com",
  "password": "password123"
}

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "admin@empresa.com",
    "role": "admin"
  }
}
```

### 📝 **Plantillas**

```bash
# Listar plantillas
GET /templates

# Crear plantilla
POST /templates
{
  "name": "promocion_verano",
  "category": "MARKETING",
  "language": "es",
  "body": "🌞 ¡Oferta especial de verano! {{1}} de descuento en {{2}}",
  "parameters": [
    {"name": "descuento", "type": "TEXT", "example": "20%"},
    {"name": "producto", "type": "TEXT", "example": "todos los productos"}
  ]
}

# Aprobar plantilla
POST /templates/{id}/approve
{
  "whatsappTemplateId": "promocion_verano_approved"
}
```

### 👥 **Clientes**

```bash
# Listar clientes con filtros
GET /customers?status=active&tags=vip,madrid&page=1&limit=50

# Crear cliente
POST /customers
{
  "firstName": "María",
  "lastName": "García",
  "phoneNumber": "+34987654321",
  "email": "maria@email.com",
  "tags": ["premium", "barcelona"],
  "customFields": {
    "empresa": "Tech Solutions",
    "sector": "tecnologia"
  }
}

# Importar desde CSV
POST /customers/import/csv
# Form data con archivo CSV
```

### 📨 **Mensajes**

```bash
# Envío simple
POST /messages/send
{
  "recipientNumber": "+34612345678",
  "type": "text",
  "content": "¡Hola! Este es un mensaje de prueba."
}

# Envío masivo con plantilla
POST /messages/bulk-send
{
  "templateId": "template_id",
  "customerTags": ["vip"],
  "templateParams": ["20%", "productos seleccionados"],
  "scheduledAt": "2024-12-25T10:00:00Z"
}

# Obtener estadísticas
GET /messages/stats?dateFrom=2024-01-01&dateTo=2024-12-31
```

### 📱 **Cuentas WhatsApp**

```bash
# Agregar cuenta
POST /accounts
{
  "name": "Cuenta Principal",
  "phoneNumber": "+34600000000",
  "phoneNumberId": "phone_number_id",
  "businessAccountId": "business_account_id",
  "accessToken": "access_token",
  "type": "production"
}

# Probar conexión
POST /accounts/{id}/test-connection

# Activar cuenta
POST /accounts/{id}/set-active
```

---

## 🔒 Seguridad y Mejores Prácticas

### 🛡️ **Seguridad**

- ✅ **Autenticación JWT** con refresh tokens
- ✅ **Rate limiting** para prevenir spam
- ✅ **Validación de entrada** en todos los endpoints
- ✅ **Encriptación** de tokens sensibles
- ✅ **Logs de auditoría** para todas las acciones
- ✅ **CORS** configurado correctamente

### 📝 **Mejores Prácticas**

- ✅ **Respeta los límites** de la API de WhatsApp
- ✅ **Implementa opt-out** para cumplir GDPR
- ✅ **Monitorea métricas** de entrega y engagement
- ✅ **Usa plantillas aprobadas** para evitar bloqueos
- ✅ **Segmenta apropiadamente** para relevancia
- ✅ **Programa envíos** en horarios apropiados

---

## 🐳 Despliegue con Docker

### Docker Compose Completo

```yaml
version: '3.8'
services:
  backend:
    build: ./emw-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis

  frontend:
    build: ./emw-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001
    depends_on:
      - backend

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: emw_database
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:6-alpine
    command: redis-server --requirepass yourredispassword

volumes:
  mysql_data:
```

### Comandos de Despliegue

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Escalar servicios
docker-compose up -d --scale backend=3

# Backup de base de datos
docker-compose exec mysql mysqldump -u root -p emw_database > backup.sql
```

---

## 🚀 Roadmap y Próximas Funcionalidades

### 🎯 **Versión 2.1** (Q1 2025)
- [ ] **Chatbots inteligentes** con IA
- [ ] **Integración con CRM** populares
- [ ] **A/B Testing** para campañas
- [ ] **WhatsApp Business Multi-Product** support

### 🎯 **Versión 2.2** (Q2 2025)
- [ ] **Analytics avanzados** con ML
- [ ] **API pública** para integraciones
- [ ] **Multi-idioma** completo
- [ ] **Plantillas visuales** drag & drop

### 🎯 **Versión 3.0** (Q3 2025)
- [ ] **Múltiples canales** (SMS, Email)
- [ ] **Inteligencia artificial** para personalización
- [ ] **Marketplace de plantillas**
- [ ] **Herramientas de colaboración** en equipo

---

## 🤝 Contribuir al Proyecto

### 🛠️ **Setup para Desarrollo**

```bash
# Fork del repositorio
git clone https://github.com/tu-usuario/EMW.git
cd EMW

# Crear rama para feature
git checkout -b feature/nueva-funcionalidad

# Instalar dependencias
npm run install:all

# Ejecutar tests
npm run test:all

# Ejecutar en desarrollo
npm run dev:all
```

### 📝 **Guías de Contribución**

1. **Issues**: Reporta bugs o sugiere features
2. **Pull Requests**: Contribuye con código
3. **Documentación**: Mejora la documentación
4. **Tests**: Agrega tests para nuevas funcionalidades

---

## 📞 Soporte y Contacto

### 🆘 **Obtener Ayuda**

- 📧 **Email**: soporte@humanizar.com
- 💬 **Discord**: [Servidor de la Comunidad](#)
- 📱 **WhatsApp**: +34 XXX XXX XXX
- 🐛 **Issues**: [GitHub Issues](https://github.com/humanizar/EMW/issues)

### 📚 **Recursos Adicionales**

- [🎥 Videos Tutoriales](#)
- [📖 Documentación Completa](#)
- [🎓 Curso de Certificación](#)
- [👥 Comunidad de Usuarios](#)

---

## 📄 Licencia

Este proyecto está licenciado bajo la **MIT License**. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## ⭐ ¿Te gusta el proyecto?

Si EMW te ha sido útil, considera:

- ⭐ **Dar una estrella** al repositorio
- 🍴 **Hacer fork** para contribuir
- 📢 **Compartir** con otros desarrolladores
- 💖 **Patrocinar** el desarrollo

---

<div align="center">

**🚀 Hecho con ❤️ para el Ecosistema Humanizar**

[🌐 Website](#) | [📱 Demo](#) | [📧 Contacto](#) | [💬 Community](#)

---

*EMW - Transformando la comunicación empresarial, un mensaje a la vez.*

</div>

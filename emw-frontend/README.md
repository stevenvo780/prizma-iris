# 🎨 IRIS Frontend

## Enhanced Marketing WhatsApp - Dashboard & Management Interface

<div align="center">

![IRIS Frontend](https://img.shields.io/badge/IRIS-Frontend-blue?style=for-the-badge&logo=react)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Redux](https://img.shields.io/badge/Redux-593D88?style=for-the-badge&logo=redux&logoColor=white)

**Interfaz moderna y responsiva para el sistema de marketing automation de WhatsApp**  
_Parte del Ecosistema Prizma_

</div>

## 🌟 Descripción General

IRIS Frontend es la interfaz de usuario principal para la gestión del sistema de marketing automation de WhatsApp del **Ecosistema Prizma**. Esta aplicación web moderna, construida con Next.js 13+ y TypeScript, proporciona una experiencia de usuario intuitiva y poderosa para gestionar campañas de marketing, clientes, plantillas y métricas en tiempo real.

### 🎯 Propósito en el Ecosistema

- **Dashboard centralizado**: Control total del marketing WhatsApp
- **Gestión unificada**: Clientes, campañas y métricas en un solo lugar
- **Integración seamless**: Conecta con IRIS Backend y otros servicios
- **Analytics en tiempo real**: Métricas y reportes instantáneos

## ✨ Características Principales

### 📊 Dashboard Inteligente

- **Métricas en tiempo real** de campañas activas
- **Gráficos interactivos** con Chart.js
- **Resumen de performance** de cuentas WhatsApp
- **Alertas y notificaciones** automáticas
- **KPIs personalizables** por usuario

### 📱 Gestión de Campañas

- **Editor visual** de mensajes con preview en tiempo real
- **Envío masivo** con programación avanzada
- **Segmentación automática** de audiencias
- **A/B Testing** integrado para optimización
- **Templates dinámicos** con variables personalizables

### 👥 Administración de Clientes

- **Importación masiva** desde CSV/Excel/Google Sheets
- **Segmentación inteligente** por comportamiento
- **Campos personalizados** ilimitados
- **Historial completo** de interacciones
- **Gestión de listas** y etiquetas

### 📋 Editor de Plantillas

- **Editor WYSIWYG** con preview móvil
- **Biblioteca de componentes** reutilizables
- **Variables dinámicas** con validación
- **Soporte multimedia** (imágenes, videos, documentos)
- **Aprobación de plantillas** por WhatsApp

### 🔄 Gestión de Colas

- **Monitor en tiempo real** del estado de envíos
- **Reintento automático** de mensajes fallidos
- **Priorización** de mensajes urgentes
- **Logs detallados** de cada envío

## 🛠️ Stack Tecnológico Avanzado

| Tecnología          | Versión | Propósito                            |
| ------------------- | ------- | ------------------------------------ |
| **Next.js**         | 13.5.6  | Framework React con SSR/SSG          |
| **TypeScript**      | 5.4.5   | Tipado estático y desarrollo robusto |
| **React**           | 18.3.1  | Biblioteca de UI components          |
| **Tailwind CSS**    | 3.4.4   | Framework CSS utility-first          |
| **Redux Toolkit**   | 2.2.5   | Gestión de estado global             |
| **React Bootstrap** | 2.10.2  | Componentes UI pre-construidos       |
| **Chart.js**        | 4.4.3   | Gráficos y visualizaciones           |
| **Axios**           | 1.7.2   | Cliente HTTP para APIs               |
| **Firebase**        | 9.23.0  | Autenticación y servicios            |
| **XLSX**            | 0.18.5  | Procesamiento de archivos Excel      |
| **Date-fns**        | 4.1.0   | Manipulación avanzada de fechas      |

## 🏗️ Arquitectura de la Aplicación

### Estructura de Directorios

```
📁 iris-frontend/
├── 📁 src/                           # Código fuente principal
│   ├── 📁 api/                       # Servicios de API
│   │   ├── 📄 index.ts               # Configuración base de API
│   │   ├── 📄 customers.ts           # Servicios de clientes
│   │   ├── 📄 messages.ts            # Servicios de mensajes
│   │   ├── 📄 templates.ts           # Servicios de plantillas
│   │   ├── 📄 users.ts               # Servicios de usuarios
│   │   └── 📄 whatsapp.ts            # Servicios WhatsApp
│   ├── 📁 components/                # Componentes reutilizables
│   │   ├── 📄 Header.tsx             # Header de navegación
│   │   ├── 📄 Layout.tsx             # Layout principal
│   │   ├── 📄 Footer.tsx             # Footer de la aplicación
│   │   ├── 📄 MessageListItem.tsx    # Item de lista de mensajes
│   │   ├── 📄 MessageDetailModal.tsx # Modal de detalle de mensaje
│   │   ├── 📄 DeleteMessageModal.tsx # Modal de confirmación
│   │   ├── 📄 FilePreview.tsx        # Preview de archivos
│   │   ├── 📄 VariableButtons.tsx    # Botones de variables
│   │   ├── 📄 PremiumBanner.tsx      # Banner promocional
│   │   └── 📄 Events.tsx             # Componente de eventos
│   ├── 📁 hooks/                     # Custom React Hooks
│   │   ├── 📄 useMessageQueues.ts    # Hook para colas de mensajes
│   │   └── 📄 useWhatsAppSessions.ts # Hook para sesiones WhatsApp
│   ├── 📁 pages/                     # Páginas de la aplicación
│   │   ├── 📄 _app.tsx               # App wrapper principal
│   │   ├── 📄 _document.js           # Document personalizado
│   │   ├── 📄 index.tsx              # Página principal/dashboard
│   │   └── 📁 [other-pages]/         # Otras páginas de la app
│   ├── 📁 store/                     # Redux Store
│   │   ├── 📄 index.ts               # Configuración del store
│   │   ├── 📄 rootReducer.ts         # Root reducer
│   │   └── 📄 helpers.ts             # Helpers del store
│   ├── 📁 styles/                    # Estilos de la aplicación
│   │   ├── 📄 globals.css            # Estilos globales
│   │   ├── 📄 Login.module.css       # Estilos del login
│   │   ├── 📄 Messages.module.css    # Estilos de mensajes
│   │   ├── 📄 Customers.module.css   # Estilos de clientes
│   │   ├── 📄 Contact.module.css     # Estilos de contacto
│   │   ├── 📄 Register.module.css    # Estilos de registro
│   │   └── 📄 AlertComponent.module.css # Estilos de alertas
│   └── 📁 utils/                     # Utilidades y helpers
│       ├── 📄 api.ts                 # Configuración de API
│       ├── 📄 auth.tsx               # Utilidades de autenticación
│       ├── 📄 axios.ts               # Configuración Axios
│       ├── 📄 conversions.ts         # Funciones de conversión
│       ├── 📄 fileUtils.ts           # Utilidades de archivos
│       ├── 📄 firebase.config.ts     # Configuración Firebase
│       ├── 📄 types.ts               # Definiciones de tipos
│       ├── 📄 variablePreview.ts     # Preview de variables
│       └── 📄 whatsapp-axios.ts      # Cliente Axios WhatsApp
├── 📁 public/                        # Archivos estáticos
│   └── 📁 img/                       # Imágenes y recursos
│       ├── 📄 Logo.png               # Logo principal
│       ├── 📄 logo_general.png       # Logo general
│       ├── 📄 favicon.svg            # Favicon
│       ├── 📄 BANER.png              # Banner principal
│       ├── 📄 FondoContacto.png      # Fondo de contacto
│       ├── 📄 fondo_login.png        # Fondo de login
│       └── 📄 cargar_imagen.png      # Placeholder de imagen
├── 📄 next.config.js                 # Configuración Next.js
├── 📄 tailwind.config.js             # Configuración Tailwind
├── 📄 tsconfig.json                  # Configuración TypeScript
├── 📄 postcss.config.js              # Configuración PostCSS
├── 📄 package.json                   # Dependencias del proyecto
└── 📄 Dockerfile                     # Configuración Docker
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** >= 16.x
- **npm** >= 8.x o **yarn** >= 1.x
- **IRIS Backend** ejecutándose
- **Git** para control de versiones

### 1️⃣ Instalación

```bash
# Clonar el repositorio (si es necesario)
cd IRIS/iris-frontend

# Instalar dependencias
npm install
# o usando yarn
yarn install
```

### 2️⃣ Configuración del Entorno

```bash
# Crear archivo de variables de entorno
cp .env.local.example .env.local

# Editar variables según tu configuración
nano .env.local
```

#### Variables de Entorno

```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# WebSocket (para tiempo real)
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# App Configuration
NEXT_PUBLIC_APP_NAME=IRIS Marketing Platform
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_ENVIRONMENT=development

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_REAL_TIME=true

# Upload Configuration
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/*,video/*,application/pdf
```

## 🏃‍♂️ Ejecución

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev
# o
yarn dev

# La aplicación estará disponible en:
# http://localhost:3000
```

### Producción

```bash
# Construir para producción
npm run build
# o
yarn build

# Iniciar servidor de producción
npm start
# o
yarn start
```

### Con Docker

```bash
# Construir imagen Docker
docker build -t iris-frontend .

# Ejecutar contenedor
docker run -p 3000:3000 iris-frontend

# Con docker-compose (desde la raíz del proyecto)
docker-compose up iris-frontend
```

## 🎨 Características de la Interfaz

### 📱 Dashboard Principal

- **Métricas en tiempo real**: Mensajes enviados, entregados, leídos
- **Gráficos interactivos**: Tendencias de engagement y conversión
- **Resumen de cuentas**: Estado de todas las cuentas WhatsApp
- **Actividad reciente**: Últimas acciones y eventos
- **Quick actions**: Acceso rápido a funciones comunes

### 💬 Gestión de Mensajes

- **Composer avanzado**: Editor con formato rico y preview
- **Programación de envíos**: Calendario integrado para scheduling
- **Vista de conversaciones**: Thread completo de cada cliente
- **Estados de entrega**: Tracking detallado de cada mensaje
- **Filtros inteligentes**: Búsqueda y filtrado avanzado

### 👥 Módulo de Clientes

- **Vista en tabla/tarjetas**: Múltiples formas de visualización
- **Importación drag & drop**: Arrastra archivos para importar
- **Campos personalizados**: Define campos específicos del negocio
- **Segmentación visual**: Crea grupos con filtros visuales
- **Exportación de datos**: CSV, Excel, JSON

### 📋 Editor de Plantillas

- **Preview en tiempo real**: Ve cómo se verá en WhatsApp
- **Biblioteca de medios**: Gestión centralizada de archivos
- **Variables dinámicas**: {{nombre}}, {{fecha}}, etc.
- **Componentes reutilizables**: Bloques pre-diseñados
- **Validación automática**: Verifica formato WhatsApp

### ⚙️ Configuración Avanzada

- **Múltiples cuentas**: Gestiona varias cuentas WhatsApp
- **Rate limiting**: Configuración de límites de envío
- **Webhooks**: Configuración de endpoints entrantes
- **Integraciones**: Conectores con otros sistemas
- **Backup/Restore**: Sistema de respaldo de configuración

## 🔌 Integración con el Ecosistema

### IRIS Backend API

```typescript
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Firebase Integration

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
};
```

### Redux Store Configuration

```typescript
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    messages: messagesSlice.reducer,
    customers: customersSlice.reducer,
    templates: templatesSlice.reducer,
    ui: uiSlice.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(persistMiddleware),
});
```

## 🎯 Funcionalidades Específicas

### Gestión de Estados

- **Loading states**: Skeletons y spinners inteligentes
- **Error handling**: Manejo graceful de errores con retry
- **Optimistic updates**: UI updates antes de confirmación
- **Real-time sync**: Sincronización automática con backend

### Accesibilidad (A11y)

- **ARIA labels**: Etiquetas semánticas completas
- **Keyboard navigation**: Navegación completa por teclado
- **Screen reader support**: Compatible con lectores de pantalla
- **High contrast mode**: Modo de alto contraste
- **Focus management**: Gestión adecuada del foco

### Performance Optimizations

- **Code splitting**: Carga dinámica de componentes
- **Image optimization**: Next.js Image con lazy loading
- **Bundle analysis**: Análisis del tamaño del bundle
- **Caching strategies**: Estrategias de cache inteligentes
- **Memoization**: Componentes memoizados para performance

## 🧪 Testing y Calidad

### Testing Framework

```bash
# Tests unitarios (cuando estén implementados)
npm run test

# Tests de integración
npm run test:integration

# Tests E2E con Cypress
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Linting y Formatting

```bash
# ESLint para calidad de código
npm run lint

# Prettier para formateo
npm run format

# Type checking con TypeScript
npm run type-check
```

### Quality Assurance

- **TypeScript strict mode**: Tipado estricto
- **ESLint rules**: Reglas de calidad de código
- **Prettier formatting**: Formateo consistente
- **Git hooks**: Pre-commit y pre-push hooks
- **Bundle analyzer**: Análisis de dependencias

## 🚀 Despliegue

### Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel

# Configurar variables de entorno en Vercel dashboard
```

### Docker Production

```bash
# Build para producción
docker build -f Dockerfile.prod -t iris-frontend:prod .

# Run en producción
docker run -p 3000:3000 iris-frontend:prod
```

### Variables de Entorno por Ambiente

```bash
# .env.development
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# .env.staging
NEXT_PUBLIC_API_URL=https://staging-api.iris.com/api

# .env.production
NEXT_PUBLIC_API_URL=https://api.iris.com/api
```

## 📱 Responsive Design

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px
- **Large Desktop**: > 1440px

### Mobile-First Approach

- Diseño optimizado para móviles primero
- Progressive enhancement para desktop
- Touch-friendly interfaces
- Gestos nativos en mobile

## 🤝 Contribución

### Proceso de Desarrollo

1. **Fork** y clone del repositorio
2. **Branch** específico: `feature/nueva-funcionalidad`
3. **Desarrollo** siguiendo las guías de estilo
4. **Tests** para nuevas funcionalidades
5. **Pull request** con descripción detallada

### Guías de Estilo

- **Componentes funcionales** con TypeScript
- **Custom hooks** para lógica reutilizable
- **CSS Modules** o Tailwind para estilos
- **Conventional commits** para mensajes
- **JSDoc** para documentación de funciones

### Code Review Checklist

- [ ] Funcionalidad implementada correctamente
- [ ] Tests agregados/actualizados
- [ ] Documentación actualizada
- [ ] Performance considerado
- [ ] Accesibilidad verificada
- [ ] Mobile responsiveness confirmado

## 📞 Soporte y Documentación

### Enlaces Útiles

- [IRIS Backend Documentation](../iris-backend/README.md)
- [Ecosistema Prizma](../../README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Contacto

- **Maintainer**: Steven Vallejo Ortiz
- **Email**: stevenvallejo780@gmail.com
- **Issues**: GitHub Issues del repositorio

### Troubleshooting Común

#### Error de conexión API

```bash
# Verificar que IRIS Backend esté ejecutándose
curl http://localhost:3001/health

# Verificar variables de entorno
echo $NEXT_PUBLIC_API_URL
```

#### Problemas de build

```bash
# Limpiar caché de Next.js
rm -rf .next

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

---

<div align="center">

**IRIS Frontend v2.0.0**  
_Dashboard de Marketing WhatsApp - Ecosistema Prizma_

![Prizma](https://img.shields.io/badge/Prizma-Ecosystem-orange?style=for-the-badge)

</div>

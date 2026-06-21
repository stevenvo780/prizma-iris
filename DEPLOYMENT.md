# Despliegue IRIS en Google Cloud Platform

## ✅ Estado: DESPLEGADO EXITOSAMENTE

### URLs de Producción

#### Backend
- **URL**: https://iris-backend-6dalnsowyq-uc.a.run.app
- **Health Check**: https://iris-backend-6dalnsowyq-uc.a.run.app/api/health
- **Docs API**: https://iris-backend-6dalnsowyq-uc.a.run.app/api/docs

#### Frontend
- **URL**: https://iris-frontend-6dalnsowyq-uc.a.run.app

### Configuración de GCP

#### Proyecto
- **Nombre**: emergent-enterprises
- **ID**: 633619052458
- **Región**: us-central1
- **Zona**: us-central1-a

#### Cloud SQL (PostgreSQL)
- **Instancia**: emergentdb
- **Versión**: PostgreSQL 15
- **Database**: ewm
- **Usuario**: irisuser
- **Password**: `<ROTAR_EN_SECRET_MANAGER>`
- **Connection Name**: emergent-enterprises:us-central1:emergentdb
- **Estado**: RUNNABLE

#### Redis
- **Estado**: No configurado aún (usando REDIS_LAZY_CONNECT=true)
- **Recomendación**: Configurar Memory Store para producción

### Variables de Entorno (Backend)

```
NODE_ENV=production
AUTH_MODE=jwt
JWT_SECRET=secure_jwt_secret_CHANGE_IN_PROD
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=supersecret_CHANGE_IN_PROD
API_KEY=api_secret_CHANGE_IN_PROD
ENCRYPTION_KEY=16charkey_CHANGE
BCRYPT_ROUNDS=some_salt
LOG_LEVEL=info
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
DB_SYNCHRONIZE=false
WHATSAPP_API_BASE_URL=https://graph.facebook.com/v22.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<ROTAR_EN_META_BUSINESS>
HOST=0.0.0.0
DB_HOST=/cloudsql/emergent-enterprises:us-central1:emergentdb
DB_PORT=5432
DB_USERNAME=irisuser
DB_PASSWORD=<ROTAR_EN_CLOUD_SQL>
DB_DATABASE=iris
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_LAZY_CONNECT=true
FRONTEND_URL=https://iris-frontend-6dalnsowyq-uc.a.run.app
APP_URL=https://iris-backend-6dalnsowyq-uc.a.run.app
```

### Variables de Entorno (Frontend)

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://iris-backend-6dalnsowyq-uc.a.run.app/api
```

### Recursos Cloud Run

#### Backend (iris-backend)
- **Memoria**: 2Gi
- **CPU**: 2
- **Timeout**: 300s
- **Puerto**: 8080
- **Min Instances**: 0
- **Max Instances**: 10
- **Cloud SQL**: Conectado via Unix socket

#### Frontend (iris-frontend)
- **Memoria**: 1Gi
- **CPU**: 1
- **Timeout**: 60s
- **Puerto**: 3000
- **Min Instances**: 0
- **Max Instances**: 10

### Comandos Útiles

#### Ver logs del backend
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=iris-backend" \
  --project=emergent-enterprises \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

#### Ver logs del frontend
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=iris-frontend" \
  --project=emergent-enterprises \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"
```

#### Actualizar variables de entorno del backend
```bash
gcloud run services update iris-backend \
  --region=us-central1 \
  --project=emergent-enterprises \
  --update-env-vars="VARIABLE=valor"
```

#### Redesplegar backend
```bash
cd /datos/repos/prizma/IRIS/iris-backend
gcloud builds submit --config cloudbuild.yaml --project=emergent-enterprises --async
```

#### Redesplegar frontend
```bash
cd /datos/repos/prizma/IRIS/iris-frontend
gcloud builds submit --config cloudbuild.yaml --project=emergent-enterprises --async
```

### Próximos Pasos (Recomendaciones)

1. **Seguridad**
   - [ ] Cambiar todos los secretos (JWT_SECRET, SESSION_SECRET, API_KEY, ENCRYPTION_KEY)
   - [ ] Configurar Secret Manager para manejar secretos
   - [ ] Habilitar Cloud Armor para protección DDoS
   - [ ] Configurar HTTPS personalizado con dominio propio

2. **Redis / Memory Store**
   - [ ] Crear instancia de Memory Store para Redis
   - [ ] Configurar VPC connector para Cloud Run
   - [ ] Actualizar variables de entorno con Redis de producción

3. **Base de Datos**
   - [ ] Revisar y optimizar índices en PostgreSQL
   - [ ] Configurar backups automáticos
   - [ ] Habilitar réplicas de lectura si es necesario
   - [ ] Ejecutar migraciones de base de datos si hay pendientes

4. **Monitoreo**
   - [ ] Configurar alertas en Cloud Monitoring
   - [ ] Crear dashboards personalizados
   - [ ] Configurar métricas personalizadas

5. **CI/CD**
   - [ ] Configurar triggers automáticos en Cloud Build desde GitHub
   - [ ] Implementar ambientes de staging
   - [ ] Configurar rollbacks automáticos

6. **Dominio Personalizado**
   - [ ] Registrar dominio o usar existente
   - [ ] Configurar Cloud DNS
   - [ ] Agregar certificado SSL personalizado

7. **Optimización**
   - [ ] Revisar límites de rate limiting
   - [ ] Ajustar tamaños de instancia según uso real
   - [ ] Implementar CDN para assets estáticos del frontend

### Historial de Builds

#### Backend
- Build 5b12c5e0-355b-45d4-b803-04b74e1b7333: ✅ SUCCESS (2025-11-19 23:53:37)
  - Configuración de Cloud SQL
  - Puerto 8080
  - 2Gi RAM, 2 CPU

#### Frontend
- Build 2335ba46-bef9-4443-bfd4-2fd86c31af96: ✅ SUCCESS (2025-11-20 00:01:01)
  - Next.js con API URL configurada
  - Puerto 3000
  - 1Gi RAM, 1 CPU

### Troubleshooting

#### Si el backend no responde
1. Verificar logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=iris-backend"`
2. Verificar estado de Cloud SQL: `gcloud sql instances describe emergentdb`
3. Verificar variables de entorno: `gcloud run services describe iris-backend --format=json | jq '.spec.template.spec.containers[0].env'`

#### Si hay errores de CORS
1. Verificar que FRONTEND_URL esté configurada correctamente en el backend
2. Verificar que la aplicación frontend esté haciendo requests a la URL correcta del backend

#### Si falla el build
1. Revisar logs del build: `gcloud builds log <BUILD_ID>`
2. Verificar que los Dockerfiles sean correctos
3. Verificar que las dependencias estén instaladas

### Fecha de Despliegue
**19 de Noviembre de 2025 - 23:53 UTC (Backend)**
**20 de Noviembre de 2025 - 00:01 UTC (Frontend)**

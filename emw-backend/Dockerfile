# ═══════════════════════════════════════════════════════════════
# Stage 1 — Instalar dependencias + build
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Eliminar devDependencies para el runner
RUN npm prune --production

# ═══════════════════════════════════════════════════════════════
# Stage 2 — Imagen de producción liviana
# Solo dist/ + node_modules de prod + config necesaria
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S emwservice -u 1001 -G nodejs

# Solo lo necesario para ejecutar
COPY --from=builder --chown=emwservice:nodejs /app/dist ./dist
COPY --from=builder --chown=emwservice:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=emwservice:nodejs /app/package.json ./
COPY --from=builder --chown=emwservice:nodejs /app/config ./config

USER emwservice
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const port=process.env.PORT||8080;http.get('http://localhost:'+port+'/api/health',res=>{process.exit(res.statusCode>=200&&res.statusCode<500?0:1)}).on('error',()=>process.exit(1));"

CMD ["node", "dist/index.js"]

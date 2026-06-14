# ═══════════════════════════════════════════════════════════════
# Stage 1 — Instalar dependencias
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --ignore-scripts

# ═══════════════════════════════════════════════════════════════
# Stage 2 — Build de Next.js (output: standalone)
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MP_PUBLIC_KEY
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MP_PUBLIC_KEY=${NEXT_PUBLIC_MP_PUBLIC_KEY}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ═══════════════════════════════════════════════════════════════
# Stage 3 — Imagen de producción ultra-liviana
# Solo copia el standalone server + static + public
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Solo lo necesario: standalone server (~25MB) + static + public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000',res=>{process.exit(res.statusCode>=200&&res.statusCode<500?0:1)}).on('error',()=>process.exit(1));"

# standalone server.js incluye su propio servidor — no necesita npm start
CMD ["node", "server.js"]

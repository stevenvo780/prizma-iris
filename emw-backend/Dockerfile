# ═══════════════════════════════════════════════════════════════
# Stage 1 — Build
# prizma-contracts and prizma-payments are published on npm;
# no local vendoring needed.
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY tsconfig*.json ./
COPY index.ts app.module.ts ./
COPY modules ./modules
COPY config ./config
COPY models ./models
COPY migrations ./migrations
COPY src ./src

RUN npm run build

# ═══════════════════════════════════════════════════════════════
# Stage 2 — Production image
# ═══════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S emwservice -u 1001 -G nodejs

COPY --from=builder --chown=emwservice:nodejs /app/dist ./dist
COPY --from=builder --chown=emwservice:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=emwservice:nodejs /app/package.json ./
COPY --from=builder --chown=emwservice:nodejs /app/config ./config

USER emwservice
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const port=process.env.PORT||8080;http.get('http://localhost:'+port+'/health',res=>{process.exit(res.statusCode>=200&&res.statusCode<500?0:1)}).on('error',()=>process.exit(1));"

CMD ["node", "dist/index.js"]

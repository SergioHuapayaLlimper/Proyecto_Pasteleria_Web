FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app/backend

# Dependencias primero para aprovechar la cache de capas
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY frontend/ /app/frontend/

# No ejecutar como root
USER node

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/productos >/dev/null || exit 1

CMD ["node", "server.js"]

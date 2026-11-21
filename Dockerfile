# syntax=docker/dockerfile:1

# --- Etapa 1: dependencias -------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# --- Etapa 2: build --------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Las variables NEXT_PUBLIC_* se incrustan en el JavaScript del navegador al compilar:
# cambiarlas exige reconstruir la imagen. Pasarlas en `environment` no sirve.
# URL del backend tal como la ve el NAVEGADOR (enlaces a /uploads: fotos y adjuntos).
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
# Moneda de todos los importes (ISO 4217).
ARG NEXT_PUBLIC_MONEDA=USD
# Nombre del condominio que se muestra en toda la interfaz.
ARG NEXT_PUBLIC_CONDOMINIO=Condominio
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_MONEDA=$NEXT_PUBLIC_MONEDA
ENV NEXT_PUBLIC_CONDOMINIO=$NEXT_PUBLIC_CONDOMINIO
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Etapa 3: runtime ------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Escuchar en todas las interfaces del contenedor, no solo en localhost.
ENV HOSTNAME=0.0.0.0

# Salida standalone: server.js con solo las dependencias que usa la app.
# public y .next/static no van incluidos y se copian aparte.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

# API_URL (URL del backend vista desde el servidor, con /api/v1) se lee en tiempo
# de ejecución: se pasa con `environment` en docker-compose.yml.
CMD ["node", "server.js"]

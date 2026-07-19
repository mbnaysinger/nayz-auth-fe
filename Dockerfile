# ---------- Build ----------
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# IMPORTANTE: variáveis VITE_* são de BUILD (ficam embutidas no bundle).
# Construa a imagem por ambiente passando os build args (ver deploy/docker-compose.yml).
ARG VITE_API_BASE_URL
ARG VITE_NAYZ_AUTH_APP_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_NAYZ_AUTH_APP_ID=$VITE_NAYZ_AUTH_APP_ID

RUN npm run build

# ---------- Runtime ----------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost/ || exit 1

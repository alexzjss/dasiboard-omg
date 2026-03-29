# Stage 1 — build React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — serve with nginx + envsubst para injetar BACKEND_URL
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copia como template (será processado pelo envsubst no CMD)
COPY nginx-spa.conf /etc/nginx/templates/default.conf.template
# Valor padrão para BACKEND_URL; deve ser sobrescrito em produção com a URL real do backend
ENV BACKEND_URL=http://backend:8000
EXPOSE 80
# nginx:alpine já executa envsubst automaticamente para arquivos em /etc/nginx/templates/

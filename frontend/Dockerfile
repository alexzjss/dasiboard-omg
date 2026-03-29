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
EXPOSE 80
# nginx:alpine já executa envsubst automaticamente para arquivos em /etc/nginx/templates/

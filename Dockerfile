# ===== FRONTEND BUILD =====
FROM node:20 AS build
WORKDIR /app

# Nur die Webapp-Dependencies kopieren
COPY webapp/package*.json ./
RUN npm ci

# Restliche Webapp-Dateien kopieren
COPY webapp ./

# Vite-Build
RUN npm run build

# ===== RUNTIME =====
FROM alpine:3.22

# nginx + php-fpm installieren (die App braucht nur Datei-IO und json_*, das ist Core)
RUN apk add --no-cache nginx php84 php84-fpm

RUN mkdir -p /run/nginx /var/www/html

# Build-Resultat ins Webroot
COPY --from=build /app/dist /var/www/html

# nginx-Konfiguration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Rechte setzen
RUN chown -R nobody:nogroup /var/www/html

EXPOSE 80

# data/ wird erst zur Laufzeit gemountet und gehoert dann root - php-fpm laeuft als
# nobody und koennte sonst nicht schreiben (stiller Datenverlust auf Linux/Unraid).
CMD ["sh", "-c", "mkdir -p /var/www/html/data && chown nobody:nogroup /var/www/html/data && php-fpm84 -D && nginx -g 'daemon off;'"]

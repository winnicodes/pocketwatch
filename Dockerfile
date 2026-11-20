FROM node:26-alpine AS build
WORKDIR /app
COPY webapp/package*.json ./
RUN npm ci
COPY webapp ./
RUN npm test && npm run build

FROM alpine:3.24
RUN apk add --no-cache nginx php85 php85-fpm \
 && mkdir -p /run/nginx /var/www/html
COPY --from=build /app/dist /var/www/html
COPY nginx.conf /etc/nginx/http.d/default.conf
RUN chown -R nobody:nogroup /var/www/html
EXPOSE 80
# Mounted data/ is owned by root; php-fpm runs as nobody.
CMD ["sh", "-c", "mkdir -p /var/www/html/data && chown nobody:nogroup /var/www/html/data && php-fpm85 -D && nginx -g 'daemon off;'"]

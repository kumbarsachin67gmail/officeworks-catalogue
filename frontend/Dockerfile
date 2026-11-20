# Build stage: type-check and bundle the React app.
FROM node:22.23.5-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: nginx serves the static files and forwards /api to the backend.
# The unprivileged image runs nginx as a non-root user on port 8080.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine
# The official image fills ${BACKEND_URL} in templates at startup (envsubst).
ENV BACKEND_URL=http://backend:3000
# Have the entrypoint export NGINX_LOCAL_RESOLVERS (from /etc/resolv.conf) for the template.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080

# Multi-stage build for React app
# Use a Node version compatible with eslint / tooling (>=20)
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies with npm using the existing package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the app source
COPY . .

# Build the React app; Vite bakes VITE_API_URL into the bundle
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" && npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY ./conf/nginx/default.conf /etc/nginx/conf.d/default.conf

# Create necessary directories and set permissions
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/log/nginx

EXPOSE 5054

CMD ["nginx", "-g", "daemon off;"]


# This is a legacy single-container Dockerfile.
# For multi-container setup, use docker-compose.yml instead.
#
# Build: docker build -t pantry-app .
# Run:   docker run -p 3001:3001 pantry-app

# Build frontend stage
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend ./
RUN npm run build

# Build backend stage
FROM node:20-alpine AS backend-build
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --silent

COPY backend ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev --silent

# Copy built backend
COPY --from=backend-build /app/backend/dist ./dist

# Copy built frontend to be served by backend
COPY --from=frontend-build /app/frontend/dist ../frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/backend/data

WORKDIR /app/backend

# Expose backend port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/backend/data/pantry.db

CMD ["node", "dist/index.js"]

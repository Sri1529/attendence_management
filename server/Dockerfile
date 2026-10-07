# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies required for building
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build config
COPY tsconfig.json nest-cli.json ./
COPY src/ ./src/

# Compile TypeScript code to dist/
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install fontconfig and fonts for pdfkit (PDF generation) and curl for healthchecks
RUN apk add --no-cache curl ttf-dejavu fontconfig

ENV NODE_ENV=production
ENV PORT=4000

# Create non-root system user and group for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled code from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership of /app to appuser
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 4000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start production server (TypeORM runs migrations automatically on boot)
CMD ["node", "dist/main.js"]

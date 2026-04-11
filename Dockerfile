# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled application from builder stage
COPY --from=builder /app/dist ./dist

# Copy generated Prisma Client from builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy prisma schema (needed for Prisma runtime)
COPY prisma ./prisma

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose application port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "dist/main.js"]

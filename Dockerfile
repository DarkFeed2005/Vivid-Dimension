# ============================================================
#  BLOOM & CO. — Dockerfile
# ============================================================
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
FROM node:18-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install server dependencies
RUN cd server && npm install

# Copy server code
COPY server/ ./server/

# Expose port
EXPOSE 10000

# Start the server
CMD ["node", "server/index.js"]
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server code
COPY . .

# Expose port
EXPOSE 10000

# Start the server
CMD ["node", "index.js"]

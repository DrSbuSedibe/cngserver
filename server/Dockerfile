FROM node:18-alpine

WORKDIR /app/server

COPY server/package*.json ./
RUN npm install

COPY server ./

EXPOSE 10000

CMD ["node", "index.js"]

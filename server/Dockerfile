FROM node:18-alpine

WORKDIR /app/server

COPY package*.json ./
RUN npm install

COPY . ./

EXPOSE 10000

CMD ["node", "index.js"]

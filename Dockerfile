FROM node:17.9.0

RUN mkdir -p /usr/src/bot

WORKDIR /usr/src/bot

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm install -g typescript ts-node

CMD [ "ts-node", "index.ts" ]
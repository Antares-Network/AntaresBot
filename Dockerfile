FROM node:17.9.0

RUN mkdir -p /usr/src/AntaresBot
WORKDIR /usr/src/AntaresBot

COPY package.json /usr/src/AntaresBot
RUN npm install
RUN npm install -g ts-node

COPY . /usr/src/AntaresBot

CMD [ "ts-node", "index.ts"]
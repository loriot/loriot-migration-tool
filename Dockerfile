FROM node:18-alpine

COPY tsconfig.json ./
COPY package.json ./
RUN npm i

COPY src ./src
RUN npm run build

CMD ["node", "dist/index.js"]
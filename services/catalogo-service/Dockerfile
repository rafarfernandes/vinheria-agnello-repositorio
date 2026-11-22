FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY lib ./lib
COPY server.js ./
# roda sem privilégios de root
USER node
EXPOSE 8080
CMD ["node", "server.js"]

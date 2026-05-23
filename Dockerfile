FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openjdk17-jdk
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN mkdir -p dist/schema && cp -r src/schema/* dist/schema/

# planning-mcp side-service: built into this image, runs as a 2nd process (reaches the app on localhost:3000)
RUN cd planning-mcp && npm ci && npm run build && npm prune --omit=dev

EXPOSE 3000 5556
CMD ["sh", "-c", "node planning-mcp/dist/index.js & exec npm start"]
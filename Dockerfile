FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openjdk17-jdk
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
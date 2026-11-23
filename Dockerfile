FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3300
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3300
CMD ["npm", "run", "start"]

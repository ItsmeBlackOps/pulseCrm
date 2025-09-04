FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install deps (will be overwritten by compose volume during dev)
RUN npm install

# Copy everything else
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]

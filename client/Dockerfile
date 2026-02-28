FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY client/ ./

# Build the app
RUN npm run build

# Expose port
EXPOSE 5174

# Start dev server with proxy
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

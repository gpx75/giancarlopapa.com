# Set the Node.js version
ARG NODE_VERSION=lts-bookworm

# Base image
FROM node:${NODE_VERSION}-slim as base

# Arguments
ARG PORT=8080

# Environment variables
ENV NODE_ENV=production

# Set the working directory
WORKDIR /src

# Verify Node.js and npm installation
RUN node --version && npm --version

# Build stage
FROM base as build

# Copy package files
COPY package.json package-lock.json ./

# Install npm if not present
RUN apt-get update && apt-get install -y npm

# Verify npm installation
RUN npm --version

# Install dependencies
RUN npm install --verbose

# Copy source code
COPY . .

# Run build
RUN npm run build

# Production stage
FROM base as prd

# Environment variables
ENV PORT=$PORT

# Expose port
EXPOSE $PORT

# Copy built files from the build stage
COPY --from=build /src/.output /src/.output

# Command to run the application
CMD ["node", ".output/server/index.mjs"]

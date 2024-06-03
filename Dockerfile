ARG NODE_VERSION=lts-bookworm

FROM node:${NODE_VERSION}-slim

ARG PORT=8080

ENV NODE_ENV=production
ENV PORT=$PORT

WORKDIR /src

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --verbose

# Copy all project files
COPY . .

# Ensure nuxt commands are available
RUN npx nuxt --version

# Prepare and build the project
RUN npx nuxt prepare
RUN npm run build

# Expose the application port
EXPOSE $PORT

# Start the application
CMD [ "node", ".output/server/index.mjs" ]

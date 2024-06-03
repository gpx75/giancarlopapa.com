ARG NODE_VERSION=lts-bookworm

FROM node:${NODE_VERSION}-slim as base

ARG PORT=8080

ENV NODE_ENV=production

WORKDIR /src

# Build
FROM base as build

COPY package.json package-lock.json ./
RUN node --version && npm --version
RUN npm install --verbose

COPY . .

RUN npm run build

# Production
FROM base as prd

ENV PORT=$PORT

EXPOSE $PORT

COPY --from=build /src/.output /src/.output

CMD ["node", ".output/server/index.mjs"]

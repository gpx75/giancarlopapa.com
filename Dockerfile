ARG NODE_VERSION=lts-bookworm

FROM node:${NODE_VERSION}-slim as base

ARG PORT=8080

ENV NODE_ENV=production

WORKDIR /src

# Build
FROM base as build

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build
RUN ls -al /src/.output  # Check the contents of the build directory

# Production
FROM base as prd

ENV PORT=$PORT

EXPOSE $PORT

COPY --from=build /src/.output /src/.output
RUN ls -al /src/.output  # Check the contents of the output directory in production

CMD [ "node", ".output/server/index.mjs" ]

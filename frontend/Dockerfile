FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_CHAIN_ID=31337
ARG NEXT_PUBLIC_RPC_URL=http://localhost:8545
ARG NEXT_PUBLIC_CONTRACT_ADDRESS
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_CONTRACT_ADDRESS=$NEXT_PUBLIC_CONTRACT_ADDRESS
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 10001 emr && adduser --system --uid 10001 --ingroup emr emr
COPY --from=build --chown=emr:emr /app/.next/standalone ./
COPY --from=build --chown=emr:emr /app/.next/static ./.next/static
USER emr
EXPOSE 3000
CMD ["node", "server.js"]

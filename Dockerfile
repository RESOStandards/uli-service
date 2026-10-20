# The ULI reference node.
#
# Two runtime dependencies (express, and the RESO Client SDK for the Web API ingest path), so this
# stays small. Build and run are separate stages: the build stage needs TypeScript, the runtime does
# not, and shipping a compiler into a reference implementation others will deploy is a bad default.
#
# Pinned to the Node 22 line because that is the floor `package.json` declares. A reference
# implementation should run on the oldest version it claims to support, not the newest available.

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

# Dependencies first, so a source change does not re-resolve the tree.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only. No compiler, no test runner.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# The index mapping travels with the image so the node can create its own indices on first start.
COPY index ./index

# Do not run as root. The node writes nothing to disk; its state is in OpenSearch.
USER node

# Bind every interface. The source default is loopback, which is right for a node run directly on
# a developer's machine and wrong in a container: a published port arrives on the container's own
# interface, so a loopback-bound server is unreachable from the host and from every other
# container. Docker's network is the isolation boundary here, not the bind address.
ENV ULI_HOST=0.0.0.0

EXPOSE 3000

# The node refuses to start when OpenSearch is unreachable, which is the behavior we want: a node
# that cannot reach its index cannot answer a broadcast, and failing loudly beats answering wrongly.
# Compose waits on the OpenSearch healthcheck before starting this.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
  CMD node -e "fetch('http://localhost:3000/uli-service/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/bin/serve.js"]

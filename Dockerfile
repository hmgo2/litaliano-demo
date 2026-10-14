FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@11.25.0 --ignore-scripts --no-audit --no-fund && pnpm install --prod --frozen-lockfile --ignore-scripts
COPY . .
ENV NODE_ENV=production HOST=0.0.0.0 DEMO=true SECURE_COOKIES=true
EXPOSE 3000
CMD ["node","server.mjs"]

FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm install --production=false

# 复制源码
COPY . .

# 构建前端
RUN npm run build

# 清理 devDependencies（减小镜像体积）
RUN npm prune --production

EXPOSE 3000

CMD ["node", "server/index.js"]

#!/bin/bash
# 腾讯云 Lighthouse 部署脚本
# 在服务器上执行此脚本即可完成部署

set -e

echo "===== 知市达客 部署脚本 ====="

# 1. 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 2. 安装 PM2（进程守护，防止服务挂掉）
if ! command -v pm2 &> /dev/null; then
  echo "安装 PM2..."
  sudo npm install -g pm2
fi

# 3. 进入项目目录
cd /home/lighthouse/zhikeshuo

# 4. 安装依赖
echo "安装依赖..."
npm install

# 5. 构建前端
echo "构建前端..."
npm run build

# 6. 设置环境变量
export PORT=3000
export NODE_ENV=production

# 7. 用 PM2 启动服务
echo "启动服务..."
pm2 delete zhikeshuo 2>/dev/null || true
pm2 start server/index.js --name zhikeshuo
pm2 save

# 8. 设置 PM2 开机自启
pm2 startup systemd -u lighthouse --hp /home/lighthouse
echo "===== 部署完成 ====="
echo "访问地址: http://$(curl -s ifconfig.me):3000"

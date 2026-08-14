# 腾讯云 Lighthouse 部署指南

## 一、购买服务器

1. 打开 https://cloud.tencent.com/product/lighthouse
2. 点击「立即购买」
3. 配置选择：
   - **地域**：香港（免备案，国内访问也快）
   - **套餐**：2核2G / 4M带宽 / 40G SSD（约90元/年）
   - **镜像**：Ubuntu 22.04
4. 付费方式：按年付最划算
5. 设置密码（记住这个密码，后面SSH要用）

## 二、连接服务器

购买完成后，在控制台找到服务器的公网 IP。

### 方式1：控制台 WebShell（最简单）
1. 进入 https://console.cloud.tencent.com/lighthouse
2. 点击你的服务器实例
3. 点「登录」→ 直接在浏览器里操作终端

### 方式2：本地 SSH
```bash
ssh lighthouse@你的服务器IP
```
输入你设置的密码即可。

## 三、部署项目

连上服务器后，依次执行以下命令：

### 1. 安装 Git 并克隆代码
```bash
sudo apt update && sudo apt install -y git
cd /home/lighthouse
git clone https://github.com/yulanjacob-byte/zhikeshuo.git
cd zhikeshuo
```

### 2. 安装 Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. 安装 PM2（进程守护）
```bash
sudo npm install -g pm2
```

### 4. 安装项目依赖并构建前端
```bash
cd /home/lighthouse/zhikeshuo
npm install
npm run build
```

### 5. 配置环境变量
```bash
echo 'export DEEPSEEK_API_KEY="sk-5926ede81f4941078e5809426c76d7ff"' >> ~/.bashrc
echo 'export PORT=3000' >> ~/.bashrc
echo 'export NODE_ENV=production' >> ~/.bashrc
source ~/.bashrc
```

### 6. 启动服务
```bash
pm2 start server/index.js --name zhikeshuo
pm2 startup
pm2 save
```

### 7. 开放防火墙端口
在腾讯云控制台：
1. 点击服务器实例 → 「防火墙」标签
2. 添加规则：端口 3000，协议 TCP，来源 0.0.0.0/0
3. 确认添加

## 四、验证部署

浏览器打开：
```
http://你的服务器IP:3000
```

如果看到「知市达客」页面，部署成功！

## 五、后续更新代码

每次代码更新后，在服务器执行：
```bash
cd /home/lighthouse/zhikeshuo
git pull
npm install
npm run build
pm2 restart zhikeshuo
```

## 六、（可选）绑定域名 + HTTPS

1. 在腾讯云购买域名（或使用已有域名）
2. DNS 解析添加 A 记录，指向服务器 IP
3. 在服务器安装 Nginx 做反向代理
4. 用 certbot 申请免费 SSL 证书
```

# 知客说 · 理财经理话术助手

基于 Vue 3 + Vite 的 PWA 应用，复刻"知客说"小工具，面向理财经理提供盘面解读、五维评分、AI 话术生成等功能。

## 快速开始

```bash
# 安装依赖
npm install

# 启动前端开发服务器（端口 5173）
npm run dev

# 启动 Mock 后端服务（端口 3000，另开终端）
npm run server

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

打开 http://localhost:5173 即可访问。Mock 后端会模拟 AI 生成和行情数据接口。

## 项目结构

```
zhikeshuo-clone/
├── index.html              # HTML 入口
├── vite.config.js          # Vite 配置（含 PWA + API 代理）
├── package.json
├── src/
│   ├── main.js             # 应用入口
│   ├── App.vue             # 根组件（头部 + 路由出口 + 底部导航）
│   ├── router.js           # Hash 路由配置
│   ├── api/
│   │   └── index.js        # API 请求层（去重 + 超时 + JSON 解析）
│   ├── data/
│   │   ├── fallback.js     # 静态兜底数据
│   │   └── market-date.js  # 交易日历计算
│   ├── utils/
│   │   └── format.js       # 格式化工具（价格/涨跌幅/复制/Toast）
│   ├── components/
│   │   ├── ComplianceCard.vue   # 合规提示卡片
│   │   ├── SiteFooter.vue       # 页脚免责声明
│   │   ├── FeedbackBar.vue      # 用户反馈条
│   │   └── ScriptCard.vue       # 话术卡片（含复制 + 反馈）
│   ├── views/
│   │   ├── DailyView.vue        # 今日话术（市场情绪 + AI 话术）
│   │   ├── MarketView.vue       # 市场速递（指数 + 板块 + 广度）
│   │   ├── ScoreView.vue        # 五维评分（雷达图 + AI 建议）
│   │   └── GeneratorView.vue    # 话术生成器（自定义生成）
│   └── styles/
│       └── main.css       # 全局样式与主题变量
├── server/
│   └── index.js            # Mock 后端（Node.js HTTP）
└── cloud-functions/
    └── marketBrief.js      # 腾讯云 CloudBase 云函数模板
```

## 四大功能模块

| 页面 | 路由 | 功能 |
|------|------|------|
| 今日话术 | `/#/daily` | 市场情绪 AI 分析 + 3条场景话术 + 1条朋友圈文案 |
| 市场速递 | `/#/market` | 6大指数实时行情 + 领涨/领跌板块 + 成交广度 |
| 五维评分 | `/#/score` | 客户五维度评分（CSS 条形图）+ AI 经营建议 |
| 话术生成器 | `/#/generator` | 按场景/客户/话题自定义生成话术 + 历史记录 |

## API 端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/marketBrief` | GET | 获取市场行情数据 |
| `/marketBrief` | POST | 市场情绪 AI 分析 |
| `/dailyScripts` | GET | 获取今日 AI 话术 |
| `/generateScript` | POST | 生成自定义话术 |
| `/indexDetail` | POST | 指数详情（K线） |
| `/feedback` | POST | 用户反馈 |

## 数据降级策略

1. **静态兜底**：前端内置示例数据，后端不可用时立即展示
2. **交易日历**：自动计算最近交易日，跳过周末
3. **实时 AI**：用户点击刷新按钮触发，失败时降级到兜底数据
4. **请求去重**：相同 GET 请求飞行中自动合并

## 接入真实 AI

修改 `server/index.js` 中的 `generateAI()` 函数：

```javascript
// 腾讯混元示例
async function generateAI(prompt) {
  const res = await fetch('https://hunyuan.tencentcloudapi.com/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'hunyuan-pro', messages: [{ role: 'user', content: prompt }] })
  })
  const data = await res.json()
  return data.choices[0].message.content
}
```

## 部署到腾讯云 CloudBase

1. 修改 `src/api/index.js` 中的 `BASE` 为云函数地址
2. 将 `server/index.js` 中的路由处理迁移到云函数
3. `npm run build` 构建静态文件
4. 使用 `tcb hosting deploy dist` 部署前端
5. 使用 `tcb fn deploy` 部署云函数

## 技术栈

- Vue 3.5 + Composition API (`<script setup>`)
- Vite 6 + vite-plugin-pwa
- vue-router 4 (Hash 模式)
- 纯 CSS 变量主题（无 UI 框架依赖）
- Node.js 原生 HTTP（Mock 后端，零依赖）

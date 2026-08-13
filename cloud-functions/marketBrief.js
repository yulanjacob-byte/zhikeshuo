/**
 * 腾讯云 CloudBase 云函数模板
 *
 * 部署步骤：
 * 1. npm install -g @cloudbase/cli
 * 2. tcb login
 * 3. tcb fn deploy marketBrief --path ./cloud-functions/marketBrief
 *
 * 每个 API 端点对应一个云函数，下面以 marketBrief 为例
 * 其他端点（dailyScripts, generateScript 等）结构相同
 */

// 云函数入口
exports.main = async (event) => {
  const { httpMethod, body, queryStringParameters: qs } = event

  try {
    // POST + aiType=emotion → 市场情绪分析
    if (httpMethod === 'POST' && body) {
      const data = JSON.parse(body)
      if (data.aiType === 'emotion') {
        return handleEmotion(data)
      }
    }

    // GET → 行情数据
    return handleMarketBrief(qs)
  } catch (err) {
    return {
      ok: false,
      error: err.message
    }
  }
}

/** 获取实时行情数据 */
async function handleMarketBrief(qs) {
  // 实际项目中：调用东方财富/新浪财经等行情 API
  // const res = await fetch('https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f12,f14')
  // const data = await res.json()

  // 示例数据
  const indices = [
    { code: 'sh000001', name: '上证指数', price: 3809.66, changePct: -0.59 },
    { code: 'sz399001', name: '深证成指', price: 13448.29, changePct: -0.96 },
    { code: 'sz399006', name: '创业板指', price: 3302.55, changePct: -1.24 }
  ]

  return {
    ok: true,
    indices,
    breadth: { turnover: '两市成交 1.997万亿', up: 4005, down: 1466 },
    sectors: {
      top: [{ name: '核电 +5.23%' }],
      bottom: [{ name: '半导体 -5.84%' }]
    }
  }
}

/** 市场情绪分析（AI 生成） */
async function handleEmotion(data) {
  // 实际项目中：调用大模型 API 生成情绪分析
  //
  // 腾讯混元示例：
  // const { ChatCompletions } = require('tencentcloud-sdk-nodejs-hunyuan')
  // const client = new ChatCompletions({ credential: { secretId, secretKey } })
  // const resp = await client.ChatCompletions({
  //   Model: 'hunyuan-pro',
  //   Messages: [{ Role: 'user', Content: prompt }]
  // })

  return {
    ok: true,
    emotion: {
      level: 'neutral',
      label: '市场情绪中性',
      hint: '指数下跌但个股普涨，市场分化明显'
    },
    strategy: '当前市场呈现分化格局。建议主动沟通...',
    promptVersion: 'v1.0'
  }
}

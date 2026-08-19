/**
 * Mock 后端服务
 * 用于本地开发，模拟云函数的 AI 生成与行情数据接口
 *
 * 接入真实 AI 时，替换 generateAI() 函数为调用大模型 API（如腾讯混元、OpenAI 等）
 * 部署到腾讯云 CloudBase 时，将各路由处理函数迁移到云函数中即可
 *
 * 启动：npm run server
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { fetchMarketData, fetchKlineByRange, fetchIndices, fetchAllIndices, fetchIndexQuote } from './marketData.js'
import {
  callHunyuan,
  buildMarketBriefPrompt,
  buildMacroBriefPrompt,
  buildEmotionPrompt,
  buildDailyScriptsPrompt,
  buildGenerateScriptPrompt
} from './aiClient.js'

const PORT = process.env.PORT || 3000

// ==================== 手册知识库加载 ====================

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KB_PATH = path.join(__dirname, '..', 'src', 'data', 'handbook_kb.json')

let kbData = null
try {
  const raw = fs.readFileSync(KB_PATH, 'utf-8')
  kbData = JSON.parse(raw)
  console.log(`  📚 手册知识库已加载: ${kbData.totalPages} 页, ${kbData.totalChunks} 检索块`)
} catch (e) {
  console.warn(`  ⚠️ 手册知识库加载失败: ${e.message}`)
}

/** 关键词提取：2-4字滑窗 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') return []
  const cleaned = text.replace(/[\s\n\r，。！？、；：""''（）()\[\]{}/<>@#\$%\^&\*\+=]/g, '')
  const keywords = new Set()
  for (let i = 0; i < cleaned.length - 1; i++) keywords.add(cleaned.substring(i, i + 2))
  for (let i = 0; i < cleaned.length - 2; i++) keywords.add(cleaned.substring(i, i + 3))
  for (let i = 0; i < cleaned.length - 3; i++) keywords.add(cleaned.substring(i, i + 4))
  return Array.from(keywords)
}

/** chunk 评分 */
function scoreChunk(chunkText, keywords) {
  if (!chunkText || keywords.length === 0) return 0
  let score = 0
  for (const kw of keywords) {
    if (chunkText.includes(kw)) {
      score += kw.length === 4 ? 4 : kw.length === 3 ? 3 : kw.length === 2 ? 1.5 : 1
    }
  }
  return score
}

/** 手册检索 */
function searchHandbook(query, options = {}) {
  const topK = options.topK || 3
  const minScore = options.minScore || 2
  if (!query || !kbData) return []

  const keywords = extractKeywords(query)
  if (keywords.length === 0) return []

  const scored = kbData.chunks.map(chunk => ({
    page: chunk.page,
    text: chunk.text,
    score: scoreChunk(chunk.text, keywords)
  }))

  const filtered = scored.filter(s => s.score >= minScore)

  // 按页聚合
  const pageMap = new Map()
  for (const s of filtered) {
    const existing = pageMap.get(s.page)
    if (!existing || s.score > existing.score) pageMap.set(s.page, s)
  }

  return Array.from(pageMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(r => ({
      title: `手册第 ${r.page} 页`,
      snippet: r.text.replace(/\n{2,}/g, '\n').trim().substring(0, 120) + '...',
      score: Math.round(r.score)
    }))
}

/** 构建检索查询 */
function buildSearchQuery(tagNames = [], context = '', stageId = '') {
  const parts = []
  if (Array.isArray(tagNames)) parts.push(tagNames.join(' '))
  if (context) parts.push(context)
  const stageKeywords = {
    first: '首次接触 破冰 建立信任 了解需求',
    reject: '拒绝处理 异议 应对 顾虑 化解',
    close: '成交推进 促成 签约 确认',
    after: '售后 回访 检视 跟进 陪伴'
  }
  if (stageKeywords[stageId]) parts.push(stageKeywords[stageId])
  return parts.join(' ')
}

// ==================== 模拟数据 ====================

const mockIndices = [
  { code: 'sh000001', name: '上证指数', price: 3940.04, changePct: 1.02, prevClose: 3900.26 },
  { code: 'sz399001', name: '深证成指', price: 14311.01, changePct: 1.42, prevClose: 14113.65 },
  { code: 'sz399006', name: '创业板指', price: 3563.12, changePct: 1.35, prevClose: 3515.65 },
  { code: 'sh000300', name: '沪深300', price: 4694.44, changePct: 0.93, prevClose: 4651.02 },
  { code: 'sh000905', name: '中证500', price: 7980.12, changePct: 1.93, prevClose: 7829.45 },
  { code: 'sh000688', name: '科创50', price: 1620.33, changePct: 2.15, prevClose: 1586.30 }
]

const mockBoardsUp = [
  { name: 'CXO概念', changePct: 11.61 },
  { name: 'CRO概念', changePct: 11.13 },
  { name: '创新药', changePct: 7.41 },
  { name: 'BC电池', changePct: 6.11 },
  { name: '宽带提速', changePct: 5.32 },
  { name: 'TOPCon', changePct: 5.12 }
]

const mockBoardsDown = [
  { name: '生物育种', changePct: -1.5 },
  { name: '信息安全', changePct: -1.38 },
  { name: '生物燃料', changePct: -1.27 },
  { name: '黄河三角', changePct: -1.1 },
  { name: '猪肉', changePct: -1.09 },
  { name: '含GDR', changePct: -1.08 }
]

const mockBreadth = {
  upCount: 2856,
  downCount: 2536,
  amountYi: 26600,
  limitUp: 74,
  limitDown: 4,
  volumeChange: { pct: 5.36, diffYi: 1356, label: '放量', pending: false }
}

/** 生成 mock kline 数据（30 天趋势，日期以当天为基准） */
function genMockKline(price, changePct) {
  const points = []
  const endPrice = price
  const startPrice = price / (1 + changePct / 100)
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const progress = i / 29
    const basePrice = startPrice + (endPrice - startPrice) * progress
    const noise = (Math.random() - 0.5) * basePrice * 0.02
    const close = basePrice + noise
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    points.push({
      date: d.toISOString().slice(0, 10),
      close: Number(close.toFixed(2))
    })
  }
  // 最后一个点用准确价格
  points[points.length - 1].close = price
  return points
}

/** 为所有指数生成 kline 数据 */
function genAllKlines() {
  const map = {}
  for (const idx of mockIndices) {
    map[idx.code] = genMockKline(idx.price, idx.changePct)
  }
  return map
}

// ==================== AI 生成（混元 API + Mock 兜底） ====================

/**
 * 统一 AI 生成入口
 * 优先调用腾讯混元 API，失败时降级到 mock 响应
 *
 * @param {string} type - AI 类型：emotion/marketBrief/macroBrief/dailyScripts/generateScript
 * @param {Object} ctx - 上下文数据（行情数据、客户信息等）
 */
async function generateAI(type, ctx = {}) {
  console.log(`[AI] 请求类型: ${type}`)

  let aiResult = null

  try {
    if (type === 'emotion') {
      const prompt = buildEmotionPrompt(ctx.marketData)
      const text = await callHunyuan(prompt.messages, { jsonFormat: prompt.jsonFormat, maxTokens: prompt.maxTokens })
      if (text) {
        const parsed = JSON.parse(text)
        aiResult = {
          emotion: parsed.emotion,
          strategy: parsed.strategy
        }
      }
    }

    else if (type === 'marketBrief') {
      const prompt = buildMarketBriefPrompt(ctx.marketData)
      const text = await callHunyuan(prompt.messages, { jsonFormat: prompt.jsonFormat, maxTokens: prompt.maxTokens })
      if (text) {
        const parsed = JSON.parse(text)
        aiResult = { ai: parsed }
      }
    }

    else if (type === 'macroBrief') {
      const prompt = buildMacroBriefPrompt(ctx.marketData)
      const text = await callHunyuan(prompt.messages, { maxTokens: prompt.maxTokens })
      if (text) {
        aiResult = { article: text }
      }
    }

    else if (type === 'dailyScripts') {
      const prompt = buildDailyScriptsPrompt(ctx.marketData)
      const text = await callHunyuan(prompt.messages, { jsonFormat: prompt.jsonFormat, maxTokens: prompt.maxTokens })
      if (text) {
        const parsed = JSON.parse(text)
        aiResult = {
          scripts: parsed.scripts,
          moments: parsed.moments
        }
      }
    }

    else if (type === 'generateScript') {
      const prompt = buildGenerateScriptPrompt(ctx)
      const text = await callHunyuan(prompt.messages, { maxTokens: prompt.maxTokens })
      if (text) {
        aiResult = {
          title: '【客户沟通】基于场景的话术建议',
          scene: '适用：根据客户实际情况灵活使用',
          body: text
        }
      }
    }
  } catch (e) {
    console.error(`[AI] 混元调用失败，降级到 mock:`, e.message)
  }

  // 降级到 mock
  if (!aiResult) {
    console.log(`[AI] 使用 mock 响应: ${type}`)
    aiResult = mockGenerateAI(type)
  } else {
    console.log(`[AI] 混元生成成功: ${type}`)
  }

  return aiResult
}

/** Mock 响应（混元 API 不可用时兜底） */
function mockGenerateAI(type) {
  if (type === 'emotion') {
    return {
      emotion: {
        level: 'neutral',
        label: '市场情绪中性',
        hint: '指数下跌但个股普涨，市场分化明显，情绪不算悲观'
      },
      strategy: '当前市场呈现"指数绿、个股红"的分化格局。建议：\n\n1. 对重仓成长方向的客户，主动沟通解释调整原因是估值消化而非逻辑恶化\n2. 对想追热点的客户，提醒分批参与、控制比例\n3. 对定投客户，强调当前是较好的积攒份额时机\n4. 整体沟通基调：稳住心态，结构比点位重要'
    }
  }

  if (type === 'marketBrief') {
    return {
      ai: {
        summary: '今日A股三大指数集体收涨，沪指重回3900点上方。盘面呈现"医药+新能源"双主线格局，CXO/CRO概念受创新药政策利好刺激大面积涨停，TOPCon、BC电池等光伏新技术方向同步走强。两市成交2.66万亿，较昨日放量5.36%，增量资金入场迹象明显。涨跌比接近53:47，赚钱效应回暖。',
        topics: [
          '🔥 主线一：CXO/CRO概念暴涨逾11%，受益于创新药支持政策落地，行业基本面拐点预期升温',
          '⚡ 主线二：光伏新技术（TOPCon/BC电池）集体走强，产能出清后盈利预期改善',
          '📊 成交放量：两市2.66万亿，较昨日+1356亿，增量资金入场',
          '⚠️ 注意：生物育种、信息安全等防御板块小幅调整，资金从低风险方向流出'
        ],
        caution: '以上解读基于公开市场数据，不构成投资建议。市场有风险，投资需谨慎。'
      }
    }
  }

  if (type === 'macroBrief') {
    return {
      article: '【国内宏观】\n\n央行公开市场操作维持流动性合理充裕，近期通过逆回购净投放，银行间资金面平稳。国常会审议通过多项政策，重点支持科技创新和制造业升级，创新药、新能源等方向获得政策利好。\n\n财政政策方面，专项债发行节奏加快，基建投资增速有望企稳。房地产政策持续优化，多地取消限购限售，但销售数据仍待观察。\n\n【海外市场】\n\n美联储议息会议临近，市场预期偏鸽。美债收益率回落，外围流动性环境改善。欧洲经济数据偏弱，全球风险偏好分化。\n\n【市场展望】\n\n国内政策面持续释放积极信号，叠加海外流动性预期改善，A股结构性机会值得关注。建议关注：\n1. 受益于政策支持的科技创新方向（创新药、新能源新技术）\n2. 估值处于低位的优质蓝筹\n3. 具备高股息特征的防御品种\n\n风险提示：经济恢复节奏仍有不确定性，外部环境复杂多变，需关注政策落地效果和数据验证。'
    }
  }

  if (type === 'dailyScripts') {
    return {
      scripts: [
        {
          title: '【浮亏安抚】科技基金深套客户的主动触达',
          scene: '适用：重仓科技/成长方向、浮亏较大的客户 · 建议电话沟通',
          body: 'XX总，最近市场波动确实比较大，特别是成长方向的调整，您的感受我完全理解。跟您说三个事实：第一，这次调整主要是前期涨幅过大后的估值消化，不是基金本身的逻辑变了；第二，全市场仍有大量个股上涨，资金并没有离场，只是在做高低切换；第三，历史上每一轮这种级别的调整，最后比的不是谁跑得快，而是谁的配置结构合理、拿得住。我建议这周内帮您做一次组合体检，看看每只基金跌的原因是市场因素还是产品因素。您看明天方便吗？'
        },
        {
          title: '【热点降温】客户想追核电热点',
          scene: '适用：看到核电涨停潮要求买入的客户 · 建议微信沟通',
          body: '您关注到核电这个方向，说明对市场很敏感。不过有两点想提醒您：一是这类消息刺激型的上涨，历史上持续性往往不强，追在最热的时候容易买在情绪高点；二是就算长期看好，也要看它在您整体资产中占多大比例，而不是单点押注。如果确实看好，可以用小比例、分批的方式参与。您看这样行吗？'
        },
        {
          title: '【定投提醒】下跌行情中的定投续投',
          scene: '适用：设置定投但近期想暂停的客户 · 建议微信沟通',
          body: 'XX总，看到您这周的定投还没扣款。现在的位置恰恰是定投性价比最高的时候——同样的钱能买到更多份额，拉低平均成本。历史数据看，坚持定投的账户恢复速度比一次性买入快30%-50%。如果资金有安排，可以调低金额但建议不要完全停掉。您看怎么安排合适？'
        }
      ],
      moments: '【市场观察】指数调整但个股普涨，结构比点位重要。前期领涨的板块在消化估值，资金转向低位方向。手里的组合拿的是什么、为什么拿，比今天涨没涨重要。（个人观察，不构成投资建议）'
    }
  }

  if (type === 'generateScript') {
    return {
      title: '【客户沟通】基于场景的话术建议',
      scene: '适用：根据客户实际情况灵活使用',
      body: 'XX总，感谢您的信任。根据您目前的情况，我有几点建议想跟您分享：首先，当前市场环境下，分散配置比集中押注更重要；其次，定期检视组合的必要性——市场在变，我们的策略也需要动态调整；最后，投资是一场马拉松，短期波动不必过度焦虑。如果您方便的话，我们可以约个时间详细聊聊您的配置情况，看看是否有优化的空间。您看这周哪天方便？'
    }
  }

  if (type === 'score') {
    return {
      scores: {
        risk: 75,
        horizon: 80,
        allocation: 65,
        liquidity: 70,
        timing: 55
      },
      summary: '整体风险承受能力较好，投资期限匹配度较高，但资产配置和时机把握有优化空间',
      recommendation: '建议：\n1. 适度增加固收类资产比例，降低组合波动\n2. 当前成长方向仓位偏重，建议分批均衡\n3. 市场震荡期适合定投策略，平滑成本\n4. 保持至少6个月的生活备用金不受投资影响'
    }
  }

  return { text: 'AI 生成内容（Mock）' }
}

// ==================== Markdown 清洗 ====================

/** 去除 AI 返回内容中的 Markdown 格式符号 */
function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text
  return text
    .replace(/^#{1,6}\s+/gm, '')      // 去除行首 # 标题
    .replace(/\*\*(.+?)\*\*/g, '$1')   // 去除 **加粗**
    .replace(/\*(.+?)\*/g, '$1')       // 去除 *斜体*
    .replace(/`([^`]+)`/g, '$1')       // 去除 `代码`
    .replace(/^>\s+/gm, '')            // 去除 > 引用
    .replace(/^[-*]\s+/gm, '')         // 去除列表符号
    .replace(/^\d+\.\s+/gm, '')        // 去除有序列表符号（可选）
}

// ==================== 行情数据缓存 ====================

let _marketCache = null
let _marketCacheTime = 0
const MARKET_CACHE_TTL = 30000 // 30秒缓存

/** 带缓存的行情数据获取 */
async function getCachedMarketData() {
  const now = Date.now()
  if (_marketCache && (now - _marketCacheTime) < MARKET_CACHE_TTL) {
    console.log('[行情] 使用缓存数据（距上次刷新 %dms）', now - _marketCacheTime)
    return _marketCache
  }

  console.log('[行情] 缓存过期，重新拉取实时数据...')
  let marketData = null
  try {
    marketData = await fetchMarketData()
    if (marketData.indices.length === 0) {
      console.warn('[行情] 返回空数据，降级到 mock')
      marketData = null
    }
  } catch (e) {
    console.warn('[行情] 请求失败，降级到 mock:', e.message)
    marketData = null
  }

  if (!marketData) {
    marketData = {
      indices: mockIndices,
      boardsUp: mockBoardsUp,
      boardsDown: mockBoardsDown,
      breadth: mockBreadth,
      kline: genAllKlines()
    }
  }

  _marketCache = marketData
  _marketCacheTime = now
  return marketData
}

// ==================== AI 结果缓存 ====================

const _aiCache = new Map() // key: type + ctxHash → { data, time }
const AI_CACHE_TTL = 300000 // 5分钟缓存

/** 带缓存的 AI 生成（5分钟内多人请求返回同一份结果） */
async function getCachedAI(type, ctx = {}) {
  // 生成缓存 key：type + 关键上下文的哈希
  const ctxKey = JSON.stringify(ctx || {})
  const cacheKey = `${type}:${ctxKey}`
  const cached = _aiCache.get(cacheKey)

  if (cached && (Date.now() - cached.time) < AI_CACHE_TTL) {
    console.log(`[AI缓存] 命中: ${type}（距上次生成 ${Math.round((Date.now() - cached.time) / 1000)}秒前）`)
    return cached.data
  }

  // 缓存未命中，调用 AI 生成
  console.log(`[AI缓存] 未命中: ${type}，调用 DeepSeek 生成...`)
  const data = await generateAI(type, ctx)
  _aiCache.set(cacheKey, { data, time: Date.now() })
  return data
}

/** 清除指定类型的 AI 缓存（可选：行情刷新时清除） */
function clearAICache(type) {
  if (type) {
    for (const key of _aiCache.keys()) {
      if (key.startsWith(type + ':')) _aiCache.delete(key)
    }
  } else {
    _aiCache.clear()
  }
}

// ==================== 路由处理 ====================

/** 市场简报 */
async function handleMarketBrief(req) {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const noai = url.searchParams.get('noai') === '1'

  // POST + aiType=emotion → 市场情绪
  if (req.method === 'POST') {
    const body = await parseBody(req)
    if (body.aiType === 'emotion') {
      const marketData = await getCachedMarketData()
      const result = await getCachedAI('emotion', { marketData })
      return {
        ok: true,
        emotion: stripMarkdown(result.emotion),
        strategy: stripMarkdown(result.strategy),
        promptVersion: 'hunyuan-v1'
      }
    }
  }

  // 获取行情数据（带缓存）
  const marketData = await getCachedMarketData()

  const baseData = {
    ok: true,
    indices: marketData.indices,
    breadth: marketData.breadth,
    boardsUp: marketData.boardsUp,
    boardsDown: marketData.boardsDown,
    kline: marketData.kline
  }

  if (noai) {
    return baseData
  }

  // 带 AI 的市场简报（盘面解读）
  const ai = await getCachedAI('marketBrief', { marketData })
  const aiData = ai.ai || {}
  return {
    ...baseData,
    ai: {
      ...aiData,
      summary: stripMarkdown(aiData.summary),
      topics: (aiData.topics || []).map(stripMarkdown),
      caution: stripMarkdown(aiData.caution)
    },
    time: new Date().toISOString(),
    promptVersion: 'hunyuan-v1'
  }
}

/** 今日话术 */
async function handleDailyScripts() {
  const marketData = await getCachedMarketData()
  const result = await getCachedAI('dailyScripts', { marketData })
  const scripts = (result.scripts || []).map(s => ({
    ...s,
    body: stripMarkdown(s.body),
    title: stripMarkdown(s.title),
    scene: stripMarkdown(s.scene)
  }))
  return {
    ok: true,
    ai: {
      scripts,
      moments: stripMarkdown(result.moments)
    },
    promptVersion: 'hunyuan-v1'
  }
}

/** 生成话术 */
async function handleGenerateScript(req) {
  const body = await parseBody(req)

  // 合规检测：检查客户情况中是否包含产品信息
  if (body.context) {
    const productHit = detectProduct(body.context)
    if (productHit) {
      return {
        ok: false,
        err: 'product-blocked',
        hits: [productHit],
        suggestion: '😊 请勿透露具体产品信息（基金代码/名称/经理），话术生成器不对客推荐具体产品。请移除后重试。'
      }
    }
  }

  // RAG 检索：从手册中匹配相关段落
  const tagNames = (body.tags || []).slice(0, 6).map(id => {
    // 标签 ID 转名称的逻辑在后端简化处理，直接用 ID 中的信息
    return id
  })
  const searchQuery = buildSearchQuery(tagNames, body.context || '', body.stage || '')
  const sources = searchHandbook(searchQuery, { topK: 3, minScore: 2 })

  const result = await getCachedAI('generateScript', {
    channel: body.channel || 'wechat',
    stage: body.stage || 'first',
    tags: tagNames,
    context: body.context || '',
    sources
  })

  // 构建标签名列表用于 matchInfo
  const tagNameList = (body.tags || []).slice(0, 6).join('、')

  return {
    ok: true,
    script: stripMarkdown(typeof result === 'string' ? result : (result.body || result.script || '')),
    sources,
    matchInfo: tagNameList ? `画像标签：${tagNameList}（${(body.tags || []).length}个）` : '',
    promptVersion: 'hunyuan-v1'
  }
}

/** 简单的产品信息检测（后端版本） */
function detectProduct(text) {
  if (!text) return null
  // 6位数字基金代码
  if (/\b\d{6}\b/.test(text)) return '基金代码'
  // 基金公司名称
  const companies = ['易方达', '华夏', '南方', '广发', '汇添富', '嘉实', '博时', '富国', '招商', '工银', '兴全', '中欧', '景顺', '交银', '银华', '鹏华', '国泰', '华安', '万家', '长城']
  for (const c of companies) {
    if (text.includes(c)) return `基金公司名称（${c}）`
  }
  // 基金经理姓名
  const managers = ['张坤', '葛兰', '刘彦春', '谢治宇', '董承非', '傅鹏博', '朱少醒', '周蔚文']
  for (const m of managers) {
    if (text.includes(m)) return `基金经理姓名（${m}）`
  }
  return null
}

/** 评分 */
async function handleScore(req) {
  const body = await parseBody(req)
  const result = await generateAI('score')
  return {
    ok: true,
    scores: result.scores,
    summary: result.summary,
    recommendation: result.recommendation,
    promptVersion: 'mock-v1'
  }
}

/** 宏观简报 */
async function handleMacroBrief() {
  const marketData = await getCachedMarketData()
  const result = await getCachedAI('macroBrief', { marketData })
  return {
    ok: true,
    article: stripMarkdown(result.article),
    promptVersion: 'hunyuan-v1'
  }
}

/** 指数行情页（国内 8 + 海外 5）—— 30秒缓存 */
let _indexAllCache = null
let _indexAllCacheTime = 0
async function handleIndexAll() {
  // 30秒缓存，避免频繁请求腾讯API导致超时
  if (_indexAllCache && (Date.now() - _indexAllCacheTime) < 30000) {
    return _indexAllCache
  }
  const data = await fetchAllIndices()
  if (!data) {
    return {
      ok: false,
      error: '获取指数行情失败',
      domestic: [],
      overseas: [],
      kline: {}
    }
  }
  _indexAllCache = { ok: true, ...data }
  _indexAllCacheTime = Date.now()
  return _indexAllCache
}

/** 指数详情 */
async function handleIndexDetail(req) {
  const body = await parseBody(req)
  const code = body.code || body.infoCode || 'sh000001'
  const window = body.window || '3m'

  // 获取实时行情：单指数精确查询（国内/海外均支持），失败再降级批量接口
  let idx = null
  try {
    idx = await fetchIndexQuote(code)
  } catch {}
  if (!idx) {
    try {
      const indices = await fetchIndices()
      idx = indices?.find(i => i.code === code) || null
    } catch {}
  }

  // 获取多周期K线
  let kline = null
  try {
    kline = await fetchKlineByRange(code, window)
  } catch {}

  if (!kline || kline.length === 0) {
    // 降级到 mock K线
    kline = genMockKline(idx?.price || 3940, idx?.changePct || 1.02).map(p => ({
      ...p,
      open: p.close * (1 + (Math.random() - 0.5) * 0.01),
      high: p.close * (1 + Math.random() * 0.01),
      low: p.close * (1 - Math.random() * 0.01),
      volume: Math.floor(Math.random() * 100000000)
    }))
  }

  // 计算技术指标
  const closes = kline.map(k => k.close)
  const ma5 = calcMA(closes, 5)
  const ma10 = calcMA(closes, 10)
  const ma20 = calcMA(closes, 20)
  const rsi = calcRSI(closes, 14)
  const macd = calcMACD(closes)

  // 多窗口走势
  const ranges = [
    { label: '近1周', key: '1w', datalen: 5 },
    { label: '近1月', key: '1m', datalen: 20 },
    { label: '近3月', key: '3m', datalen: 60 },
    { label: '近半年', key: '6m', datalen: 120 },
    { label: '近1年', key: '1y', datalen: 250 }
  ]

  const multiWindow = []
  for (const r of ranges) {
    const slice = closes.slice(-r.datalen)
    if (slice.length >= 2) {
      const pct = ((slice[slice.length - 1] - slice[0]) / slice[0]) * 100
      multiWindow.push({ label: r.label, pct: Number(pct.toFixed(2)) })
    }
  }

  // 区间统计
  const rangeHigh = Math.max(...kline.map(k => k.high))
  const rangeLow = Math.min(...kline.map(k => k.low))
  const highIdx = kline.findIndex(k => k.high === rangeHigh)
  const lowIdx = kline.findIndex(k => k.low === rangeLow)
  const currentPrice = idx?.price || closes[closes.length - 1]
  const distFromHigh = ((currentPrice - rangeHigh) / rangeHigh * 100)
  const distFromLow = ((currentPrice - rangeLow) / rangeLow * 100)
  const position = Math.max(0, Math.min(100, ((currentPrice - rangeLow) / (rangeHigh - rangeLow) * 100)))

  // 判断走势类型
  let trendLabel = '区间震荡'
  if (position > 70) trendLabel = '高位运行'
  else if (position < 30) trendLabel = '低位运行'
  if (distFromLow > 5 && multiWindow[0]?.pct > 0) trendLabel = '震荡上行'
  if (distFromHigh < -5 && multiWindow[0]?.pct < 0) trendLabel = '震荡下行'

  // 指数介绍
  const intros = {
    'sh000001': '综合反映上交所全部A股价格走势的核心大盘指数，由在上交所上市的全部A股加权计算。是市场关注度最高的A股风向标，也是观察A股整体强弱的首选指标。',
    'sz399001': '反映深交所主板上市股票整体表现的综合指数，覆盖深圳市场主要大中型企业，是衡量深圳市场整体走势的重要参考指标。',
    'sz399006': '反映创业板市场整体走势的核心指数，由创业板中市值大、流动性好的100只股票组成，聚焦科技创新和成长型企业。',
    'sh000300': '由沪深两市中市值大、流动性好的300只股票组成，覆盖A股核心资产，是衡量大盘蓝筹股整体表现的基准指数。',
    'sh000905': '反映沪深市场中小市值公司股票整体表现的指数，由剔除沪深300成分股后的500只股票组成，是中盘股走势的代表。',
    'sh000688': '反映科创板市场整体走势的综合指数，聚焦"硬科技"领域企业，是观察中国科技创新企业发展状况的重要指标。',
    'sh000852': '由沪深两市中剔除沪深300和中证500成分股后的1000只小盘股组成，反映A股小市值公司的整体表现。',
    'bj899050': '反映北京证券交易所上市公司整体表现的核心指数，聚焦专精特新中小企业，是观察北交所市场走势的代表性指标。',
    'hkHSI': '香港股市最具代表性的旗舰指数，由港交所市值最大、流动性最好的蓝筹股组成，是观察港股整体走势和市场情绪的核心指标。',
    'hkHSTECH': '追踪在香港上市的30家最大科技公司表现的指数，覆盖互联网、电商、智能硬件等新经济龙头，是港股科技板块的代表性指标。',
    'usDJI': '美国历史最悠久的股票指数，由30家美国工业龙头蓝筹股组成，价格加权计算，是观察美国经济和大企业表现的传统风向标。',
    'usIXIC': '涵盖纳斯达克交易所上市的全部股票，科技股权重高，是全球科技股和创新企业走势的核心指标。',
    'usINX': '由美国500家大型上市公司组成的指数，行业覆盖均衡，被广泛视为衡量美国大盘股整体表现的最佳基准。'
  }

  const nameMap = {
    'sh000001': '上证指数', 'sz399001': '深证成指', 'sz399006': '创业板指',
    'sh000300': '沪深300', 'sh000905': '中证500', 'sh000688': '科创50',
    'sh000852': '中证1000', 'bj899050': '北证50',
    'hkHSI': '恒生指数', 'hkHSTECH': '恒生科技',
    'usDJI': '道琼斯', 'usIXIC': '纳斯达克', 'usINX': '标普500'
  }

  return {
    ok: true,
    detail: {
      code,
      name: nameMap[code] || code,
      price: currentPrice,
      changePct: idx?.changePct || 0,
      change: currentPrice - (idx?.prevClose || closes[closes.length - 2] || currentPrice),
      prevClose: idx?.prevClose || closes[closes.length - 2],
      intro: intros[code] || '',
      kline,
      ma: { ma5: ma5.at(-1), ma10: ma10.at(-1), ma20: ma20.at(-1) },
      ma5Arr: ma5, ma10Arr: ma10, ma20Arr: ma20,
      rsi: rsi.at(-1),
      macd,
      multiWindow,
      rangeStats: {
        high: rangeHigh,
        highDate: kline[highIdx]?.date || '',
        low: rangeLow,
        lowDate: kline[lowIdx]?.date || '',
        current: currentPrice,
        distFromHigh: Number(distFromHigh.toFixed(2)),
        distFromLow: Number(distFromLow.toFixed(2)),
        position: Number(position.toFixed(0)),
        trendLabel
      }
    }
  }
}

/** 计算移动平均线 */
function calcMA(closes, period) {
  const result = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(Number((sum / period).toFixed(2)))
  }
  return result
}

/** 计算RSI(14) */
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return [50]
  const result = []
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1]
      if (diff > 0) gains += diff
      else losses -= diff
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    if (avgLoss === 0) result.push(100)
    else {
      const rs = avgGain / avgLoss
      result.push(Number((100 - 100 / (1 + rs)).toFixed(1)))
    }
  }
  return result
}

/** 计算MACD(12,26,9) */
function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  const dif = []
  for (let i = 0; i < closes.length; i++) {
    if (ema12[i] != null && ema26[i] != null) {
      dif.push(Number((ema12[i] - ema26[i]).toFixed(2)))
    } else {
      dif.push(null)
    }
  }
  // DEA = EMA(DIF, 9)
  const difValid = dif.filter(v => v != null)
  const deaValid = calcEMA(difValid, 9)
  const dea = new Array(dif.length - difValid.length).fill(null).concat(deaValid)

  const lastDif = difValid[difValid.length - 1] || 0
  const lastDea = deaValid[deaValid.length - 1] || 0
  const macdHist = (lastDif - lastDea) * 2

  // 判断金叉/死叉
  let signal = '金叉多头'
  if (lastDif < lastDea) signal = '死叉空头'

  return {
    dif: lastDif,
    dea: lastDea,
    macd: Number(macdHist.toFixed(2)),
    signal,
    histLabel: macdHist >= 0 ? `红柱 +${macdHist.toFixed(2)}` : `绿柱 ${macdHist.toFixed(2)}`
  }
}

/** 计算EMA */
function calcEMA(data, period) {
  const result = []
  const k = 2 / (period + 1)
  let ema = null
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    if (ema === null) {
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0)
      ema = sum / period
    } else {
      ema = data[i] * k + ema * (1 - k)
    }
    result.push(Number(ema.toFixed(2)))
  }
  return result
}

/** 反馈 */
async function handleFeedback(req) {
  const body = await parseBody(req)
  console.log('[反馈]', JSON.stringify(body))
  return { ok: true }
}

// ==================== HTTP 服务 ====================

function parseBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) }
      catch { resolve({}) }
    })
  })
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(data))
}

const routes = {
  '/marketBrief': handleMarketBrief,
  '/dailyScripts': handleDailyScripts,
  '/generateScript': handleGenerateScript,
  '/macroBrief': handleMacroBrief,
  '/indexDetail': handleIndexDetail,
  '/indexAll': handleIndexAll,
  '/feedback': handleFeedback
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    sendJSON(res, {}, 204)
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const reqPath = url.pathname
  const handler = routes[reqPath]

  // API 路由
  if (handler) {
    try {
      const result = await handler(req)
      sendJSON(res, result)
    } catch (err) {
      console.error(`[错误] ${path}:`, err.message)
      sendJSON(res, { ok: false, error: err.message }, 500)
    }
    return
  }

  // 静态文件服务（生产模式，托管 dist/ 目录）
  const distDir = path.join(__dirname, '..', 'dist')
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url)

  // 安全检查：防止路径穿越
  if (!filePath.startsWith(distDir)) {
    sendJSON(res, { ok: false, error: 'Forbidden' }, 403)
    return
  }

  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  }

  try {
    const ext = path.extname(filePath)
    const contentType = mimeTypes[ext] || 'application/octet-stream'

    // SPA 回退：非 API 且非文件请求，返回 index.html
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html')
    }

    const data = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000' })
    res.end(data)
  } catch {
    sendJSON(res, { ok: false, error: 'Not found' }, 404)
  }
})

server.listen(PORT, () => {
  console.log(`\n  🚀 Mock 后端服务已启动: http://localhost:${PORT}`)
  console.log(`  📋 前端开发服务器: http://localhost:5173`)
  console.log(`  💡 Vite proxy 已配置 /api → localhost:${PORT}\n`)
})

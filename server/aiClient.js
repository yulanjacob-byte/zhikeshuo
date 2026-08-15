/**
 * DeepSeek AI 客户端
 *
 * API 文档：https://platform.deepseek.com/api-docs
 * 兼容 OpenAI 格式：https://api.deepseek.com/v1/chat/completions
 *
 * 配置方式：
 *   方式1：环境变量 DEEPSEEK_API_KEY=your_key
 *   方式2：项目根目录 .env 文件中写 DEEPSEEK_API_KEY=your_key
 *
 * 模型选择：
 *   deepseek-chat    - 通用对话（V4-Flash），性价比最高
 *   deepseek-reasoner - 推理模型（R1），复杂推理
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ==================== 配置 ====================

const DS_HOST = 'api.deepseek.com'
const DS_PATH = '/v1/chat/completions'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 读取 API Key */
function getApiKey() {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY

  try {
    const envPath = path.join(__dirname, '..', '.env')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const match = envContent.match(/DEEPSEEK_API_KEY\s*=\s*(.+)/)
    if (match) return match[1].trim().replace(/['"]/g, '')
  } catch {}

  return null
}

let _apiKey = null
let _checked = false

function apiKey() {
  if (!_checked) {
    _apiKey = getApiKey()
    _checked = true
    if (_apiKey) {
      console.log('  🤖 DeepSeek API Key 已加载')
    } else {
      console.log('  ⚠️ 未配置 DEEPSEEK_API_KEY，AI 功能将使用 mock 兜底')
      console.log('     配置方式：在项目根目录 .env 文件中写 DEEPSEEK_API_KEY=your_key')
    }
  }
  return _apiKey
}

// ==================== 核心 API 调用 ====================

/**
 * 调用 DeepSeek Chat Completions API
 * @param {Array<{role: string, content: string}>} messages - 消息列表
 * @param {Object} options - 可选参数
 * @param {string} options.model - 模型名，默认 deepseek-chat
 * @param {number} options.temperature - 温度，默认 0.8
 * @param {number} options.maxTokens - 最大输出 token，默认 4096
 * @param {boolean} options.jsonFormat - 是否要求 JSON 格式输出
 * @returns {Promise<string|null>} 生成的文本，失败返回 null
 */
export async function callHunyuan(messages, options = {}) {
  const key = apiKey()
  if (!key) return null

  const model = options.model || 'deepseek-chat'
  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.8,
    max_tokens: options.maxTokens || 4096
  }

  // 要求 JSON 格式输出
  if (options.jsonFormat) {
    body.response_format = { type: 'json_object' }
  }

  const postData = JSON.stringify(body)

  return new Promise((resolve) => {
    const req = https.request({
      hostname: DS_HOST,
      path: DS_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 60000
    }, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8')
        if (res.statusCode !== 200) {
          console.error(`[DeepSeek] API 返回 ${res.statusCode}:`, text.substring(0, 300))
          resolve(null)
          return
        }
        try {
          const json = JSON.parse(text)
          const content = json.choices?.[0]?.message?.content || ''
          const usage = json.usage
          console.log(`[DeepSeek] 生成完成 (${model}, ${usage?.total_tokens || '?'} tokens)`)
          resolve(content)
        } catch (e) {
          console.error('[DeepSeek] JSON 解析失败:', e.message)
          resolve(null)
        }
      })
    })

    req.on('error', (e) => {
      console.error('[DeepSeek] 请求失败:', e.message)
      resolve(null)
    })

    req.on('timeout', () => {
      req.destroy()
      console.error('[DeepSeek] 请求超时 (60s)')
      resolve(null)
    })

    req.write(postData)
    req.end()
  })
}

// ==================== 市场数据格式化 ====================

/**
 * 将市场数据格式化为 AI 可读的文本
 */
export function formatMarketContext(marketData) {
  if (!marketData) return '暂无实时行情数据'

  const parts = []

  // 指数
  if (marketData.indices?.length) {
    parts.push('【主要指数】')
    for (const idx of marketData.indices) {
      const dir = idx.changePct >= 0 ? '涨' : '跌'
      parts.push(`${idx.name} ${idx.price}点 ${dir}${Math.abs(idx.changePct).toFixed(2)}%（昨收${idx.prevClose}）`)
    }
  }

  // 涨跌分布
  if (marketData.breadth) {
    const b = marketData.breadth
    parts.push(`【涨跌分布】上涨${b.upCount}只 下跌${b.downCount}只`)
    if (b.amountYi) parts.push(`两市成交额${b.amountYi}亿元`)
    if (b.limitUp != null) parts.push(`涨停${b.limitUp}家 跌停${b.limitDown}家`)
  }

  // 板块
  if (marketData.boardsUp?.length) {
    parts.push('【领涨板块】' + marketData.boardsUp.map(b => `${b.name} ${b.changePct.toFixed(2)}%`).join('、'))
  }
  if (marketData.boardsDown?.length) {
    parts.push('【调整板块】' + marketData.boardsDown.map(b => `${b.name} ${b.changePct.toFixed(2)}%`).join('、'))
  }

  return parts.join('\n')
}

// ==================== Prompt 模板 ====================

/**
 * 盘面解读 prompt
 */
export function buildMarketBriefPrompt(marketData) {
  const ctx = formatMarketContext(marketData)
  return {
    messages: [
      {
        role: 'system',
        content: `你是一位资深的A股市场分析师，擅长用简洁专业的语言解读盘面。请基于提供的实时行情数据，生成今日盘面解读。

要求：
1. summary: 一段100-200字的盘面总结，概括今日走势特征、主线热点、资金动向
2. topics: 3-5条要点，每条以emoji开头，突出关键信息（热点板块、资金流向、异常信号等）
3. caution: 固定为"以上解读基于公开市场数据，不构成投资建议。市场有风险，投资需谨慎。"

请严格以JSON格式返回：{"summary":"...","topics":["...","..."],"caution":"以上解读基于公开市场数据，不构成投资建议。市场有风险，投资需谨慎。"}`
      },
      {
        role: 'user',
        content: `请解读以下今日A股行情数据：\n\n${ctx}`
      }
    ],
    jsonFormat: true,
    maxTokens: 2048
  }
}

/**
 * 宏观研判 prompt
 */
export function buildMacroBriefPrompt(marketData) {
  const ctx = formatMarketContext(marketData)
  return {
    messages: [
      {
        role: 'system',
        content: `你是一位宏观经济研究员，擅长梳理国内外宏观形势与市场展望。请基于最新行情数据和公开信息，生成宏观研判文章。

文章结构：
1. 【国内宏观】货币政策、财政政策、产业政策动态
2. 【海外市场】美联储动向、外围流动性、全球风险偏好
3. 【市场展望】结构性机会、关注方向、风险提示

要求：
- 文章长度500-800字
- 语言专业但不过于学术
- 必须包含风险提示
- 不要推荐具体产品
- 不要使用任何Markdown格式符号（如#、##、###、**、*、`等），用纯文本和数字编号组织内容

请直接返回文章全文（纯文本，不要JSON，不要Markdown）。`
      },
      {
        role: 'user',
        content: `当前A股行情数据：\n${ctx}\n\n请基于以上数据和近期公开宏观信息，生成今日宏观研判。`
      }
    ],
    maxTokens: 4096
  }
}

/**
 * 市场情绪 prompt
 */
export function buildEmotionPrompt(marketData) {
  const ctx = formatMarketContext(marketData)
  return {
    messages: [
      {
        role: 'system',
        content: `你是一位理财经理的市场情绪分析助手。请根据今日行情数据，判断当前市场情绪并给出客户沟通策略。

请以JSON格式返回：
{
  "emotion": {
    "level": "greedy|neutral|fearful",
    "label": "情绪标签（如'市场情绪偏暖'）",
    "hint": "一句话描述情绪特征"
  },
  "strategy": "针对理财经理的沟通策略建议，200-300字，分条列出不同类型客户的沟通要点"
}`
      },
      {
        role: 'user',
        content: `今日行情：\n${ctx}\n\n请分析市场情绪并给出沟通策略。`
      }
    ],
    jsonFormat: true,
    maxTokens: 2048
  }
}

/**
 * 今日话术 prompt
 */
export function buildDailyScriptsPrompt(marketData) {
  const ctx = formatMarketContext(marketData)
  return {
    messages: [
      {
        role: 'system',
        content: `你是一位银行理财经理的话术助手。请根据今日行情，生成3条针对不同客户场景的沟通话术和1条朋友圈文案。

要求：
1. scripts: 3条话术，每条包含 title（标题，带方括号场景标签）、scene（适用场景描述）、body（话术正文，200-300字，口语化、有温度）
2. moments: 1条朋友圈文案（100字以内，客观中立，不荐股不荐基）

话术场景选择标准：
- 场景1：针对持有相关方向产品且有浮亏/浮盈的客户
- 场景2：针对想追涨/抄底的客户
- 场景3：针对定投/长期持有客户的提醒

注意：
- 话术中不出现具体基金名称、代码、经理名
- 以"XX总"称呼客户
- 语言亲切自然，像真人说话
- 不要使用"尊敬的投资者"等套话

请以JSON格式返回：{"scripts":[{"title":"...","scene":"...","body":"..."}],"moments":"..."}`
      },
      {
        role: 'user',
        content: `今日行情：\n${ctx}\n\n请生成今日话术和朋友圈文案。`
      }
    ],
    jsonFormat: true,
    maxTokens: 4096
  }
}

/**
 * 话术生成器 prompt
 */
export function buildGenerateScriptPrompt(params) {
  const { channel, stage, tags, context, sources } = params

  const stageLabels = {
    first: '首次接触（破冰建信）',
    reject: '拒绝处理（异议化解）',
    close: '成交推进（促成签约）',
    after: '售后跟进（检视陪伴）'
  }

  const channelLabels = {
    wechat: '微信沟通',
    phone: '电话沟通',
    face: '面谈沟通'
  }

  let prompt = `请为以下客户场景生成沟通话术：\n\n`
  prompt += `沟通渠道：${channelLabels[channel] || channel}\n`
  prompt += `沟通阶段：${stageLabels[stage] || stage}\n`

  if (tags?.length) {
    prompt += `客户画像标签：${tags.join('、')}\n`
  }

  if (context) {
    prompt += `客户情况：${context}\n`
  }

  if (sources?.length) {
    prompt += `\n参考手册要点：\n`
    for (const s of sources) {
      prompt += `- ${s.snippet}\n`
    }
  }

  return {
    messages: [
      {
        role: 'system',
        content: `你是一位银行理财经理的话术教练，擅长根据不同客户场景生成个性化的沟通话术。

话术要求：
1. 开头要有温度，自然切入话题
2. 中间部分要有理有据，给出2-3个关键信息或建议
3. 结尾要有明确的行动建议或邀约（如"您看这周方便吗？"）
4. 语言口语化，像真人说话，不要用书面语套话
5. 用"XX总"称呼客户
6. 不出现具体基金名称、代码、经理名
7. 长度200-400字
8. 语气符合沟通渠道特点（微信偏简洁、电话偏亲切、面谈偏深入）
9. 不要使用任何Markdown格式符号（如#、**、*、`等），用纯文本

请直接返回话术全文（纯文本，不要JSON，不要标题前缀，不要Markdown）。`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    maxTokens: 2048
  }
}

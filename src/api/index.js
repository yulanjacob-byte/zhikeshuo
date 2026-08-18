/**
 * API 请求层
 * 统一封装 fetch，支持请求去重、超时控制、JSON 解析
 */

// 后端基地址 —— 开发环境走 Vite proxy，生产环境同源部署直接用相对路径
const BASE = import.meta.env.DEV ? '/api' : ''

const pending = {}

/** 尝试多层 JSON 解析 */
function parseBody(data) {
  let result = data
  if (typeof result === 'string') {
    try { result = JSON.parse(result) } catch {}
  }
  if (result && typeof result.body === 'string') {
    try { result = JSON.parse(result.body) } catch {}
  }
  return result
}

/**
 * 核心请求函数
 * @param {Object} opts - 请求选项
 * @param {string} opts.url - 请求路径
 * @param {string} [opts.method='GET'] - 请求方法
 * @param {Object} [opts.data] - 请求体数据
 * @param {number} [opts.timeout=60000] - 超时毫秒
 * @param {boolean} [opts.dedupe=true] - 是否去重
 */
function request(opts) {
  const url = opts.url
  const method = opts.method || 'GET'
  const timeout = opts.timeout || 60000
  const dedupe = opts.dedupe !== false
  const key = `${method} ${url}`

  // 请求去重：相同请求在飞行中则复用
  if (dedupe && pending[key]) return pending[key]

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeout)

  const fetchPromise = fetch(`${BASE}${url}`, {
    method,
    signal: controller.signal,
    headers: { 'content-type': 'application/json' },
    body: (method === 'GET' || method === 'HEAD') ? undefined : JSON.stringify(opts.data || {})
  })
    .then(res => {
      if (res.status >= 200 && res.status < 300) {
        const ct = res.headers.get('content-type') || ''
        if (!/application\/json|text\/json/i.test(ct)) {
          throw new Error('响应非 JSON（后端代理缺失，已降级到静态兜底）')
        }
        return res.text().then(parseBody)
      }
      throw new Error(`服务异常 HTTP ${res.status}`)
    })
    .catch(err => {
      if (timedOut || (err && err.name === 'AbortError')) {
        throw new Error('请求超时')
      }
      if (err && /HTTP \d+/.test(err.message)) throw err
      throw new Error('网络异常')
    })
    .finally(() => {
      clearTimeout(timer)
      if (dedupe) delete pending[key]
    })

  if (dedupe) pending[key] = fetchPromise
  return fetchPromise
}

// ==================== API 端点 ====================

/** 获取市场简报（含 AI 分析） */
export function marketBrief() {
  return request({ url: '/marketBrief', timeout: 20000 })
}

/** 获取市场简报（不含 AI） */
export function marketBriefNoAi() {
  return request({ url: '/marketBrief?noai=1', timeout: 20000 })
}

/** 市场情绪分析（AI 生成） */
export function marketBriefEmotion() {
  return request({
    url: '/marketBrief',
    method: 'POST',
    data: { aiType: 'emotion' },
    timeout: 60000,
    dedupe: false
  })
}

/** 获取今日 AI 话术 */
export function dailyScripts() {
  return request({ url: '/dailyScripts', timeout: 60000 })
}

/** 生成自定义话术 */
export function generateScript(data) {
  return request({
    url: '/generateScript',
    method: 'POST',
    data,
    timeout: 45000,
    dedupe: false
  })
}

/** 获取宏观简报 */
export function macroBrief() {
  return request({ url: '/macroBrief', timeout: 60000, dedupe: false })
}

/** 获取指数详情 */
export function indexDetail(code, window) {
  return request({
    url: '/indexDetail',
    method: 'POST',
    data: window ? { code, window } : { infoCode: code },
    timeout: 30000,
    dedupe: false
  })
}

/** 获取全部指数行情（国内+海外） */
export function indexAll() {
  return request({ url: '/indexAll', timeout: 30000 })
}

/** 提交用户反馈 */
export function feedback(data) {
  return request({
    url: '/feedback',
    method: 'POST',
    data,
    timeout: 10000,
    dedupe: false
  })
}

/** 提交合规反馈 */
export function complianceFeedback(data) {
  return feedback(Object.assign({ kind: 'complianceFeedback' }, data))
}

export default {
  BASE,
  marketBrief,
  marketBriefNoAi,
  marketBriefEmotion,
  dailyScripts,
  generateScript,
  macroBrief,
  indexDetail,
  indexAll,
  feedback,
  complianceFeedback
}

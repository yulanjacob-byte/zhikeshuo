/**
 * 实时行情数据模块
 * 数据来源：腾讯财经 qt.gtimg.cn + 新浪财经 + 东方财富 push2.eastmoney.com
 * 免费接口，无需 API Key
 *
 * 代理兼容：当 Node.js https 直连失败时（如 Clash 代理拦截），
 * 自动降级为 PowerShell Invoke-WebRequest（走系统代理 + 信任系统证书）
 */

import https from 'https'
import iconv from 'iconv-lite'
import { execSync } from 'child_process'

// ==================== Shell 降级请求 ====================

/**
 * 通过 PowerShell 获取 URL 内容（走系统代理，兼容 Clash 等 MITM 代理）
 * 仅在 Windows 上可用，用于 https 直连失败时的降级
 * 使用 -EncodedCommand 避免 cmd/PowerShell 引号转义问题
 * 返回原始字节（Base64 解码），保留 GBK 等原始编码供调用方处理
 */
function httpGetViaShell(url, customHeaders = {}) {
  if (process.platform !== 'win32') return null
  try {
    const allHeaders = { ...HEADERS, ...customHeaders }
    const headerStr = Object.entries(allHeaders)
      .map(([k, v]) => `'${k}'='${v}'`).join('; ')
    const psScript = `$r = Invoke-WebRequest -Uri '${url}' -TimeoutSec 10 -UseBasicParsing -Headers @{ ${headerStr} }; [Convert]::ToBase64String($r.RawContentStream.ToArray())`
    // Base64 (UTF-16LE) 编码 PowerShell 脚本，彻底避免引号/特殊字符问题
    const encodedCmd = Buffer.from(psScript, 'utf16le').toString('base64')
    const b64output = execSync(`powershell -NoProfile -EncodedCommand ${encodedCmd}`, {
      encoding: 'utf-8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 15000
    }).trim()
    if (b64output && b64output.length > 0) {
      const rawBuf = Buffer.from(b64output, 'base64')
      if (rawBuf.length > 0) {
        return { ok: true, buffer: rawBuf, text: () => rawBuf.toString('utf-8') }
      }
    }
  } catch (e) {
    // PowerShell 请求也失败
  }
  return null
}

// ==================== 常量 ====================

const TX_BASE = 'https://qt.gtimg.cn/q='
const SINA_HQ = 'https://hq.sinajs.cn/list='
const SINA_KLINE = 'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData'
const SINA_STOCK = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData'
const SINA_STOCK_COUNT = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeStockCount'
const SINA_CONCEPT = 'https://money.finance.sina.com.cn/q/view/newFLJK.php?param=class'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://finance.sina.com.cn/'
}

// 指数代码映射（市场速递页 6 个）
const INDEX_CODES = [
  'sh000001',  // 上证指数
  'sz399001',  // 深证成指
  'sz399006',  // 创业板指
  'sh000300',  // 沪深300
  'sh000905',  // 中证500
  'sh000688'   // 科创50
]

const INDEX_NAMES = {
  'sh000001': '上证指数',
  'sz399001': '深证成指',
  'sz399006': '创业板指',
  'sh000300': '沪深300',
  'sh000905': '中证500',
  'sh000688': '科创50'
}

// 指数行情页全部指数（国内 8 + 海外 5）
const ALL_INDEX_CODES = [
  'sh000001',  // 上证指数
  'sz399001',  // 深证成指
  'sz399006',  // 创业板指
  'sh000300',  // 沪深300
  'sh000905',  // 中证500
  'sh000688',  // 科创50
  'sh000852',  // 中证1000
  'bj899050',  // 北证50
  'hkHSI',     // 恒生指数
  'hkHSTECH',  // 恒生科技
  'usDJI',     // 道琼斯
  'usIXIC',    // 纳斯达克
  'usINX'      // 标普500
]

const ALL_INDEX_NAMES = {
  'sh000001': '上证指数',
  'sz399001': '深证成指',
  'sz399006': '创业板指',
  'sh000300': '沪深300',
  'sh000905': '中证500',
  'sh000688': '科创50',
  'sh000852': '中证1000',
  'bj899050': '北证50',
  'hkHSI': '恒生指数',
  'hkHSTECH': '恒生科技',
  'usDJI': '道琼斯',
  'usIXIC': '纳斯达克',
  'usINX': '标普500'
}

const ALL_INDEX_GROUPS = {
  domestic: ['sh000001', 'sz399001', 'sz399006', 'sh000300', 'sh000905', 'sh000688', 'sh000852', 'bj899050'],
  overseas: ['hkHSI', 'hkHSTECH', 'usDJI', 'usIXIC', 'usINX']
}

// ==================== 工具函数 ====================

/** 数值安全转换 */
function num(v) {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

/**
 * HTTPS GET 请求（返回文本）
 * 直连失败时自动降级为 PowerShell 请求（兼容 Clash 等系统代理）
 */
function httpGet(url, customHeaders = {}) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { ...HEADERS, ...customHeaders },
      timeout: 10000
    }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location, customHeaders).then(resolve)
        return
      }
      // 用 Buffer 收集数据，避免编码问题
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        resolve({
          ok: res.statusCode === 200,
          status: res.statusCode,
          buffer: buf,
          text: () => buf.toString('utf-8')
        })
      })
    })
    req.on('error', (e) => {
      // 直连失败，尝试 Shell 降级
      const shellResult = httpGetViaShell(url, customHeaders)
      if (shellResult) {
        resolve(shellResult)
      } else {
        console.error('[行情] 请求失败:', e.message)
        resolve(null)
      }
    })
    req.on('timeout', () => {
      req.destroy()
      // 超时也尝试 Shell 降级
      const shellResult = httpGetViaShell(url, customHeaders)
      if (shellResult) {
        resolve(shellResult)
      } else {
        console.error('[行情] 请求超时')
        resolve(null)
      }
    })
  })
}

/** HTTPS GET 返回 JSON */
async function httpGetJSON(url, customHeaders = {}) {
  const res = await httpGet(url, customHeaders)
  if (!res || !res.ok) return null
  try {
    return JSON.parse(res.text())
  } catch (e) {
    console.error('[行情] JSON 解析失败:', e.message)
    return null
  }
}

// ==================== 指数实时行情（腾讯） ====================

/**
 * 获取所有指数实时行情
 * 腾讯接口：qt.gtimg.cn/q=sh000001,sz399001,...
 * 返回格式（GBK编码，但数字部分是ASCII）：
 * v_sh000001="1~上证指数~000001~3940.04~3900.35~3896.49~564988582~...~39.69~1.02~3940.93~3885.62~..."
 */
export async function fetchIndices() {
  const codes = INDEX_CODES.join(',')
  const url = `${TX_BASE}${codes}`
  const res = await httpGet(url, { 'Referer': 'https://gu.qq.com/' })
  if (!res || !res.ok) return null

  // 用 latin1 读取（数字和 ASCII 不受影响）
  const text = res.buffer.toString('latin1')
  const result = []

  for (const code of INDEX_CODES) {
    // 匹配 v_sh000001="..." 格式
    const regex = new RegExp(`v_${code}="([^"]*)"`)
    const match = text.match(regex)
    if (!match) continue

    const parts = match[1].split('~')
    if (parts.length < 35) continue

    // 腾讯字段索引：
    // 1: 名称(GBK), 2: 代码, 3: 当前价, 4: 昨收, 5: 今开
    // 6: 成交量(手), 30: 日期时间, 31: 涨跌, 32: 涨跌幅
    // 33: 最高, 34: 最低, 37: 成交额(万)
    const price = num(parts[3])
    const prevClose = num(parts[4])
    const changePct = num(parts[32])
    const volume = num(parts[6]) // 成交量（手）
    const amount = num(parts[37]) // 成交额（万元）

    result.push({
      code,
      name: INDEX_NAMES[code] || code,
      price,
      changePct,
      prevClose: prevClose || (price > 0 && changePct !== 0 ? price / (1 + changePct / 100) : price),
      volume: amount * 10000 // 转为元
    })
  }

  return result.length > 0 ? result : null
}

// ==================== K线数据（新浪） ====================

/**
 * 获取指数日K线数据
 * 新浪接口：money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData
 * 参数：symbol=sh000001, scale=240(日K), datalen=30
 */
export async function fetchKline(code, days = 30) {
  if (!INDEX_NAMES[code]) return null

  const url = `${SINA_KLINE}?symbol=${code}&scale=240&datalen=${days}`
  const json = await httpGetJSON(url)
  if (!json || !Array.isArray(json)) return null

  // 新浪返回格式：[{day, open, high, low, close, volume, ma_price5, ...}]
  return json.map(item => ({
    date: item.day,
    open: num(item.open),
    close: num(item.close),
    high: num(item.high),
    low: num(item.low),
    volume: num(item.volume)
  }))
}

/**
 * 批量获取所有指数的 K 线数据
 * 并行请求（新浪支持并发）
 */
export async function fetchAllKlines(indices) {
  const klineMap = {}
  const promises = (indices || []).map(async (idx) => {
    const kline = await fetchKline(idx.code, 30)
    if (kline && kline.length >= 2) {
      klineMap[idx.code] = kline.map(p => ({ date: p.date, close: p.close }))
    }
  })

  await Promise.all(promises)
  return klineMap
}

/**
 * 按时间范围获取指数日K线数据
 * @param {string} code - 指数代码如 sh000001
 * @param {string} range - 时间范围：1w/1m/3m/6m/1y
 * @returns {Promise<Array>} K线数据 [{date, open, close, high, low, volume}]
 */
// 美股指数 东方财富 secid 映射
const EM_SECID_MAP = {
  'usDJI': '100.DJIA',
  'usIXIC': '100.NDX',
  'usINX': '100.SPX'
}

// 美股指数 Yahoo Finance 符号映射（东财 push2his 对海外服务器 IP 有地域限制，雅虎在海外可直连）
const YAHOO_SYMBOL_MAP = {
  'usDJI': '%5EDJI',   // ^DJI 道琼斯
  'usIXIC': '%5EIXIC', // ^IXIC 纳斯达克
  'usINX': '%5EGSPC'   // ^GSPC 标普500
}

// 腾讯K线支持的指数（港股 + 中证1000；北证50 腾讯只有1行历史，走新浪）
const TX_KLINE_CODES = ['hkHSI', 'hkHSTECH', 'sh000852']

export async function fetchKlineByRange(code, range = '3m') {
  const rangeMap = {
    '1w': 7,
    '1m': 30,
    '3m': 90,
    '6m': 180,
    '1y': 250
  }
  const datalen = rangeMap[range] || 90

  // 美股指数：雅虎优先（海外服务器可直连），失败降级东财（国内环境可用）
  if (EM_SECID_MAP[code]) {
    let kline = null
    try { kline = await fetchKlineYahoo(code, datalen) } catch {}
    if (!kline || kline.length < 5) {
      try { kline = await fetchKlineEastMoney(code, datalen) } catch {}
    }
    return kline
  }
  // 港股指数/中证1000走腾讯K线接口
  if (TX_KLINE_CODES.includes(code)) {
    return fetchKlineTencent(code, datalen)
  }
  // 国内指数（含北证50）走新浪K线接口
  if (!ALL_INDEX_NAMES[code]) return null

  const url = `${SINA_KLINE}?symbol=${code}&scale=240&datalen=${datalen}`
  const json = await httpGetJSON(url)
  if (!json || !Array.isArray(json)) return null

  return json.map(item => ({
    date: item.day,
    open: num(item.open),
    close: num(item.close),
    high: num(item.high),
    low: num(item.low),
    volume: num(item.volume)
  }))
}

/**
 * Yahoo Finance K线接口（美股指数）
 * https://query1.finance.yahoo.com/v8/finance/chart/%5EDJI?range=3mo&interval=1d
 * 返回 chart.result[0].timestamp[] + indicators.quote[0].{open,high,low,close,volume}[]
 */
export async function fetchKlineYahoo(code, days = 90) {
  const symbol = YAHOO_SYMBOL_MAP[code]
  if (!symbol) return null
  // 交易日数 → 雅虎日历 range（1mo≈21交易日, 3mo≈64, 6mo≈126, 1y≈252, 2y≈504）
  const range = days <= 10 ? '1mo' : days <= 35 ? '3mo' : days <= 95 ? '6mo' : days <= 185 ? '1y' : '2y'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=1d`
  const json = await httpGetJSON(url, { 'Referer': 'https://finance.yahoo.com/' })

  const result = json && json.chart && json.chart.result && json.chart.result[0]
  if (!result || !Array.isArray(result.timestamp)) return null

  // 用交易所时区偏移还原当地交易日（timestamp 为 UTC 秒）
  const meta = result.meta || {}
  const offset = meta.gmtoffset || 0
  const q = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {}
  const rows = []
  for (let i = 0; i < result.timestamp.length; i++) {
    const close = q.close ? q.close[i] : null
    if (close == null) continue // 跳过停市/缺数据的行
    const d = new Date((result.timestamp[i] + offset) * 1000)
    rows.push({
      date: d.toISOString().slice(0, 10),
      open: num(q.open ? q.open[i] : close),
      close: num(close),
      high: num(q.high ? q.high[i] : close),
      low: num(q.low ? q.low[i] : close),
      volume: num(q.volume ? q.volume[i] : 0)
    })
  }
  return rows.slice(-days)
}

/**
 * 东方财富K线接口（美股指数）
 * https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=100.DJIA&...
 * 返回 data.klines: ["date,open,close,high,low,volume,amount", ...]
 * 注：push2his 对海外服务器 IP 有地域限制，作为国内环境的降级源
 */
export async function fetchKlineEastMoney(code, days = 90) {
  const secid = EM_SECID_MAP[code]
  if (!secid) return null
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=0&lmt=${days}&end=20500101`
  const json = await httpGetJSON(url, { 'Referer': 'https://quote.eastmoney.com/' })
  if (!json || !json.data || !Array.isArray(json.data.klines)) return null

  return json.data.klines.map(line => {
    const p = line.split(',')
    return {
      date: p[0],
      open: num(p[1]),
      close: num(p[2]),
      high: num(p[3]),
      low: num(p[4]),
      volume: num(p[5])
    }
  })
}

/**
 * 腾讯K线接口（支持港股/美股指数，国内指数同样适用）
 * https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=hkHSI,day,,,90,qfq
 * 返回 data[code].qfqday 或 data[code].day：[[date, open, close, high, low, volume], ...]
 */
export async function fetchKlineTencent(code, days = 90) {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},day,,,${days},qfq`
  const json = await httpGetJSON(url, { 'Referer': 'https://gu.qq.com/' })
  if (!json || !json.data || !json.data[code]) return null

  const node = json.data[code]
  const rows = node.qfqday || node.day
  if (!Array.isArray(rows) || rows.length === 0) return null

  return rows.map(r => ({
    date: r[0],
    open: num(r[1]),
    close: num(r[2]),
    high: num(r[3]),
    low: num(r[4]),
    volume: num(r[5])
  }))
}

/**
 * 获取单个指数实时行情（国内/海外均支持，腾讯接口）
 */
export async function fetchIndexQuote(code) {
  if (!ALL_INDEX_NAMES[code]) return null
  const res = await httpGet(`${TX_BASE}${code}`, { 'Referer': 'https://gu.qq.com/' })
  if (!res || !res.ok) return null
  const text = res.buffer.toString('latin1')
  const match = text.match(new RegExp(`v_${code}="([^"]*)"`))
  if (!match) return null
  const parts = match[1].split('~')
  if (parts.length < 35) return null

  const price = num(parts[3])
  const prevClose = num(parts[4])
  const changePct = num(parts[32])
  return {
    code,
    name: ALL_INDEX_NAMES[code] || code,
    price,
    changePct,
    prevClose: prevClose || (price > 0 && changePct !== 0 ? price / (1 + changePct / 100) : price)
  }
}

// ==================== 涨跌家数 & 成交额 ====================

/**
 * 获取全市场涨跌家数和总成交额
 * 主源：东方财富 push2delay.eastmoney.com（Node.js 直连，快速稳定）
 *   - fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048 覆盖沪深A股+B股+北交所
 *   - 每页上限 100 条，约 59 页，分批并行（每批 20 个请求）
 * 备源：新浪财经（分页获取全量 A 股）
 */
const EM_STOCK_API = 'https://push2delay.eastmoney.com/api/qt/clist/get'
const EM_STOCK_FS = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048'

export async function fetchBreadth() {
  // 优先尝试东方财富
  const emResult = await fetchBreadthEastMoney()
  if (emResult) return emResult

  // 降级到新浪
  console.log('[涨跌] 东方财富不可用，降级到新浪')
  return await fetchBreadthSina()
}

async function fetchBreadthEastMoney() {
  const headers = { 'User-Agent': HEADERS['User-Agent'], 'Referer': 'https://data.eastmoney.com/' }
  const pageSize = 100

  // 第 1 页：获取总数
  const firstUrl = `${EM_STOCK_API}?pn=1&pz=${pageSize}&po=1&np=1&fltt=2&invt=2&fid=f12&fs=${EM_STOCK_FS}&fields=f3,f6,f12`
  const firstRes = await httpGetJSON(firstUrl, headers)
  if (!firstRes || !firstRes.data || !firstRes.data.diff) {
    console.log('[涨跌] 东方财富首页请求失败')
    return null
  }

  const totalStocks = firstRes.data.total
  const totalPages = Math.ceil(totalStocks / pageSize)
  console.log(`[涨跌] 东方财富: ${totalStocks} 只股票, ${totalPages} 页`)

  // 收集所有股票数据
  let allStocks = [...firstRes.data.diff]

  // 并行获取剩余页（每批 20 个请求）
  const batchSize = 20
  for (let batch = 1; batch < totalPages; batch += batchSize) {
    const batchEnd = Math.min(batch + batchSize, totalPages)
    const promises = []

    for (let page = batch + 1; page <= batchEnd; page++) {
      const url = `${EM_STOCK_API}?pn=${page}&pz=${pageSize}&po=1&np=1&fltt=2&invt=2&fid=f12&fs=${EM_STOCK_FS}&fields=f3,f6,f12`
      promises.push(
        httpGetJSON(url, headers).then(data => data?.data?.diff || [])
      )
    }

    const results = await Promise.all(promises)
    for (const stocks of results) {
      allStocks = allStocks.concat(stocks)
    }
  }

  if (allStocks.length === 0) return null

  // 统计涨跌
  let upCount = 0, downCount = 0, flatCount = 0
  let limitUp = 0, limitDown = 0
  let totalAmount = 0

  for (const stock of allStocks) {
    const pct = num(stock.f3)
    const code = String(stock.f12 || '')
    const amount = num(stock.f6)
    totalAmount += amount

    if (pct > 0) {
      upCount++
      // 涨停判断（主板 10%，创业板/科创板 20%，北交所 30%）
      const limit = code.startsWith('30') || code.startsWith('68') ? 19.9
        : code.startsWith('8') || code.startsWith('4') ? 29.9 : 9.9
      if (pct >= limit) limitUp++
    } else if (pct < 0) {
      downCount++
      const limit = code.startsWith('30') || code.startsWith('68') ? -19.9
        : code.startsWith('8') || code.startsWith('4') ? -29.9 : -9.9
      if (pct <= limit) limitDown++
    } else {
      flatCount++
    }
  }

  const amountYi = Math.round(totalAmount / 100000000)
  console.log(`[涨跌] 东方财富统计完成: 涨${upCount} 跌${downCount} 平${flatCount} 涨停${limitUp} 跌停${limitDown} 成交${amountYi}亿 (共${allStocks.length}只)`)

  return {
    upCount,
    downCount,
    amountYi,
    limitUp,
    limitDown,
    volumeChange: null
  }
}

/**
 * 新浪涨跌家数（降级方案）
 * 分页获取全部 A 股数据，每页 100 条，约 56 页
 */
async function fetchBreadthSina() {
  // 先获取总股票数
  const countUrl = `${SINA_STOCK_COUNT}?node=hs_a`
  const countRes = await httpGetJSON(countUrl)
  const totalStocks = num(countRes)
  if (totalStocks === 0) return null

  const pageSize = 100
  const totalPages = Math.ceil(totalStocks / pageSize)

  // 并行获取所有页（分批，每批 15 个请求）
  const batchSize = 15
  let allStocks = []

  for (let batch = 0; batch < totalPages; batch += batchSize) {
    const batchEnd = Math.min(batch + batchSize, totalPages)
    const promises = []

    for (let page = batch + 1; page <= batchEnd; page++) {
      const url = `${SINA_STOCK}?page=${page}&num=${pageSize}&node=hs_a&sort=symbol&asc=1`
      promises.push(
        httpGetJSON(url).then(data => data || [])
      )
    }

    const results = await Promise.all(promises)
    for (const stocks of results) {
      allStocks = allStocks.concat(stocks)
    }
  }

  if (allStocks.length === 0) return null

  // 统计涨跌
  let upCount = 0, downCount = 0, flatCount = 0
  let limitUp = 0, limitDown = 0
  let totalAmount = 0

  for (const stock of allStocks) {
    const pct = num(stock.changepercent)
    if (pct > 0) {
      upCount++
      const code = String(stock.code || '')
      const limit = (code.startsWith('30') || code.startsWith('68')) ? 19.9 : 9.9
      if (pct >= limit) limitUp++
    } else if (pct < 0) {
      downCount++
      const code = String(stock.code || '')
      const limit = (code.startsWith('30') || code.startsWith('68')) ? -19.9 : -9.9
      if (pct <= limit) limitDown++
    } else {
      flatCount++
    }
    totalAmount += num(stock.amount)
  }

  const amountYi = Math.round(totalAmount / 100000000)

  return {
    upCount,
    downCount,
    amountYi,
    limitUp,
    limitDown,
    volumeChange: null
  }
}

// ==================== 板块涨跌排行 ====================

/**
 * 获取概念板块涨跌排行
 * 主源：东方财富 push2delay.eastmoney.com（与同花顺概念板块重合度高）
 *       注：push2.eastmoney.com 有 TLS 反爬机制会被断连，push2delay 无此限制
 * 备源：新浪财经 newFLJK.php（GBK 编码，板块分类体系略有不同）
 */
const EM_BOARD_API = 'https://push2delay.eastmoney.com/api/qt/clist/get'

export async function fetchBoards() {
  // 优先尝试东方财富（与同花顺一致的概念板块分类）
  const emResult = await fetchBoardsEastMoney()
  if (emResult) return emResult

  // 降级到新浪
  console.log('[行情] 东方财富板块不可用，降级到新浪')
  return await fetchBoardsSina()
}

async function fetchBoardsEastMoney() {
  const headers = { 'User-Agent': HEADERS['User-Agent'], 'Referer': 'https://data.eastmoney.com/' }

  const [upRes, downRes] = await Promise.all([
    httpGetJSON(`${EM_BOARD_API}?pn=1&pz=10&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3&fields=f2,f3,f4,f12,f14`, headers),
    httpGetJSON(`${EM_BOARD_API}?pn=1&pz=10&po=0&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3&fields=f2,f3,f4,f12,f14`, headers)
  ])

  if (!upRes || !upRes.data || !upRes.data.diff) {
    console.log('[板块] 东方财富概念接口返回数据异常')
    return null
  }

  const mapBoard = item => ({
    name: item.f14 || item.f12 || '',
    changePct: typeof item.f3 === 'number' ? item.f3 : parseFloat(item.f3) || 0,
    code: item.f12 || ''
  })

  const result = {
    boardsUp: upRes.data.diff.slice(0, 6).map(mapBoard),
    boardsDown: (downRes && downRes.data && downRes.data.diff)
      ? downRes.data.diff.slice(0, 6).map(mapBoard) : []
  }
  console.log(`[板块] 东方财富概念板块获取成功: 领涨${result.boardsUp.length} 领跌${result.boardsDown.length}`)
  return result
}

async function fetchBoardsSina() {
  const res = await httpGet(SINA_CONCEPT)
  if (!res || !res.ok) {
    console.log('[板块] 新浪概念接口请求失败')
    return null
  }

  const text = iconv.decode(res.buffer, 'gbk')
  const match = text.match(/=\s*(\{.*\})/s)
  if (!match) {
    console.log('[板块] 新浪概念数据正则匹配失败, text长度:', text.length)
    return null
  }

  let data
  try { data = JSON.parse(match[1]) } catch (e) {
    console.log('[板块] 新浪概念JSON解析失败:', e.message)
    return null
  }

  const boards = Object.values(data).map(entry => {
    const parts = entry.split(',')
    return { name: parts[1] || parts[0], changePct: num(parts[5]) }
  })

  boards.sort((a, b) => b.changePct - a.changePct)
  console.log(`[板块] 新浪概念板块获取成功: ${boards.length} 个板块`)
  return { boardsUp: boards.slice(0, 6), boardsDown: boards.slice(-6).reverse() }
}

// ==================== 综合获取 ====================

/**
 * 一次性获取市场行情（不含 AI）
 * 并行请求指数、板块、涨跌分布，再串行获取 K 线
 */
export async function fetchMarketData() {
  console.log('[行情] 开始获取实时数据（腾讯+新浪）...')

  const [indices, boards, breadth] = await Promise.all([
    fetchIndices(),
    fetchBoards(),
    fetchBreadth()
  ])

  console.log(`[行情] 指数: ${indices?.length || 0}, 板块: ${(boards?.boardsUp?.length || 0) + (boards?.boardsDown?.length || 0)}, 涨跌: ${breadth ? 'OK' : 'null'}`)

  let kline = {}
  if (indices && indices.length > 0) {
    kline = await fetchAllKlines(indices)
    console.log(`[行情] K线: ${Object.keys(kline).length}/${indices.length}`)
  }

  return {
    indices: indices || [],
    boardsUp: boards?.boardsUp || [],
    boardsDown: boards?.boardsDown || [],
    breadth: breadth || null,
    kline
  }
}

// ==================== 指数行情页（国内+海外） ====================

/**
 * 获取全部指数行情（国内 8 + 海外 5）
 * 腾讯接口统一查询，一次请求获取所有指数
 */
export async function fetchAllIndices() {
  // 分两组请求，避免代理截断大数据包
  const domesticCodes = ALL_INDEX_GROUPS.domestic
  const overseasCodes = ALL_INDEX_GROUPS.overseas

  const [domRes, ovsRes] = await Promise.all([
    httpGet(`${TX_BASE}${domesticCodes.join(',')}`, { 'Referer': 'https://gu.qq.com/' }),
    httpGet(`${TX_BASE}${overseasCodes.join(',')}`, { 'Referer': 'https://gu.qq.com/' })
  ])

  const domestic = []
  const overseas = []

  // 解析国内指数
  if (domRes && domRes.ok) {
    const text = domRes.buffer.toString('latin1')
    for (const code of domesticCodes) {
      const regex = new RegExp(`v_${code}="([^"]*)"`)
      const match = text.match(regex)
      if (!match) continue
      const parts = match[1].split('~')
      if (parts.length < 35) continue
      const price = num(parts[3])
      const prevClose = num(parts[4])
      const changePct = num(parts[32])
      domestic.push({
        code,
        name: ALL_INDEX_NAMES[code] || code,
        price,
        changePct,
        prevClose: prevClose || (price > 0 && changePct !== 0 ? price / (1 + changePct / 100) : price)
      })
    }
  }

  // 解析海外指数
  if (ovsRes && ovsRes.ok) {
    const text = ovsRes.buffer.toString('latin1')
    for (const code of overseasCodes) {
      const regex = new RegExp(`v_${code}="([^"]*)"`)
      const match = text.match(regex)
      if (!match) continue
      const parts = match[1].split('~')
      if (parts.length < 35) continue
      const price = num(parts[3])
      const prevClose = num(parts[4])
      const changePct = num(parts[32])
      overseas.push({
        code,
        name: ALL_INDEX_NAMES[code] || code,
        price,
        changePct,
        prevClose: prevClose || (price > 0 && changePct !== 0 ? price / (1 + changePct / 100) : price)
      })
    }
  }

  console.log(`[指数行情] 国内: ${domestic.length}/${domesticCodes.length}, 海外: ${overseas.length}/${overseasCodes.length}`)

  // 获取迷你 K 线（国内指数最近 7 天收盘价）
  const kline = {}
  const batchSize = 6
  for (let i = 0; i < domesticCodes.length; i += batchSize) {
    const batch = domesticCodes.slice(i, i + batchSize)
    const promises = batch.map(async (code) => {
      const k = await fetchKline(code, 7)
      if (k && k.length >= 2) {
        kline[code] = k.map(p => ({ date: p.date, close: p.close }))
      }
    })
    await Promise.all(promises)
  }

  return { domestic, overseas, kline }
}

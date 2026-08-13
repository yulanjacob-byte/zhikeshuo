<template>
  <div class="wrap">
    <!-- A. Header -->
    <section class="mkt-section">
      <div class="sec-head">
        <div class="sec-title"><span class="sec-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="13" width="4" height="8" rx="1" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="10" y="9" width="4" height="12" rx="1" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="17" y="5" width="4" height="16" rx="1" stroke="currentColor" stroke-width="1.8" fill="none"/></svg></span> 市场速递</div>
        <div
          class="refresh-btn"
          :class="{ disabled: marketLoading }"
          @click="loadMarket"
        >
          {{ marketLoading ? `⏳ 刷新中 ${refreshElapsed}s` : '🔄 刷新实时行情' }}
        </div>
      </div>
      <div class="sec-desc">{{ summary || '获取实时行情数据…' }}</div>
    </section>

    <!-- 首次加载骨架 -->
    <template v-if="!firstLoaded">
      <div class="sk-card card">
        <div class="sk-bar" style="width: 40%; height: 22px"></div>
        <div class="sk-bar" style="width: 70%"></div>
        <div class="sk-bar" style="width: 55%"></div>
        <div class="sk-bar" style="width: 80%"></div>
      </div>
    </template>

    <template v-else>
      <!-- C. Hero index card -->
      <section v-if="heroIndex" class="mkt-section">
        <div class="idx-hero card" @click="goIndexDetail(heroIndex.code)">
          <div class="hero-top">
            <div class="hero-left">
              <div class="hero-name-row">
                <span class="hero-name">{{ heroIndex.name }}</span>
                <span class="phase-tag">{{ phase }}</span>
              </div>
              <div class="hero-price" :class="dirCls(heroIndex.changePct)">
                {{ fmtPrice(heroIndex.price) }}
              </div>
              <div class="hero-pct" :class="dirCls(heroIndex.changePct)">
                <span class="hero-arrow">{{ dirArrow(heroIndex.changePct) }}</span>
                <span>{{ fmtPct(heroIndex.changePct) }}</span>
              </div>
            </div>
            <div class="hero-right">
              <span class="phase-tag">{{ phase }}</span>
              <div class="hero-change" :class="dirCls(heroIndex.changePct)">
                {{ changeText(heroIndex) }}
              </div>
              <div class="hero-prev">昨收 {{ fmtPrice(heroIndex.prevClose) }}</div>
            </div>
          </div>

          <div class="minibar">
            <div class="mb-track">
              <div
                class="mb-fill"
                :class="dirCls(heroIndex.changePct)"
                :style="fillStyle(heroIndex)"
              ></div>
              <div class="mb-center"></div>
              <div
                class="mb-dot"
                :class="dirCls(heroIndex.changePct)"
                :style="{ left: minibarPos(heroIndex) + '%' }"
              ></div>
            </div>
          </div>

          <div class="hero-spark">
            <KlineSpark
              :points="klineOf(heroIndex)"
              :color="dirColor(heroIndex.changePct)"
              :height="72"
            />
          </div>
        </div>
      </section>

      <!-- D. Sub-index carousel -->
      <section class="mkt-section">
        <div class="idx-strip">
          <div
            v-for="idx in stripIndices"
            :key="idx.code"
            class="strip-card card"
            @click="goIndexDetail(idx.code)"
          >
            <div class="strip-name-row">
              <span class="strip-name">{{ idx.name }}</span>
              <span class="phase-tag sm">{{ phase }}</span>
            </div>
            <div class="strip-price" :class="dirCls(idx.changePct)">
              {{ fmtPrice(idx.price) }}
            </div>
            <div class="strip-pct" :class="dirCls(idx.changePct)">
              {{ fmtPct(idx.changePct) }}
            </div>
            <div class="minibar sm">
              <div class="mb-track">
                <div
                  class="mb-fill"
                  :class="dirCls(idx.changePct)"
                  :style="fillStyle(idx)"
                ></div>
                <div class="mb-center"></div>
                <div
                  class="mb-dot"
                  :class="dirCls(idx.changePct)"
                  :style="{ left: minibarPos(idx) + '%' }"
                ></div>
              </div>
            </div>
            <div class="strip-spark">
              <KlineSpark
                :points="klineOf(idx)"
                :color="dirColor(idx.changePct)"
                :height="40"
              />
            </div>
          </div>

          <div class="strip-more card" @click="onMore">
            <span class="more-text">更多</span>
            <span class="more-arrow">›</span>
          </div>
        </div>
      </section>

      <!-- E. 涨跌分布 -->
      <section class="mkt-section">
        <div class="bh-block card">
          <div class="bh-label">涨跌分布</div>
          <div class="bh-bar">
            <div class="bh-up" :style="{ width: upPct + '%' }"></div>
            <div class="bh-down" :style="{ width: downPct + '%' }"></div>
          </div>
          <div class="bh-legend">
            <span class="bh-up-text">涨 {{ fmtCount(breadth.upCount) }} · {{ upPct.toFixed(0) }}%</span>
            <span class="bh-down-text">跌 {{ fmtCount(breadth.downCount) }} · {{ downPct.toFixed(0) }}%</span>
          </div>

          <div class="bh-amount-row">
            <span class="bh-amount-label">两市成交额</span>
            <span class="bh-amount">{{ fmtAmount(breadth.amountYi) }}</span>
          </div>

          <div
            v-if="breadth.limitUp != null || breadth.limitDown != null"
            class="bh-limit-row"
          >
            <span class="bh-limit up">
              涨停 {{ breadth.limitUp != null ? breadth.limitUp : '--' }} 家
            </span>
            <span class="bh-limit down">
              跌停 {{ breadth.limitDown != null ? breadth.limitDown : '--' }} 家
            </span>
          </div>

          <div v-if="breadth.volumeChange" class="bh-vol">
            较昨日收盘 · {{ volLabel }}
          </div>
        </div>
      </section>

      <!-- F. 板块榜 -->
      <section class="mkt-section">
        <div class="brd-block card">
          <div class="brd-row">
            <div class="brd-label">板块榜 · 领涨</div>
            <div class="brd-pills">
              <span
                v-for="(b, i) in boardsUp"
                :key="'up' + i"
                class="pill up"
              >
                <span class="pill-name">{{ b.name }}</span><em>{{ fmtPct(b.changePct) }}</em>
              </span>
              <span v-if="!boardsUp.length" class="brd-empty">暂无数据</span>
            </div>
          </div>

          <div class="brd-divider"></div>

          <div class="brd-row">
            <div class="brd-label">板块榜 · 调整</div>
            <div class="brd-pills">
              <span
                v-for="(b, i) in boardsDown"
                :key="'dn' + i"
                class="pill down"
              >
                <span class="pill-name">{{ b.name }}</span><em>{{ fmtPct(b.changePct) }}</em>
              </span>
              <span v-if="!boardsDown.length" class="brd-empty">暂无数据</span>
            </div>
          </div>
        </div>
      </section>

      <!-- G. 数据来源 -->
      <div class="data-source">数据来源：腾讯财经 / 新浪财经（实时行情）</div>
    </template>

    <!-- H. 盘面解读 -->
    <section class="mkt-section">
      <div class="sec-head">
        <div class="sec-title"><span class="sec-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17 L8 12 L12 15 L17 8 L21 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="17" cy="8" r="1.5" fill="currentColor"/><rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/></svg></span> 盘面解读</div>
        <div
          class="refresh-btn"
          :class="{ disabled: aiBrief.loading }"
          @click="generateAiBrief"
        >
          {{ aiBrief.loading ? `⏳ 生成中 ${aiBrief.elapsed}s` : '✨ 生成盘面解读' }}
        </div>
      </div>
      <div class="sec-desc">
        基于实时行情解读今日盘面结构、热点轮动（AI 生成，仅供参考）
      </div>

      <div v-if="aiBrief.loading" class="sk-loading card">
        正在生成盘面解读，约需 10-30 秒…
        <div class="sk-bar" style="margin-top: 12px"></div>
        <div class="sk-bar" style="width: 80%"></div>
      </div>

      <div v-else-if="aiBrief.error" class="ai-error card">{{ aiBrief.error }}</div>

      <div v-else-if="aiBrief.summary || aiBrief.topics.length" class="ai-card card">
        <div v-if="aiBrief.timeText" class="ai-time">{{ aiBrief.timeText }}</div>
        <div v-if="aiBrief.summary" class="ai-summary">{{ aiBrief.summary }}</div>
        <ul v-if="aiBrief.topics.length" class="ai-topics">
          <li v-for="(t, i) in aiBrief.topics" :key="i">{{ t }}</li>
        </ul>
        <div v-if="aiBrief.caution" class="ai-caution">⚠️ {{ aiBrief.caution }}</div>
        <div class="ai-actions">
          <div class="copy-btn" @click="copyAiBrief">📋 复制</div>
        </div>
      </div>
    </section>

    <!-- I. 宏观研判 -->
    <section class="mkt-section">
      <div class="sec-head">
        <div class="sec-title"><span class="sec-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.8" fill="none"/><ellipse cx="12" cy="12" rx="4" ry="9.5" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="2.5" y1="12" x2="21.5" y2="12" stroke="currentColor" stroke-width="1.5"/></svg></span> 宏观研判</div>
        <div
          class="refresh-btn"
          :class="{ disabled: macro.loading }"
          @click="generateMacro"
        >
          {{ macro.loading ? `⏳ 生成中 ${macro.elapsed}s` : '✨ 生成宏观研判' }}
        </div>
      </div>
      <div class="sec-desc">
        按最新公开研报与实时行情梳理国内外市场（AI 生成，仅供参考）
      </div>

      <div v-if="macro.loading" class="sk-loading card">
        正在生成宏观研判，约需 30-60 秒…
        <div class="sk-bar" style="margin-top: 12px"></div>
        <div class="sk-bar" style="width: 80%"></div>
      </div>

      <div v-else-if="macro.error" class="ai-error card">{{ macro.error }}</div>

      <div v-else-if="macro.article" class="ai-card card">
        <div class="ai-article">{{ macro.article }}</div>
        <div class="ai-actions">
          <div class="copy-btn" @click="copyMacro">📋 复制</div>
        </div>
      </div>
    </section>

    <!-- J. Compliance + Footer -->
    <ComplianceCard :items="compliance" />
    <SiteFooter :f2="footer.f2" :disclaimer="footer.disclaimer" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/index.js'
import {
  indices as fbIndices,
  topSectors as fbTopSectors,
  bottomSectors as fbBottomSectors,
  turnover as fbTurnover,
  breadth as fbBreadth,
  compliance,
  footer
} from '../data/fallback.js'
import { dateStatusLabel, marketPhase } from '../data/market-date.js'
import { fmtPrice, fmtPct, dirArrow, copyText, showToast } from '../utils/format.js'
import ComplianceCard from '../components/ComplianceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import KlineSpark from '../components/KlineSpark.vue'

// ==================== 常量 ====================
const UP_COLOR = '#C0392B'
const DOWN_COLOR = '#1E8449'

const router = useRouter()

/** 跳转到指数详情页 */
function goIndexDetail(code) {
  router.push({ path: '/indexDetail', query: { code } })
}

// ==================== 工具函数 ====================

/** 千分位计数 */
function fmtCount(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '--'
  return Number(n).toLocaleString('zh-CN')
}

/** 成交额（亿）格式化为「万亿 / 亿」 */
function fmtAmount(amountYi) {
  const v = Number(amountYi)
  if (isNaN(v) || !v) return '--'
  if (v >= 10000) return (v / 10000).toFixed(2) + '万亿'
  return v.toLocaleString('zh-CN') + '亿'
}

/** 方向 class：涨红跌绿 */
function dirCls(pct) {
  if (pct == null || isNaN(pct)) return 'flat'
  if (pct > 0) return 'up'
  if (pct < 0) return 'down'
  return 'flat'
}

/** 方向颜色 hex */
function dirColor(pct) {
  if (pct == null || isNaN(pct)) return '#94a3b8'
  return pct >= 0 ? UP_COLOR : DOWN_COLOR
}

/** 格式化 AI 时间戳 → 「8月8日 10:30」 */
function fmtAiTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const bj = new Date(d.getTime() + 8 * 3600 * 1000)
  const hh = String(bj.getUTCHours()).padStart(2, '0')
  const mm = String(bj.getUTCMinutes()).padStart(2, '0')
  return `${bj.getUTCMonth() + 1}月${bj.getUTCDate()}日 ${hh}:${mm}`
}

// 交易阶段与日期标签统一由 market-date.js 提供
// marketPhase() → '交易中' | '午间休市' | '收盘' | '休市'
// dateStatusLabel() → '8月10日盘中' | '8月10日收盘' 等

// ==================== 数据归一化 ====================

/** 归一化单个指数：兼容兜底数据与接口字段，缺 prevClose 时反推 */
function normalizeIndex(e) {
  const price = Number(e.price)
  const pct = Number(e.changePct)
  const hasPrice = !isNaN(price)
  const hasPct = !isNaN(pct)
  let prevClose = e.prevClose != null ? Number(e.prevClose) : NaN
  if (isNaN(prevClose) && hasPrice && hasPct) {
    prevClose = price / (1 + pct / 100)
  }
  return {
    code: e.code || '',
    name: e.name || '--',
    price: hasPrice ? price : null,
    changePct: hasPct ? pct : null,
    prevClose: isNaN(prevClose) ? null : prevClose
  }
}

/** 归一化板块条目：兼容字符串、{ name }、{ name, changePct } */
function normalizeBoard(e) {
  if (typeof e === 'string') {
    const m = e.match(/^(.+?)\s*([+-]?[\d.]+)%/)
    if (m) return { name: m[1].trim(), changePct: Number(m[2]) }
    return { name: e, changePct: 0 }
  }
  let name = e.name || e.sector || e.title || '--'
  let pct = e.changePct
  if (pct == null) {
    const m = name.match(/([+-]?[\d.]+)%/)
    if (m) {
      pct = Number(m[1])
      name = name.replace(/\s*[+-]?[\d.]+%/, '').trim()
    }
  }
  return { name, changePct: pct != null && !isNaN(Number(pct)) ? Number(pct) : 0 }
}

/** 归一化涨跌分布：兼容新旧两种 breadth 结构 */
function normalizeBreadth(b) {
  if (!b) return { upCount: 0, downCount: 0, amountYi: 0, limitUp: null, limitDown: null, volumeChange: null }
  let upCount = b.upCount != null ? b.upCount : b.up
  let downCount = b.downCount != null ? b.downCount : b.down
  let amountYi = b.amountYi
  if (amountYi == null && typeof b.turnover === 'string') {
    const mW = b.turnover.match(/([\d.]+)\s*万亿/)
    const mY = b.turnover.match(/([\d.]+)\s*亿/)
    if (mW) amountYi = Number(mW[1]) * 10000
    else if (mY) amountYi = Number(mY[1])
  }
  return {
    upCount: Number(upCount) || 0,
    downCount: Number(downCount) || 0,
    amountYi: Number(amountYi) || 0,
    limitUp: b.limitUp != null ? Number(b.limitUp) : null,
    limitDown: b.limitDown != null ? Number(b.limitDown) : null,
    volumeChange: b.volumeChange || null
  }
}

/** 从兜底字符串解析 breadth */
function parseFallbackBreadth() {
  let amountYi = 0
  const mW = fbTurnover.match(/([\d.]+)\s*万亿/)
  const mY = fbTurnover.match(/([\d.]+)\s*亿/)
  if (mW) amountYi = Number(mW[1]) * 10000
  else if (mY) amountYi = Number(mY[1])

  let upCount = 0
  let downCount = 0
  const mUp = fbBreadth.match(/上涨\s*([\d,]+)\s*家/)
  const mDn = fbBreadth.match(/下跌\s*([\d,]+)\s*家/)
  if (mUp) upCount = Number(mUp[1].replace(/,/g, ''))
  if (mDn) downCount = Number(mDn[1].replace(/,/g, ''))

  return {
    upCount,
    downCount,
    amountYi,
    limitUp: null,
    limitDown: null,
    volumeChange: null
  }
}

/** 生成 mock kline（30 点），趋势与当日涨跌一致 */
function genMockKline(end, pct) {
  const n = 30
  if (!end || isNaN(end)) end = 3000
  const start = end / (1 + (pct || 0) / 100)
  const arr = new Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const base = start + (end - start) * t
    const noise = (Math.random() - 0.5) * end * 0.01
    arr[i] = base + noise
  }
  arr[0] = start
  arr[n - 1] = end
  return arr
}

/** 解析 kline：有接口数据用接口，否则 mock */
function resolveKlines(indices, rawKline) {
  const map = {}
  indices.forEach(idx => {
    const raw = rawKline && rawKline[idx.code]
    if (Array.isArray(raw) && raw.length >= 2) {
      map[idx.code] = raw
        .map(p => (typeof p === 'object' ? Number(p.close) : Number(p)))
        .filter(v => !isNaN(v))
    } else {
      map[idx.code] = genMockKline(idx.price, idx.changePct)
    }
  })
  return map
}

// ==================== 响应式状态 ====================

const marketData = reactive({
  indices: [],
  breadth: { upCount: 0, downCount: 0, amountYi: 0, limitUp: null, limitDown: null, volumeChange: null },
  boardsUp: [],
  boardsDown: [],
  kline: {}
})

const marketLoading = ref(false)
const refreshElapsed = ref(0)
const firstLoaded = ref(false)

const aiBrief = reactive({
  loading: false,
  elapsed: 0,
  summary: '',
  topics: [],
  caution: '',
  timeText: '',
  promptVersion: 'default',
  error: ''
})

const macro = reactive({
  loading: false,
  elapsed: 0,
  article: '',
  promptVersion: 'default',
  error: ''
})

// ==================== 计算属性 ====================

const heroIndex = computed(
  () => marketData.indices.find(i => i.code === 'sh000001') || marketData.indices[0] || null
)

const stripIndices = computed(() => {
  if (!heroIndex.value) return []
  return marketData.indices.filter(i => i.code !== heroIndex.value.code).slice(0, 4)
})

const breadth = computed(() => marketData.breadth)
const boardsUp = computed(() => marketData.boardsUp)
const boardsDown = computed(() => marketData.boardsDown)

const phase = computed(() => marketPhase())

const totalCount = computed(() => breadth.value.upCount + breadth.value.downCount)
const upPct = computed(() => (totalCount.value ? (breadth.value.upCount / totalCount.value) * 100 : 0))
const downPct = computed(() => (totalCount.value ? (breadth.value.downCount / totalCount.value) * 100 : 0))

const volLabel = computed(() => {
  const vc = breadth.value.volumeChange
  if (!vc) return ''
  if (vc.pending) return '数据待更新'
  const label = vc.label || '变动'
  const diff = vc.diffYi != null
    ? `${vc.diffYi >= 0 ? '+' : ''}${fmtCount(vc.diffYi)}亿`
    : ''
  const pct = vc.pct != null
    ? `(${vc.pct >= 0 ? '+' : ''}${Number(vc.pct).toFixed(2)}%)`
    : ''
  return `${label} ${diff} ${pct}`.replace(/\s+/g, ' ').trim()
})

const summary = computed(() => buildSummary())

function buildSummary() {
  const idx = marketData.indices
  if (!idx.length) return ''
  const sh = idx.find(i => i.code === 'sh000001') || idx[0]
  const cyb = idx.find(i => i.code === 'sz399006') || idx[2]
  // 日期+状态标签统一由 market-date.js 计算
  // 交易中 → "8月10日盘中"，收盘 → "8月10日收盘"，休市 → "8月7日收盘"
  const parts = [dateStatusLabel()]
  if (sh && sh.price != null && sh.changePct != null) {
    const verb = sh.changePct >= 0 ? '涨' : '跌'
    parts.push(`沪指${verb}${fmtPct(sh.changePct)}报${fmtPrice(sh.price)}点`)
  }
  if (cyb && cyb.changePct != null) {
    const verb = cyb.changePct >= 0 ? '涨' : '跌'
    parts.push(`创业板指${verb}${Math.abs(cyb.changePct).toFixed(2)}%`)
  }
  const b = marketData.breadth
  if (b.upCount) parts.push(`超${fmtCount(b.upCount)}只个股上涨`)
  if (b.amountYi) parts.push(`两市成交${fmtAmount(b.amountYi)}`)
  if (marketData.boardsUp.length) parts.push(`${marketData.boardsUp[0].name}领涨`)
  return parts.join('，')
}

// ==================== 视图辅助 ====================

function klineOf(idx) {
  if (!idx || !idx.code) return []
  return marketData.kline[idx.code] || []
}

function changeText(idx) {
  if (idx.price == null || idx.prevClose == null) return fmtPct(idx.changePct)
  const diff = idx.price - idx.prevClose
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${fmtPrice(diff)} (${fmtPct(idx.changePct)})`
}

function minibarPos(idx) {
  if (!idx || idx.price == null || idx.prevClose == null || !idx.prevClose) return 50
  const pct = ((idx.price - idx.prevClose) / idx.prevClose) * 100
  return Math.max(3, Math.min(97, 50 + pct * 25))
}

function fillStyle(idx) {
  const pos = minibarPos(idx)
  if (idx.changePct >= 0) return { left: '50%', width: Math.max(0, pos - 50) + '%' }
  return { left: pos + '%', width: Math.max(0, 50 - pos) + '%' }
}

function onMore() {
  router.push({ path: '/indexAll' })
}

// ==================== 定时器 ====================

let refreshTimer = null
let aiTimer = null
let macroTimer = null

// ==================== 数据加载 ====================

function applyMarketData(res) {
  const indices = (Array.isArray(res.indices) ? res.indices : []).map(normalizeIndex)
  marketData.indices = indices
  marketData.breadth = normalizeBreadth(res.breadth)

  const up = Array.isArray(res.boardsUp)
    ? res.boardsUp
    : res.sectors && Array.isArray(res.sectors.top)
      ? res.sectors.top
      : []
  const down = Array.isArray(res.boardsDown)
    ? res.boardsDown
    : res.sectors && Array.isArray(res.sectors.bottom)
      ? res.sectors.bottom
      : []
  marketData.boardsUp = up.map(normalizeBoard)
  marketData.boardsDown = down.map(normalizeBoard)

  const rawKline = res.kline && typeof res.kline === 'object' ? res.kline : {}
  marketData.kline = resolveKlines(indices, rawKline)
}

function applyFallback() {
  const indices = fbIndices.map(normalizeIndex)
  marketData.indices = indices
  marketData.breadth = parseFallbackBreadth()
  marketData.boardsUp = fbTopSectors.map(normalizeBoard)
  marketData.boardsDown = fbBottomSectors.map(normalizeBoard)
  marketData.kline = resolveKlines(indices, {})
}

function loadMarket() {
  if (marketLoading.value) return
  marketLoading.value = true
  refreshElapsed.value = 0
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => { refreshElapsed.value++ }, 1000)

  api
    .marketBriefNoAi()
    .then(res => {
      if (!res || res.ok !== true) throw new Error('行情获取失败')
      applyMarketData(res)
      showToast('行情已更新', 'success')
    })
    .catch(() => {
      if (!firstLoaded.value) applyFallback()
      showToast('行情获取失败，显示为示例数据', 'none')
    })
    .finally(() => {
      marketLoading.value = false
      firstLoaded.value = true
      if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
    })
}

// ==================== AI 生成 ====================

function generateAiBrief() {
  if (aiBrief.loading) return
  aiBrief.loading = true
  aiBrief.elapsed = 0
  aiBrief.error = ''
  if (aiTimer) clearInterval(aiTimer)
  aiTimer = setInterval(() => { aiBrief.elapsed++ }, 1000)

  api
    .marketBrief()
    .then(res => {
      if (!res || res.ok !== true || !res.ai) throw new Error('生成失败')
      aiBrief.summary = res.ai.summary || ''
      aiBrief.topics = Array.isArray(res.ai.topics) ? res.ai.topics : []
      aiBrief.caution = res.ai.caution || ''
      aiBrief.timeText = res.time ? fmtAiTime(res.time) : ''
      aiBrief.promptVersion = res.promptVersion || 'default'
      if (!aiBrief.summary && !aiBrief.topics.length) throw new Error('暂无内容')
    })
    .catch(() => {
      aiBrief.error = '⚠️ 生成失败，请检查网络后重试'
    })
    .finally(() => {
      aiBrief.loading = false
      if (aiTimer) { clearInterval(aiTimer); aiTimer = null }
    })
}

function generateMacro() {
  if (macro.loading) return
  macro.loading = true
  macro.elapsed = 0
  macro.error = ''
  if (macroTimer) clearInterval(macroTimer)
  macroTimer = setInterval(() => { macro.elapsed++ }, 1000)

  api
    .macroBrief()
    .then(res => {
      if (!res || res.ok !== true || !res.article) throw new Error('生成失败')
      macro.article = res.article
      macro.promptVersion = res.promptVersion || 'default'
    })
    .catch(() => {
      macro.error = '⚠️ 生成失败，请检查网络后重试'
    })
    .finally(() => {
      macro.loading = false
      if (macroTimer) { clearInterval(macroTimer); macroTimer = null }
    })
}

// ==================== 复制 ====================

async function copyAiBrief() {
  const parts = []
  if (aiBrief.summary) parts.push(aiBrief.summary)
  if (aiBrief.topics.length) {
    parts.push(aiBrief.topics.map((t, i) => `${i + 1}. ${t}`).join('\n'))
  }
  if (aiBrief.caution) parts.push('⚠️ ' + aiBrief.caution)
  const ok = await copyText(parts.join('\n\n'))
  showToast(ok ? '已复制 ✅' : '复制失败', ok ? 'success' : 'error')
}

async function copyMacro() {
  if (!macro.article) return
  const ok = await copyText(macro.article)
  showToast(ok ? '已复制 ✅' : '复制失败', ok ? 'success' : 'error')
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadMarket()
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (aiTimer) clearInterval(aiTimer)
  if (macroTimer) clearInterval(macroTimer)
})
</script>

<style scoped>
.mkt-section {
  margin-bottom: 18px;
}

/* 涨跌色（红涨绿跌） */
.up { color: #C0392B; }
.down { color: #1E8449; }
.flat { color: #94a3b8; }

/* ==================== Hero 指数卡 ==================== */
.idx-hero {
  padding: 16px;
  cursor: pointer;
  transition: transform 0.15s;
}

.idx-hero:active {
  transform: scale(0.98);
}

.hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hero-left {
  flex: 1;
  min-width: 0;
}

.hero-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.hero-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.phase-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(26, 54, 93, 0.1);
  color: var(--primary);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.phase-tag.sm {
  font-size: 9px;
  padding: 1px 6px;
}

.hero-price {
  font-size: 30px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.hero-pct {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.hero-arrow {
  font-size: 11px;
}

.hero-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.hero-change {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.hero-prev {
  font-size: 11px;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.hero-spark {
  margin-top: 10px;
}

/* ==================== Minibar ==================== */
.minibar {
  margin-top: 12px;
}
.minibar.sm {
  margin-top: 8px;
}

.mb-track {
  position: relative;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
}

.mb-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 2px;
}
.mb-fill.up { background: #C0392B; }
.mb-fill.down { background: #1E8449; }

.mb-center {
  position: absolute;
  top: -2px;
  left: 50%;
  width: 1px;
  height: 8px;
  background: var(--text-tertiary);
  transform: translateX(-50%);
  opacity: 0.5;
}

.mb-dot {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  border: 1.5px solid #fff;
}
.mb-dot.up {
  background: #C0392B;
  box-shadow: 0 0 0 1px #C0392B;
}
.mb-dot.down {
  background: #1E8449;
  box-shadow: 0 0 0 1px #1E8449;
}

/* ==================== Sub-index 轮播 ==================== */
.idx-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.idx-strip::-webkit-scrollbar {
  display: none;
}

.strip-card {
  flex: 0 0 140px;
  padding: 12px;
  cursor: pointer;
  transition: transform 0.15s;
}

.strip-card:active {
  transform: scale(0.97);
}

.strip-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 6px;
}

.strip-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strip-price {
  font-size: 17px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.strip-pct {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.strip-spark {
  margin-top: 6px;
}

.strip-more {
  flex: 0 0 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all 0.2s ease;
}
.strip-more:active {
  transform: scale(0.96);
}

.more-text {
  font-size: 13px;
  font-weight: 600;
}

.more-arrow {
  font-size: 22px;
  line-height: 1;
}

/* ==================== 涨跌分布 ==================== */
.bh-block {
  padding: 16px;
}

.bh-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.bh-bar {
  display: flex;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background: var(--border);
}

.bh-up { background: #C0392B; }
.bh-down { background: #1E8449; }

.bh-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.bh-up-text { color: #C0392B; }
.bh-down-text { color: #1E8449; }

.bh-amount-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.bh-amount-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.bh-amount {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.bh-limit-row {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.bh-limit.up { color: #C0392B; }
.bh-limit.down { color: #1E8449; }

.bh-vol {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

/* ==================== 板块榜 ==================== */
.brd-block {
  padding: 14px 16px;
  overflow: visible;
}

.brd-row {
  padding: 6px 0;
}

.brd-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.brd-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
  padding: 5px 10px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
}
.pill-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.pill.up {
  background: rgba(192, 57, 43, 0.1);
  color: #C0392B;
}
.pill.down {
  background: rgba(30, 132, 73, 0.1);
  color: #1E8449;
}
.pill em {
  font-style: normal;
  font-weight: 700;
}

.brd-divider {
  height: 1px;
  background: var(--border);
  margin: 6px 0;
}

.brd-empty {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* ==================== 数据来源 ==================== */
.data-source {
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: center;
  margin: 4px 0 8px;
}

/* ==================== AI 区块 ==================== */
.ai-card {
  padding: 16px;
}

.ai-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.ai-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.ai-topics {
  margin: 10px 0 0;
  padding-left: 18px;
}
.ai-topics li {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 4px;
}

.ai-caution {
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  font-size: 12px;
  color: var(--warning);
  line-height: 1.6;
}

.ai-article {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.8;
  white-space: pre-wrap;
}

.ai-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.ai-error {
  padding: 14px 16px;
  color: var(--danger);
  font-size: 13px;
  text-align: center;
}

.copy-btn {
  padding: 5px 12px;
  border-radius: 14px;
  background: rgba(26, 54, 93, 0.08);
  color: var(--primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.copy-btn:active {
  transform: scale(0.94);
}

/* ==================== 骨架 ==================== */
.sk-card {
  padding: 20px 16px;
}

/* ==================== 响应式 ==================== */
@media (max-width: 360px) {
  .strip-card { flex: 0 0 120px; padding: 10px; }
  .strip-price { font-size: 15px; }
  .strip-name { font-size: 12px; }
  .strip-more { flex: 0 0 56px; }
  .more-text { font-size: 11px; }
  .idx-price { font-size: 28px; }
  .bh-bar { height: 24px; }
  .bh-up-pct, .bh-down-pct { font-size: 11px; }
  .sec-card-name { font-size: 12px; }
  .sec-card-pct { font-size: 12px; }
  .gen-mini-btn { font-size: 11px; padding: 5px 10px; }
  .pill { font-size: 11px; padding: 4px 8px; }
  .brd-block { padding: 12px 12px; }
  .hero-price { font-size: 26px; }
  .hero-pct { font-size: 13px; }
}

@media (min-width: 414px) {
  .strip-card { flex: 0 0 150px; }
  .idx-price { font-size: 34px; }
}

@media (min-width: 768px) {
  .strip-card { flex: 0 0 160px; }
  .strip-card:hover { transform: translateY(-2px); }
  .sec-card:hover { transform: translateY(-2px); }
  .idx-main-card:hover { box-shadow: var(--card-shadow-hover); }
}
</style>

<template>
  <div class="id-page">
    <!-- 1. Navbar -->
    <header class="id-navbar">
      <span class="id-back" @click="goBack">‹</span>
      <span class="id-nav-title">指数详情</span>
      <span class="id-nav-placeholder"></span>
    </header>

    <div class="id-content">
      <!-- 首次加载骨架 -->
      <template v-if="!firstLoaded">
        <div class="sk-card card">
          <div class="sk-bar" style="width: 40%; height: 22px"></div>
          <div class="sk-bar" style="width: 55%; height: 32px"></div>
          <div class="sk-bar" style="width: 50%"></div>
        </div>
        <div class="sk-card card">
          <div class="sk-bar" style="height: 230px"></div>
        </div>
        <div class="sk-card card">
          <div class="sk-bar" style="width: 30%; height: 22px"></div>
          <div class="sk-bar"></div>
          <div class="sk-bar" style="width: 80%"></div>
          <div class="sk-bar" style="width: 70%"></div>
        </div>
      </template>

      <template v-else-if="detail">
        <!-- 2. 指数头部卡 -->
        <section class="id-head card">
          <div class="id-head-left">
            <div class="id-name-row">
              <span class="id-name">{{ detail.name }}</span>
              <span class="phase-tag">{{ phase }}</span>
            </div>
            <div class="id-price" :class="dirCls(detail.changePct)">
              {{ fmtPrice(detail.price) }}
            </div>
            <div class="id-change" :class="dirCls(detail.changePct)">
              {{ changeText(detail) }}
            </div>
            <div class="id-time">数据更新于 {{ dataTime || '--' }}</div>
          </div>
          <div class="id-head-right">
            <div class="id-intro-title">指数介绍</div>
            <div class="id-intro-text">{{ detail.intro || '暂无介绍' }}</div>
          </div>
        </section>

        <!-- 3. 时间周期 Tabs -->
        <nav class="id-tabs">
          <span
            v-for="t in tabs"
            :key="t.value"
            class="id-tab"
            :class="{ active: activeWindow === t.value }"
            @click="onTab(t.value)"
          >{{ t.label }}</span>
        </nav>

        <!-- 4. K 线图 -->
        <section class="id-chart-card card">
          <KlineChart
            :kline="detail.kline"
            :ma5-arr="detail.ma5Arr"
            :ma10-arr="detail.ma10Arr"
            :ma20-arr="detail.ma20Arr"
            :height="260"
          />
          <div v-if="loading" class="id-chart-loading">加载中…</div>
        </section>

        <!-- 5. 图例 -->
        <div class="id-chart-note">
          <span class="id-legend"><i class="dot ma1"></i>MA1</span>
          <span class="id-legend"><i class="dot ma5"></i>MA5</span>
          <span class="id-legend"><i class="dot ma10"></i>MA10</span>
          <span class="id-legend"><i class="dot ma20"></i>MA20</span>
        </div>

        <!-- 6. 多窗口走势 -->
        <section class="id-sec card">
          <div class="id-sec-head">
            <span class="id-sec-title">多窗口走势</span>
            <span v-if="rangeStats" class="id-trend-tag">{{ rangeStats.trendLabel }}</span>
          </div>
          <div class="id-mw-list">
            <div v-for="(m, i) in multiWindow" :key="i" class="id-mw-item">
              <span class="id-mw-label">{{ m.label }}</span>
              <span class="id-mw-pct" :class="dirCls(m.pct)">{{ fmtPct(m.pct) }}</span>
            </div>
          </div>
        </section>

        <!-- 7. 区间统计 -->
        <section class="id-sec card">
          <div class="id-sec-head">
            <span class="id-sec-title">区间统计</span>
          </div>
          <div class="ir-stats">
            <div class="ir-row">
              <span class="ir-label">近3月最高</span>
              <span class="ir-val-group">
                <span class="ir-value up">{{ fmtPrice(rangeStats && rangeStats.high) }}</span>
                <span class="ir-date">{{ rangeStats && rangeStats.highDate }}</span>
              </span>
            </div>
            <div class="ir-row">
              <span class="ir-label">近3月最低</span>
              <span class="ir-val-group">
                <span class="ir-value down">{{ fmtPrice(rangeStats && rangeStats.low) }}</span>
                <span class="ir-date">{{ rangeStats && rangeStats.lowDate }}</span>
              </span>
            </div>
            <div class="ir-today">
              <div class="ir-today-row">
                <span class="ir-label">今日</span>
                <span class="ir-value">{{ fmtPrice(rangeStats && rangeStats.current) }}</span>
                <span class="ir-dist">距区间高点
                  <em :class="dirCls(rangeStats && rangeStats.distFromHigh)">{{ fmtPct(rangeStats && rangeStats.distFromHigh) }}</em>
                </span>
                <span class="ir-pos">位置分位
                  <em>{{ rangeStats ? rangeStats.position : '--' }}%</em>
                </span>
              </div>
              <div class="ir-bar">
                <div class="ir-bar-track">
                  <div
                    class="ir-bar-fill"
                    :style="{ width: (rangeStats ? rangeStats.position : 0) + '%' }"
                  ></div>
                  <div
                    class="ir-bar-dot"
                    :style="{ left: (rangeStats ? rangeStats.position : 0) + '%' }"
                  ></div>
                </div>
                <div class="ir-bar-legend">
                  <span>低</span>
                  <span>高</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 8. 技术指标 -->
        <section class="id-sec card">
          <div class="id-sec-head">
            <span class="id-sec-title">技术指标</span>
            <span class="id-tag">日K口径</span>
          </div>
          <div class="tx-grid">
            <div class="tx-cell">
              <div class="tx-name">MA5</div>
              <div class="tx-val">{{ fmtPrice(detail.ma && detail.ma.ma5) }}</div>
              <div class="tx-sub" :class="maPosClass(detail.price, detail.ma && detail.ma.ma5)">
                {{ maPosLabel(detail.price, detail.ma && detail.ma.ma5) }}
              </div>
            </div>
            <div class="tx-cell">
              <div class="tx-name">MA10</div>
              <div class="tx-val">{{ fmtPrice(detail.ma && detail.ma.ma10) }}</div>
              <div class="tx-sub" :class="maPosClass(detail.price, detail.ma && detail.ma.ma10)">
                {{ maPosLabel(detail.price, detail.ma && detail.ma.ma10) }}
              </div>
            </div>
            <div class="tx-cell">
              <div class="tx-name">MA20</div>
              <div class="tx-val">{{ fmtPrice(detail.ma && detail.ma.ma20) }}</div>
              <div class="tx-sub" :class="maPosClass(detail.price, detail.ma && detail.ma.ma20)">
                {{ maPosLabel(detail.price, detail.ma && detail.ma.ma20) }}
              </div>
            </div>
            <div class="tx-cell">
              <div class="tx-name">RSI(14)</div>
              <div class="tx-val">{{ rsiText(detail.rsi) }}</div>
              <div class="tx-sub" :class="rsiClass(detail.rsi)">{{ rsiLabel(detail.rsi) }}</div>
            </div>
          </div>
          <div class="tx-macd">
            <div class="tx-macd-item">
              <span class="tx-macd-name">MACD</span>
              <span class="tx-macd-val" :class="macdSignalClass(detail.macd && detail.macd.signal)">
                {{ (detail.macd && detail.macd.signal) || '--' }}
              </span>
            </div>
            <div class="tx-macd-item">
              <span class="tx-macd-name">能量柱</span>
              <span class="tx-macd-val" :class="macdHistClass(detail.macd && detail.macd.histLabel)">
                {{ (detail.macd && detail.macd.histLabel) || '--' }}
              </span>
            </div>
          </div>
        </section>

        <!-- 9. 数据说明 -->
        <div class="id-data-note">
          本页行情与指标基于公开数据计算，仅供学习参考，不构成任何投资建议或产品推荐。
        </div>

        <!-- 10. 合规 + 页脚 -->
        <ComplianceCard :items="compliance" />
        <SiteFooter :f2="footer.f2" :disclaimer="footer.disclaimer" />
      </template>

      <!-- 错误态 -->
      <div v-else class="id-error card">
        <div class="id-error-text">{{ error || '暂无数据' }}</div>
        <div class="id-retry" @click="loadDetail">点击重试</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/index.js'
import { compliance, footer } from '../data/fallback.js'
import { marketPhase } from '../data/market-date.js'
import { fmtPrice, fmtPct, showToast } from '../utils/format.js'
import ComplianceCard from '../components/ComplianceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import KlineChart from '../components/KlineChart.vue'

const route = useRoute()
const router = useRouter()

// ==================== 常量 ====================
/** 时间周期 Tab：默认近3月 */
const tabs = [
  { label: '近1周', value: '1w' },
  { label: '近1月', value: '1m' },
  { label: '近3月', value: '3m' },
  { label: '近半年', value: '6m' },
  { label: '近1年', value: '1y' }
]

// ==================== 响应式状态 ====================
const code = computed(() => route.query.code || 'sh000001')
const activeWindow = ref('3m')
const detail = ref(null)
const loading = ref(false)
const firstLoaded = ref(false)
const error = ref('')

// ==================== 计算属性 ====================
const phase = computed(() => marketPhase())

const rangeStats = computed(() => detail.value && detail.value.rangeStats)
const multiWindow = computed(() => (detail.value && detail.value.multiWindow) || [])

/** 数据时间戳：取最后一根 K 线的日期 */
const dataTime = computed(() => {
  const kl = detail.value && detail.value.kline
  if (Array.isArray(kl) && kl.length) {
    return kl[kl.length - 1].date || ''
  }
  return ''
})

// ==================== 工具函数 ====================

/** 涨跌方向 class：涨红跌绿 */
function dirCls(pct) {
  if (pct == null || isNaN(pct)) return 'flat'
  if (pct > 0) return 'up'
  if (pct < 0) return 'down'
  return 'flat'
}

/** 涨跌额 + 涨跌幅 */
function changeText(d) {
  if (!d) return '--'
  const change = Number(d.change)
  const pct = Number(d.changePct)
  const parts = []
  if (!isNaN(change)) parts.push((change >= 0 ? '+' : '') + fmtPrice(change))
  if (!isNaN(pct)) parts.push(fmtPct(pct))
  return parts.length ? parts.join(' ') : '--'
}

/** 价与均线关系 */
function maPosLabel(price, ma) {
  if (price == null || ma == null || isNaN(price) || isNaN(ma)) return '--'
  return price >= ma ? '价在线上' : '价在线下'
}
function maPosClass(price, ma) {
  if (price == null || ma == null || isNaN(price) || isNaN(ma)) return 'flat'
  return price >= ma ? 'up' : 'down'
}

/** RSI 判定 */
function rsiLabel(rsi) {
  if (rsi == null || isNaN(rsi)) return '--'
  if (rsi >= 70) return '超买'
  if (rsi <= 30) return '超卖'
  return '中性'
}
function rsiClass(rsi) {
  if (rsi == null || isNaN(rsi)) return 'flat'
  if (rsi >= 70) return 'up' // 超买 → 红色警示
  if (rsi <= 30) return 'down' // 超卖 → 绿色
  return 'flat'
}
function rsiText(rsi) {
  if (rsi == null || isNaN(rsi)) return '--'
  return Number(rsi).toFixed(1)
}

/** MACD 信号 / 能量柱 颜色 */
function macdSignalClass(signal) {
  if (!signal) return 'flat'
  return /金叉|多头/.test(signal) ? 'up' : 'down'
}
function macdHistClass(label) {
  if (!label) return 'flat'
  return /红柱/.test(label) ? 'up' : 'down'
}

// ==================== 导航 ====================

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/market')
  }
}

// ==================== 数据加载 ====================

function onTab(val) {
  if (activeWindow.value === val || loading.value) return
  activeWindow.value = val
  loadDetail()
}

function loadDetail() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  api
    .indexDetail(code.value, activeWindow.value)
    .then(res => {
      if (!res || res.ok !== true || !res.detail) throw new Error('获取指数详情失败')
      detail.value = res.detail
    })
    .catch(() => {
      // 首次加载失败时降级到示例数据，保证页面可演示
      if (!firstLoaded.value) {
        detail.value = buildFallback(code.value, activeWindow.value)
        showToast('行情获取失败，显示为示例数据', 'none')
      } else {
        // 切 Tab 失败：保留原数据并提示
        showToast('切换周期失败，请稍后重试', 'none')
      }
    })
    .finally(() => {
      loading.value = false
      firstLoaded.value = true
    })
}

// ==================== 兜底示例数据 ====================

const NAME_MAP = {
  sh000001: '上证指数',
  sz399001: '深证成指',
  sz399006: '创业板指',
  sh000300: '沪深300',
  sh000905: '中证500',
  sh000688: '科创50',
  sh000852: '中证1000',
  bj899050: '北证50',
  hkHSI: '恒生指数',
  hkHSTECH: '恒生科技',
  usDJI: '道琼斯',
  usIXIC: '纳斯达克',
  usINX: '标普500'
}

function windowLen(w) {
  return { '1w': 5, '1m': 22, '3m': 60, '6m': 120, '1y': 240 }[w] || 60
}

/** 简单移动平均数组（前置补 null，与 kline 等长） */
function smaArr(closes, period) {
  const out = []
  let sum = 0
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i]
    if (i >= period) sum -= closes[i - period]
    out.push(i >= period - 1 ? +(sum / period).toFixed(2) : null)
  }
  return out
}

/** 生成与接口结构一致的兜底 detail */
function buildFallback(code, window) {
  const name = NAME_MAP[code] || '上证指数'
  const price = 3940.04
  const changePct = 1.02
  const change = 39.69
  const prevClose = +(price - change).toFixed(2)
  const n = windowLen(window)

  const kline = []
  const start = price * 0.93
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1)
    const close = +(start + (price - start) * t + (Math.random() - 0.5) * price * 0.014).toFixed(2)
    const open = +(close + (Math.random() - 0.5) * price * 0.01).toFixed(2)
    const high = +(Math.max(open, close) + Math.random() * price * 0.008).toFixed(2)
    const low = +(Math.min(open, close) - Math.random() * price * 0.008).toFixed(2)
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    kline.push({ date: d.toISOString().slice(0, 10), open, close, high, low, volume: 0 })
  }
  kline[n - 1].close = price

  const closes = kline.map(k => k.close)
  const ma5Arr = smaArr(closes, 5)
  const ma10Arr = smaArr(closes, 10)
  const ma20Arr = smaArr(closes, 20)
  const last = arr => (arr.length ? arr[arr.length - 1] : null)
  const ma = { ma5: last(ma5Arr), ma10: last(ma10Arr), ma20: last(ma20Arr) }

  return {
    code,
    name,
    price,
    changePct,
    change,
    prevClose,
    intro:
      '上证指数（上海证券交易所综合股价指数）由在上海证券交易所上市的符合条件的股票与存托凭证组成样本，反映上海证券交易所上市公司的整体表现。',
    kline,
    ma,
    ma5Arr,
    ma10Arr,
    ma20Arr,
    rsi: 65.9,
    macd: { dif: 12.5, dea: 8.3, macd: 8.4, signal: '金叉多头', histLabel: '红柱 +8.40' },
    multiWindow: [
      { label: '近1周', pct: 2.81 },
      { label: '近1月', pct: -1.26 },
      { label: '近3月', pct: -5.74 },
      { label: '近半年', pct: -4.44 },
      { label: '近1年', pct: 8.25 }
    ],
    rangeStats: {
      high: 4242.57,
      highDate: '2026-05-13',
      low: 3764.15,
      lowDate: '2026-07-17',
      current: price,
      distFromHigh: -7.13,
      distFromLow: 4.67,
      position: 37,
      trendLabel: '区间震荡'
    }
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.id-page {
  min-height: 100vh;
  background: #f5f5f7;
}

/* ==================== Navbar ==================== */
.id-navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 8px;
  padding-top: var(--safe-top);
  background: #fff;
  border-bottom: 1px solid #ececf0;
}
.id-back {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  line-height: 1;
  color: #2c3e50;
  cursor: pointer;
  user-select: none;
}
.id-back:active {
  opacity: 0.5;
}
.id-nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
}
.id-nav-placeholder {
  width: 36px;
}

/* ==================== 内容区 ==================== */
.id-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 12px 14px 24px;
}

/* 涨跌色 */
.up {
  color: #c0392b;
}
.down {
  color: #1e8449;
}
.flat {
  color: #94a3b8;
}

/* ==================== 骨架 ==================== */
.sk-card {
  padding: 16px;
  margin-bottom: 12px;
}

/* ==================== 指数头部 ==================== */
.id-head {
  display: flex;
  gap: 14px;
  padding: 16px;
  margin-bottom: 12px;
}
.id-head-left {
  flex: 1 1 52%;
  min-width: 0;
}
.id-head-right {
  flex: 1 1 48%;
  min-width: 0;
  border-left: 1px solid #eef0f3;
  padding-left: 14px;
}
.id-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.id-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}
.phase-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(44, 62, 80, 0.1);
  color: #2c3e50;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.id-price {
  font-size: 30px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.id-change {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.id-time {
  margin-top: 8px;
  font-size: 11px;
  color: #94a3b8;
}
.id-intro-title {
  font-size: 13px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 6px;
}
.id-intro-text {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

/* ==================== 时间周期 Tabs ==================== */
.id-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.id-tabs::-webkit-scrollbar {
  display: none;
}
.id-tab {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 16px;
  background: #fff;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #ececf0;
}
.id-tab:active {
  transform: scale(0.96);
}
.id-tab.active {
  background: #2c3e50;
  color: #fff;
  border-color: #2c3e50;
}

/* ==================== K 线图卡 ==================== */
.id-chart-card {
  position: relative;
  padding: 12px 8px 4px;
  margin-bottom: 8px;
}
.id-chart-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.65);
  color: #94a3b8;
  font-size: 13px;
}

/* ==================== 图例 ==================== */
.id-chart-note {
  display: flex;
  gap: 14px;
  padding: 0 6px 14px;
  font-size: 12px;
  color: #64748b;
}
.id-legend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.id-legend .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot.ma1 {
  background: #9aa0a6;
}
.dot.ma5 {
  background: #f59e0b;
}
.dot.ma10 {
  background: #2563eb;
}
.dot.ma20 {
  background: #8b5cf6;
}

/* ==================== 通用区块 ==================== */
.id-sec {
  padding: 14px 16px;
  margin-bottom: 12px;
}
.id-sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.id-sec-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}
.id-trend-tag,
.id-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.id-trend-tag {
  background: rgba(44, 62, 80, 0.08);
  color: #2c3e50;
}
.id-tag {
  background: rgba(26, 54, 93, 0.1);
  color: #1a365d;
}

/* ==================== 多窗口走势 ==================== */
.id-mw-list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.id-mw-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 2px;
  background: #f5f5f7;
  border-radius: 8px;
}
.id-mw-label {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}
.id-mw-pct {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* ==================== 区间统计 ==================== */
.ir-stats .ir-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid #f1f3f6;
}
.ir-label {
  font-size: 13px;
  color: #64748b;
}
.ir-val-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.ir-value {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #1a1a1a;
}
.ir-value.up {
  color: #c0392b;
}
.ir-value.down {
  color: #1e8449;
}
.ir-date {
  font-size: 12px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}
.ir-today {
  padding-top: 10px;
}
.ir-today-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.ir-dist,
.ir-pos {
  font-size: 12px;
  color: #64748b;
}
.ir-dist em,
.ir-pos em {
  font-style: normal;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ir-bar {
  margin-top: 12px;
}
.ir-bar-track {
  position: relative;
  height: 8px;
  background: #ececf0;
  border-radius: 4px;
}
.ir-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #1e8449, #f59e0b, #c0392b);
}
.ir-bar-dot {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #2c3e50;
  transform: translate(-50%, -50%);
}
.ir-bar-legend {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: #94a3b8;
}

/* ==================== 技术指标 ==================== */
.tx-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.tx-cell {
  padding: 10px 12px;
  background: #f5f5f7;
  border-radius: 10px;
}
.tx-name {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}
.tx-val {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a1a;
  font-variant-numeric: tabular-nums;
}
.tx-sub {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 600;
}
.tx-macd {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.tx-macd-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f5f5f7;
  border-radius: 10px;
}
.tx-macd-name {
  font-size: 12px;
  color: #94a3b8;
}
.tx-macd-val {
  font-size: 13px;
  font-weight: 700;
}

/* ==================== 数据说明 ==================== */
.id-data-note {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.6;
  text-align: justify;
  padding: 4px 4px 0;
  margin-bottom: 4px;
}

/* ==================== 错误态 ==================== */
.id-error {
  padding: 48px 16px;
  text-align: center;
}
.id-error-text {
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 12px;
}
.id-retry {
  display: inline-block;
  padding: 6px 18px;
  border-radius: 16px;
  background: #2c3e50;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.id-retry:active {
  opacity: 0.7;
}

/* ==================== 响应式 ==================== */
@media (max-width: 360px) {
  .id-head { flex-direction: column; gap: 10px; padding: 12px; }
  .id-head-right { border-left: none; border-top: 1px solid #eef0f3; padding-left: 0; padding-top: 10px; width: 100%; }
  .id-name { font-size: 14px; }
  .id-price { font-size: 26px; }
  .id-change { font-size: 12px; }
  .id-tab { padding: 5px 10px; font-size: 12px; }
  .id-chart-card { padding: 10px 4px 4px; }
  .id-chart-note { gap: 10px; font-size: 11px; flex-wrap: wrap; }
  .id-sec { padding: 12px 12px; }
  .id-content { padding: 10px 10px 20px; }
}

@media (min-width: 414px) {
  .id-price { font-size: 34px; }
  .id-name { font-size: 18px; }
  .id-chart-card { padding: 16px 12px 6px; }
}

@media (min-width: 768px) {
  .id-content { max-width: 600px; padding: 16px 20px 32px; }
  .id-head { padding: 20px; }
  .id-price { font-size: 36px; }
  .id-sec { padding: 18px 20px; }
  .id-tab:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
}
</style>

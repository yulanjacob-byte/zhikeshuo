<template>
  <div class="ia-page">
    <!-- 1. Navbar -->
    <header class="ia-navbar">
      <span class="ia-back" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </span>
      <span class="ia-nav-title">指数行情</span>
      <span class="ia-nav-placeholder"></span>
    </header>

    <div class="ia-content">
      <!-- 首次加载骨架屏 -->
      <template v-if="!firstLoaded">
        <div class="ia-sk-head">
          <div class="sk-bar" style="width: 32%; height: 24px"></div>
          <div class="sk-bar" style="width: 26%; height: 12px; margin-top: 8px"></div>
        </div>
        <div class="ia-sk-group-title">
          <div class="sk-bar" style="width: 22%; height: 16px"></div>
        </div>
        <div class="ia-grid">
          <div v-for="n in 6" :key="'sk1-' + n" class="ia-sk-card">
            <div class="sk-bar" style="width: 60%; height: 12px"></div>
            <div class="sk-bar" style="width: 75%; height: 16px; margin-top: 8px"></div>
            <div class="sk-bar" style="width: 50%; height: 11px; margin-top: 6px"></div>
            <div class="sk-bar" style="height: 3px; margin-top: 8px"></div>
            <div class="sk-bar" style="height: 34px; margin-top: 8px"></div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 2. 页头 -->
        <section class="ia-head">
          <div class="ia-head-title">指数行情</div>
          <div class="ia-head-time">更新于 {{ updateTime || '--' }}</div>
        </section>

        <!-- 3. 国内市场 -->
        <section class="ia-section">
          <div class="ia-group-title">
            国内市场
            <span class="ia-group-count">{{ domestic.length }}</span>
          </div>
          <div class="ia-grid">
            <div
              v-for="idx in domestic"
              :key="idx.code"
              class="ia-card"
              @click="goDetail(idx.code)"
            >
              <div class="ia-card-head">
                <span class="ia-card-name">{{ idx.name }}</span>
                <span class="ia-phase-tag">{{ phase }}</span>
              </div>
              <div class="ia-card-price" :class="dirCls(idx.changePct)">
                {{ fmtPrice(idx.price) }}
              </div>
              <div class="ia-card-pct" :class="dirCls(idx.changePct)">
                <span class="ia-arrow">{{ dirArrow(idx.changePct) }}</span>
                <span>{{ fmtPct(idx.changePct) }}</span>
              </div>
              <div class="ia-minibar">
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
              <div class="ia-spark">
                <KlineSpark
                  :points="klineOf(idx)"
                  :color="dirColor(idx.changePct)"
                  :height="36"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- 4. 海外市场 -->
        <section class="ia-section">
          <div class="ia-group-title">
            海外市场
            <span class="ia-group-count">{{ overseas.length }}</span>
          </div>
          <div class="ia-grid">
            <div
              v-for="idx in overseas"
              :key="idx.code"
              class="ia-card"
              @click="goDetail(idx.code)"
            >
              <div class="ia-card-head">
                <span class="ia-card-name">{{ idx.name }}</span>
                <span class="ia-phase-tag">{{ phase }}</span>
              </div>
              <div class="ia-card-price" :class="dirCls(idx.changePct)">
                {{ fmtPrice(idx.price) }}
              </div>
              <div class="ia-card-pct" :class="dirCls(idx.changePct)">
                <span class="ia-arrow">{{ dirArrow(idx.changePct) }}</span>
                <span>{{ fmtPct(idx.changePct) }}</span>
              </div>
              <div class="ia-minibar">
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
              <div class="ia-spark">
                <KlineSpark
                  :points="klineOf(idx)"
                  :color="dirColor(idx.changePct)"
                  :height="36"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- 5. 下拉可刷新提示 -->
        <div class="ia-pull-hint">
          <span class="ia-pull-arrow">↓</span>
          <span>下拉可刷新</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/index.js'
import { fmtPrice, fmtPct, dirArrow, showToast } from '../utils/format.js'
import { marketPhase } from '../data/market-date.js'
import KlineSpark from '../components/KlineSpark.vue'

const router = useRouter()

// ==================== 常量 ====================
const UP_COLOR = '#C0392B'
const DOWN_COLOR = '#1E8449'

// ==================== 兜底数据 ====================
const fallbackDomestic = [
  { code: 'sh000001', name: '上证指数', price: 3940.04, changePct: 1.02, prevClose: 3900.26 },
  { code: 'sz399001', name: '深证成指', price: 14311.01, changePct: 1.42, prevClose: 14113.65 },
  { code: 'sz399006', name: '创业板指', price: 3563.12, changePct: 1.35, prevClose: 3515.65 },
  { code: 'sh000300', name: '沪深300', price: 4694.44, changePct: 0.93, prevClose: 4651.02 },
  { code: 'sh000905', name: '中证500', price: 7980.12, changePct: 1.93, prevClose: 7829.45 },
  { code: 'sh000688', name: '科创50', price: 1744.02, changePct: 2.51, prevClose: 1701.30 },
  { code: 'sh000852', name: '中证1000', price: 7679.53, changePct: 1.98, prevClose: 7530.89 },
  { code: 'bj899050', name: '北证50', price: 1134.24, changePct: 1.01, prevClose: 1122.91 }
]
const fallbackOverseas = [
  { code: 'hkHSI', name: '恒生指数', price: 25668.03, changePct: 0.54, prevClose: 25530.89 },
  { code: 'HSTECH', name: '恒生科技', price: 4858.29, changePct: 0.78, prevClose: 4820.62 },
  { code: 'usDJI', name: '道琼斯', price: 54036.93, changePct: 0.28, prevClose: 53887.05 },
  { code: 'usIXIC', name: '纳斯达克', price: 26690.62, changePct: 1.30, prevClose: 26348.49 },
  { code: 'usINX', name: '标普500', price: 7757.64, changePct: 0.62, prevClose: 7709.99 }
]

// ==================== 响应式状态 ====================
const domestic = ref([])
const overseas = ref([])
const klineMap = ref({})
const firstLoaded = ref(false)
const updateTime = ref('')

// ==================== 计算属性 ====================
const phase = computed(() => marketPhase())

// ==================== 工具函数 ====================

/** 涨跌方向 class：涨红跌绿 */
function dirCls(pct) {
  if (pct == null || isNaN(pct)) return 'flat'
  if (pct > 0) return 'up'
  if (pct < 0) return 'down'
  return 'flat'
}

/** 涨跌方向颜色 hex */
function dirColor(pct) {
  if (pct == null || isNaN(pct)) return '#94a3b8'
  return pct >= 0 ? UP_COLOR : DOWN_COLOR
}

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

/** 生成 7 天 mock kline，趋势与当日涨跌一致 */
function genMockKline(end, pct) {
  const n = 7
  if (!end || isNaN(end)) end = 3000
  const start = end / (1 + (pct || 0) / 100)
  const arr = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const base = start + (end - start) * t
    const noise = (Math.random() - 0.5) * end * 0.008
    arr.push({ date: '', close: +(base + noise).toFixed(2) })
  }
  arr[0].close = +start.toFixed(2)
  arr[n - 1].close = +end.toFixed(2)
  return arr
}

/** 解析 kline：接口数据优先，否则 mock 7 天走势 */
function resolveKlines(indices, rawKline) {
  const map = {}
  indices.forEach(idx => {
    const raw = rawKline && rawKline[idx.code]
    if (Array.isArray(raw) && raw.length >= 2) {
      const parsed = raw
        .map(p => {
          if (typeof p === 'object' && p) {
            return { date: p.date || '', close: Number(p.close) }
          }
          return { date: '', close: Number(p) }
        })
        .filter(p => !isNaN(p.close))
      map[idx.code] = parsed.length >= 2 ? parsed : genMockKline(idx.price, idx.changePct)
    } else {
      map[idx.code] = genMockKline(idx.price, idx.changePct)
    }
  })
  return map
}

function klineOf(idx) {
  if (!idx || !idx.code) return []
  return klineMap.value[idx.code] || []
}

/** 进度条圆点位置：以昨收为基准，偏离幅度映射到 3%~97% */
function minibarPos(idx) {
  if (!idx || idx.price == null || idx.prevClose == null || !idx.prevClose) return 50
  const pct = ((idx.price - idx.prevClose) / idx.prevClose) * 100
  return Math.max(3, Math.min(97, 50 + pct * 25))
}

/** 进度条填充样式：涨从中线向右，跌从位置点向左 */
function fillStyle(idx) {
  const pos = minibarPos(idx)
  if (idx.changePct >= 0) return { left: '50%', width: Math.max(0, pos - 50) + '%' }
  return { left: pos + '%', width: Math.max(0, 50 - pos) + '%' }
}

/** 更新时间格式化为「MM-DD HH:mm」（北京时间） */
function fmtUpdateTime() {
  const d = new Date()
  const bj = new Date(d.getTime() + 8 * 3600 * 1000)
  const mm = String(bj.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(bj.getUTCDate()).padStart(2, '0')
  const hh = String(bj.getUTCHours()).padStart(2, '0')
  const mi = String(bj.getUTCMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

// ==================== 导航 ====================

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/market')
  }
}

function goDetail(code) {
  router.push({ path: '/indexDetail', query: { code } })
}

// ==================== 数据加载 ====================

function applyData(res) {
  const dom = (Array.isArray(res.domestic) ? res.domestic : []).map(normalizeIndex)
  const ovs = (Array.isArray(res.overseas) ? res.overseas : []).map(normalizeIndex)
  domestic.value = dom
  overseas.value = ovs
  const rawKline = res.kline && typeof res.kline === 'object' ? res.kline : {}
  klineMap.value = resolveKlines(dom.concat(ovs), rawKline)
}

function applyFallback() {
  const dom = fallbackDomestic.map(normalizeIndex)
  const ovs = fallbackOverseas.map(normalizeIndex)
  domestic.value = dom
  overseas.value = ovs
  klineMap.value = resolveKlines(dom.concat(ovs), {})
}

function loadData() {
  api
    .indexAll()
    .then(res => {
      if (!res || res.ok !== true) throw new Error('行情获取失败')
      applyData(res)
    })
    .catch(() => {
      if (!firstLoaded.value) {
        applyFallback()
        showToast('行情获取失败，显示为示例数据', 'none')
      } else {
        showToast('刷新失败，请稍后重试', 'none')
      }
    })
    .finally(() => {
      firstLoaded.value = true
      updateTime.value = fmtUpdateTime()
    })
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.ia-page {
  min-height: 100vh;
  background: #f5f6fa;
}

/* ==================== Navbar ==================== */
.ia-navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 8px;
  padding-top: var(--safe-top);
  background: #fff;
  border-bottom: 1px solid #ececf0;
}
.ia-back {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2c3e50;
  cursor: pointer;
  user-select: none;
}
.ia-back:active {
  opacity: 0.5;
}
.ia-back svg {
  width: 24px;
  height: 24px;
  display: block;
}
.ia-nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
}
.ia-nav-placeholder {
  width: 36px;
}

/* ==================== 内容区 ==================== */
.ia-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 12px 14px 24px;
}

/* 涨跌色（红涨绿跌） */
.up { color: #C0392B; }
.down { color: #1E8449; }
.flat { color: #94a3b8; }

/* ==================== 页头 ==================== */
.ia-head {
  padding: 6px 2px 14px;
}
.ia-head-title {
  font-size: 22px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1.2;
}
.ia-head-time {
  margin-top: 5px;
  font-size: 12px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

/* ==================== 分组 ==================== */
.ia-section {
  margin-bottom: 18px;
}
.ia-group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 10px;
  padding-left: 2px;
}
.ia-group-count {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

/* ==================== 网格 ==================== */
.ia-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

/* ==================== 指数卡片 ==================== */
.ia-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(26, 54, 93, 0.06);
  padding: 10px 10px 8px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.3s ease;
  overflow: hidden;
}
.ia-card:active {
  transform: scale(0.96);
}

.ia-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 6px;
}
.ia-card-name {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ia-phase-tag {
  flex-shrink: 0;
  display: inline-block;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(44, 62, 80, 0.08);
  color: #2c3e50;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
}

.ia-card-price {
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.ia-card-pct {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.ia-arrow {
  font-size: 9px;
}

/* ==================== 进度条 ==================== */
.ia-minibar {
  margin-top: 7px;
}
.mb-track {
  position: relative;
  height: 3px;
  background: #eef0f3;
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
  height: 7px;
  background: #94a3b8;
  transform: translateX(-50%);
  opacity: 0.5;
}
.mb-dot {
  position: absolute;
  top: 50%;
  width: 7px;
  height: 7px;
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

/* ==================== 迷你 K 线 ==================== */
.ia-spark {
  margin-top: 6px;
}

/* ==================== 下拉刷新提示 ==================== */
.ia-pull-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 0 8px;
  font-size: 12px;
  color: #94a3b8;
}
.ia-pull-arrow {
  font-size: 14px;
  line-height: 1;
}

/* ==================== 骨架屏 ==================== */
.ia-sk-head {
  padding: 6px 2px 14px;
}
.ia-sk-group-title {
  padding-left: 2px;
  margin-bottom: 10px;
}
.ia-sk-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(26, 54, 93, 0.06);
  padding: 10px;
}

/* ==================== 响应式 ==================== */
@media (max-width: 360px) {
  .ia-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .ia-card { padding: 8px 8px 6px; }
  .ia-card-name { font-size: 11px; }
  .ia-card-price { font-size: 14px; }
  .ia-card-pct { font-size: 10px; }
  .ia-phase-tag { font-size: 8px; padding: 1px 4px; }
  .ia-group-title { font-size: 14px; }
}

@media (min-width: 414px) {
  .ia-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .ia-card { padding: 12px 12px 10px; }
  .ia-card-name { font-size: 13px; }
  .ia-card-price { font-size: 18px; }
}

@media (min-width: 768px) {
  .ia-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .ia-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26, 54, 93, 0.12); }
  .ia-card-price { font-size: 20px; }
}
</style>

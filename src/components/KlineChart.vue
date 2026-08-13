<template>
  <div ref="wrapRef" class="kline-chart" :style="{ height: height + 'px' }">
    <svg
      v-if="geom"
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      class="kc-svg"
    >
      <!-- 横向网格线 -->
      <line
        v-for="(g, i) in yGrid"
        :key="'g' + i"
        :x1="padL"
        :y1="g.y"
        :x2="chartRight"
        :y2="g.y"
        stroke="#eef0f3"
        stroke-width="1"
      />
      <!-- Y 轴价格刻度 -->
      <text
        v-for="(g, i) in yGrid"
        :key="'yl' + i"
        :x="chartRight + 4"
        :y="g.y + 3"
        class="kc-ytext"
      >{{ g.label }}</text>

      <!-- K 线蜡烛 -->
      <g v-for="(c, i) in geom.candles" :key="'c' + i">
        <line
          :x1="c.x"
          :y1="c.highY"
          :x2="c.x"
          :y2="c.lowY"
          :stroke="c.color"
          stroke-width="1"
        />
        <rect
          :x="c.bodyX"
          :y="c.bodyY"
          :width="c.bodyW"
          :height="c.bodyH"
          :fill="c.color"
        />
      </g>

      <!-- 均线：MA1(收盘价/灰) MA5(橙) MA10(蓝) MA20(紫) -->
      <polyline :points="ma1Path" fill="none" stroke="#9aa0a6" stroke-width="1.2" stroke-linejoin="round" />
      <polyline :points="ma5Path" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-linejoin="round" />
      <polyline :points="ma10Path" fill="none" stroke="#2563eb" stroke-width="1.2" stroke-linejoin="round" />
      <polyline :points="ma20Path" fill="none" stroke="#8b5cf6" stroke-width="1.2" stroke-linejoin="round" />

      <!-- X 轴日期刻度 -->
      <text
        v-for="(xl, i) in xLabels"
        :key="'xl' + i"
        :x="xl.x"
        :y="height - 3"
        class="kc-xtext"
        text-anchor="middle"
      >{{ xl.label }}</text>
    </svg>
    <div v-else class="kc-empty">暂无K线数据</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  /** K 线数据：[{ date, open, close, high, low, volume }] */
  kline: { type: Array, default: () => [] },
  /** MA5 数组（与 kline 等长，前置可为 null） */
  ma5Arr: { type: Array, default: () => [] },
  /** MA10 数组 */
  ma10Arr: { type: Array, default: () => [] },
  /** MA20 数组 */
  ma20Arr: { type: Array, default: () => [] },
  /** 图表高度（px） */
  height: { type: Number, default: 260 }
})

const UP = '#C0392B'
const DOWN = '#1E8449'

const padL = 6
const padR = 54
const padT = 10
const padB = 18

const wrapRef = ref(null)
const width = ref(320)

const chartRight = computed(() => width.value - padR)
const chartW = computed(() => Math.max(1, width.value - padL - padR))
const chartH = computed(() => Math.max(1, props.height - padT - padB))

/** 归一化 K 线数据 */
const bars = computed(() =>
  (props.kline || [])
    .map(b => ({
      date: b.date || '',
      open: Number(b.open),
      close: Number(b.close),
      high: Number(b.high),
      low: Number(b.low)
    }))
    .filter(b => !isNaN(b.open) && !isNaN(b.close) && !isNaN(b.high) && !isNaN(b.low))
)

/** 收集所有需要参与纵轴范围计算的值（高低点 + 各均线） */
const allValues = computed(() => {
  const vals = []
  bars.value.forEach(b => { vals.push(b.high, b.low) })
  ;[props.ma5Arr, props.ma10Arr, props.ma20Arr].forEach(arr => {
    ;(arr || []).forEach(v => {
      if (v == null) return // 跳过 null（MA 前置不足周期时为 null）
      const n = Number(v)
      if (!isNaN(n)) vals.push(n)
    })
  })
  return vals
})

const bounds = computed(() => {
  const vals = allValues.value
  if (!vals.length) return { min: 0, max: 1, range: 1 }
  const rawMin = Math.min(...vals)
  const rawMax = Math.max(...vals)
  const rawRange = rawMax - rawMin || 1
  // 上下各留 8% 空白，避免贴边
  const padding = rawRange * 0.08
  const min = rawMin - padding
  const max = rawMax + padding
  return { min, max, range: max - min || 1 }
})

function yOf(v) {
  const { min, range } = bounds.value
  return padT + (1 - (v - min) / range) * chartH.value
}

/** 蜡烛几何 */
const geom = computed(() => {
  const b = bars.value
  if (!b.length) return null
  const slot = chartW.value / b.length
  const bodyW = Math.max(1.5, Math.min(7, slot * 0.62))
  const candles = b.map((c, i) => {
    const x = padL + slot * (i + 0.5)
    const color = c.close >= c.open ? UP : DOWN
    const highY = yOf(c.high)
    const lowY = yOf(c.low)
    const top = yOf(Math.max(c.open, c.close))
    const bot = yOf(Math.min(c.open, c.close))
    return {
      x: +x.toFixed(2),
      highY: +highY.toFixed(2),
      lowY: +lowY.toFixed(2),
      bodyX: +(x - bodyW / 2).toFixed(2),
      bodyY: +top.toFixed(2),
      bodyW: +bodyW.toFixed(2),
      bodyH: +Math.max(1, bot - top).toFixed(2),
      color
    }
  })
  return { candles }
})

/** 构建均线 polyline points */
function buildMaPath(arr) {
  if (!geom.value || !arr || !arr.length) return ''
  const b = bars.value
  const n = b.length
  if (!n) return ''
  const slot = chartW.value / n
  const pts = []
  for (let i = 0; i < n; i++) {
    const raw = arr[i]
    if (raw == null) continue
    const v = Number(raw)
    if (isNaN(v)) continue
    const x = padL + slot * (i + 0.5)
    const y = yOf(v)
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return pts.join(' ')
}

/** MA1 = 收盘价线 */
const ma1Path = computed(() =>
  geom.value ? buildMaPath(bars.value.map(b => b.close)) : ''
)
const ma5Path = computed(() => buildMaPath(props.ma5Arr))
const ma10Path = computed(() => buildMaPath(props.ma10Arr))
const ma20Path = computed(() => buildMaPath(props.ma20Arr))

/** Y 轴网格 + 刻度 */
const yGrid = computed(() => {
  if (!geom.value) return []
  const { min, range } = bounds.value
  const steps = 4
  const arr = []
  for (let i = 0; i <= steps; i++) {
    const v = min + (range * i) / steps
    const y = padT + (1 - i / steps) * chartH.value
    arr.push({ y: +y.toFixed(2), label: v.toFixed(0) })
  }
  return arr
})

/** X 轴日期刻度（最多 5 个） */
const xLabels = computed(() => {
  const b = bars.value
  if (!b.length || !geom.value) return []
  const slot = chartW.value / b.length
  const count = Math.min(5, b.length)
  const arr = []
  for (let i = 0; i < count; i++) {
    const idx = count === 1 ? 0 : Math.round((i / (count - 1)) * (b.length - 1))
    const x = padL + slot * (idx + 0.5)
    const d = b[idx].date || ''
    arr.push({ x: +x.toFixed(2), label: d.length >= 10 ? d.slice(5) : d })
  }
  return arr
})

let ro = null
onMounted(() => {
  if (wrapRef.value) {
    width.value = wrapRef.value.clientWidth || 320
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(entries => {
        for (const e of entries) {
          const w = e.contentRect.width
          if (w) width.value = w
        }
      })
      ro.observe(wrapRef.value)
    }
  }
})
onUnmounted(() => {
  if (ro) ro.disconnect()
})
</script>

<style scoped>
.kline-chart {
  width: 100%;
  overflow: hidden;
}
.kc-svg {
  display: block;
}
.kc-ytext {
  font-size: 10px;
  fill: #94a3b8;
}
.kc-xtext {
  font-size: 10px;
  fill: #94a3b8;
}
.kc-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
}
</style>

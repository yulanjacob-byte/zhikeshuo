<template>
  <div ref="wrapRef" class="kline-spark" :style="{ height: height + 'px' }">
    <svg
      v-if="coords"
      :width="width"
      :height="height"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
      class="ks-svg"
    >
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="actualColor" stop-opacity="0.24" />
          <stop offset="100%" :stop-color="actualColor" stop-opacity="0" />
        </linearGradient>
      </defs>
      <!-- 渐变填充区域 -->
      <path :d="areaPath" :fill="`url(#${gradId})`" />
      <!-- 折线 -->
      <polyline
        :points="polylineStr"
        fill="none"
        :stroke="actualColor"
        :stroke-width="stroke"
        stroke-linejoin="round"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
      <!-- 末端圆点 -->
      <circle
        v-if="lastPoint"
        :cx="lastPoint.x"
        :cy="lastPoint.y"
        :r="dotSize"
        :fill="actualColor"
        stroke="#fff"
        :stroke-width="1"
      />
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  /** kline 数据：{ date, close } 对象数组，或纯数字数组 */
  points: { type: Array, default: () => [] },
  /** 折线颜色（不传则按首末值涨跌自动取红/绿） */
  color: { type: String, default: '' },
  /** 图表高度（px） */
  height: { type: Number, default: 60 },
  /** 描边宽度 */
  stroke: { type: Number, default: 1.5 },
  /** 末端圆点半径 */
  dotSize: { type: Number, default: 3 }
})

const UP_COLOR = '#C0392B'
const DOWN_COLOR = '#1E8449'

/** 稳定的渐变 id（避免每次渲染变化） */
const gradId = `ksg-${Math.random().toString(36).slice(2, 9)}`

const wrapRef = ref(null)
const width = ref(120)

/** 将 points 归一化为数字数组 */
const values = computed(() => {
  if (!props.points || !props.points.length) return []
  return props.points
    .map(p => {
      if (typeof p === 'number') return p
      if (p && typeof p === 'object') return Number(p.close)
      return NaN
    })
    .filter(v => !isNaN(v))
})

/** 实际颜色：优先用传入值，否则按趋势涨红跌绿 */
const actualColor = computed(() => {
  if (props.color) return props.color
  const vals = values.value
  if (vals.length >= 2) {
    return vals[vals.length - 1] >= vals[0] ? UP_COLOR : DOWN_COLOR
  }
  return UP_COLOR
})

/** 计算 x/y 坐标 */
const coords = computed(() => {
  const vals = values.value
  const n = vals.length
  if (n < 2) return null
  const w = width.value || 120
  const h = props.height
  const pad = props.dotSize + 2
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const usable = Math.max(1, h - pad * 2)
  return vals.map((v, i) => {
    const x = n === 1 ? 0 : (i / (n - 1)) * w
    const y = pad + (1 - (v - min) / range) * usable
    return { x: +x.toFixed(2), y: +y.toFixed(2) }
  })
})

const polylineStr = computed(() => {
  if (!coords.value) return ''
  return coords.value.map(p => `${p.x},${p.y}`).join(' ')
})

const areaPath = computed(() => {
  if (!coords.value) return ''
  const pts = coords.value
  const h = props.height
  const head = `M ${pts[0].x} ${h} L `
  const mid = pts.map(p => `${p.x} ${p.y}`).join(' L ')
  const tail = ` L ${pts[pts.length - 1].x} ${h} Z`
  return head + mid + tail
})

const lastPoint = computed(() =>
  coords.value ? coords.value[coords.value.length - 1] : null
)

let ro = null
onMounted(() => {
  if (wrapRef.value) {
    width.value = wrapRef.value.clientWidth || 120
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
.kline-spark {
  width: 100%;
  overflow: hidden;
}
.ks-svg {
  display: block;
}
</style>

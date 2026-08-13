<template>
  <div class="fb-bar" @click.stop>
    <div
      v-for="opt in options"
      :key="opt.value"
      class="fb-btn"
      :class="{ active: selected === opt.value }"
      @click="handleClick(opt.value)"
    >
      <span class="fb-icon">{{ opt.icon }}</span>
      <span class="fb-label">{{ opt.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { feedback } from '../api/index.js'
import { showToast } from '../utils/format.js'

const props = defineProps({
  type: { type: String, default: '' },
  itemKey: { type: String, default: '' },
  promptVersion: { type: String, default: 'default' },
  outputSummary: { type: String, default: '' },
  outputFull: { type: String, default: '' }
})

const selected = ref(null)

const options = [
  { value: 'good', icon: '👍', label: '有用' },
  { value: 'bad', icon: '👎', label: '需改进' }
]

async function handleClick(value) {
  if (selected.value) return
  selected.value = value

  try {
    await feedback({
      kind: props.type,
      itemKey: props.itemKey,
      rating: value,
      promptVersion: props.promptVersion,
      outputSummary: props.outputSummary,
      outputFull: props.outputFull
    })
    showToast(value === 'good' ? '感谢反馈！' : '已记录，我们会持续优化', 'success')
  } catch {
    showToast('反馈提交失败', 'error')
  }
}
</script>

<style scoped>
.fb-bar {
  display: flex;
  gap: 8px;
  padding: 8px 0 4px;
}

.fb-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 16px;
  background: var(--bg-base);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.fb-btn:active { transform: scale(0.96); }

.fb-btn.active {
  background: var(--primary);
  color: #fff;
}

.fb-icon { font-size: 14px; }
</style>

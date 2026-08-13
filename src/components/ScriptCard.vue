<template>
  <div class="script-item card" @click="copyContent">
    <div class="si-head">
      <div class="si-title">{{ title }}</div>
      <div class="copy-btn" @click.stop="copyContent">📋 复制</div>
    </div>
    <div v-if="scene" class="si-scene">
      <span class="si-scene-tag">{{ sceneTag }}</span>
      <span class="si-scene-text">{{ scene }}</span>
    </div>
    <div class="si-body">{{ body }}</div>
    <div v-if="fbType" class="si-fb" @click.stop>
      <FeedbackBar
        :type="fbType"
        :item-key="fbItemKey"
        :prompt-version="fbPromptVersion"
        :output-summary="body"
        :output-full="fbOutputFull || body"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import FeedbackBar from './FeedbackBar.vue'
import { copyText, showToast } from '../utils/format.js'

const props = defineProps({
  title: { type: String, default: '' },
  scene: { type: String, default: '' },
  body: { type: String, default: '' },
  fbType: { type: String, default: '' },
  fbItemKey: { type: String, default: 'main' },
  fbPromptVersion: { type: String, default: 'default' },
  fbOutputFull: { type: String, default: '' }
})

const sceneTag = computed(() => {
  const s = String(props.scene || '')
  if (s.includes('微信')) return '微信沟通'
  if (s.includes('电话')) return '电话沟通'
  if (s.includes('见面') || s.includes('面谈')) return '见面沟通'
  return '适用场景'
})

function fullText() {
  return (props.title ? props.title.trim() + '\n\n' : '') + (props.body || '').trim()
}

async function copyContent() {
  const ok = await copyText(fullText())
  showToast(ok ? '已复制 ✅' : '复制失败', ok ? 'success' : 'error')
}
</script>

<style scoped>
.script-item {
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.script-item:active { transform: scale(0.99); }

.si-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.si-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  flex: 1;
  line-height: 1.4;
}

.copy-btn {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 14px;
  background: rgba(26, 54, 93, 0.08);
  color: var(--primary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:active { transform: scale(0.94); }

.si-scene {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.si-scene-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.si-scene-text {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.si-body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.si-fb {
  margin-top: 8px;
  border-top: 1px solid var(--border);
  padding-top: 4px;
}
</style>

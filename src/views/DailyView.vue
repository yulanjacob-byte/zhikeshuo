<template>
  <div class="wrap">
    <!-- 市场情绪区块 -->
    <section class="macro-block">
      <div class="macro-head">
        <div class="macro-title-wrap">
          <div class="macro-title"><span class="sec-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21 C7 17 3 14 3 9 C3 6 5 4 8 4 C10 4 11 5 12 7 C13 5 14 4 16 4 C19 4 21 6 21 9 C21 14 17 17 12 21 Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/><path d="M9 10 Q9.5 9 10.5 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M14 10 Q14.5 9 15.5 9.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none"/></svg></span> 市场情绪</div>
        </div>
        <div
          class="refresh-btn"
          :class="{ disabled: emotionCard.loading }"
          @click="generateEmotion"
        >
          {{ emotionCard.loading ? `⏳ ${emotionCard.elapsed}s` : '🔄 刷新' }}
        </div>
      </div>
      <div class="macro-desc">
        基于实时行情判断今日市场情绪档位，并提供客户情绪应对策略（AI 生成，仅供参考）
      </div>

      <!-- 情绪卡片 -->
      <div v-if="emotionCard.strategy" class="emotion-card card">
        <div class="me-head">
          <div class="me-dot" :class="emotionCard.dot"></div>
          <span class="me-label">{{ emotionCard.label }}</span>
        </div>
        <div v-if="emotionCard.hint" class="me-hint">{{ emotionCard.hint }}</div>
        <div class="emotion-divider"></div>
        <div class="emotion-title">客户情绪应对</div>
        <div class="emotion-strategy">{{ emotionCard.strategy }}</div>
        <div class="macro-fb">
          <FeedbackBar
            type="marketBrief"
            item-key="emotion"
            :prompt-version="emotionCard.promptVersion"
            :output-summary="emotionCard.strategy"
            :output-full="emotionCard.strategy"
          />
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="emotionCard.error" class="macro-error card">
        {{ emotionCard.error }}
      </div>
    </section>

    <!-- 今日话术区块 -->
    <section class="tt-zone">
      <div class="sec-head">
        <div class="sec-title"><span class="sec-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5 C4 3.9 4.9 3 6 3 L18 3 C19.1 3 20 3.9 20 5 L20 14 C20 15.1 19.1 16 18 16 L9 16 L5 19.5 L5 16 C4.4 16 4 15.1 4 14 Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/><circle cx="8.5" cy="9.5" r="1" fill="currentColor"/><circle cx="12" cy="9.5" r="1" fill="currentColor"/><circle cx="15.5" cy="9.5" r="1" fill="currentColor"/></svg></span> 今日话术推荐</div>
        <div
          class="refresh-btn"
          :class="{ disabled: loading }"
          @click="generateScripts"
        >
          {{ loading ? `⏳ ${elapsed}s` : '✨ 生成今日话术' }}
        </div>
      </div>
      <div class="sec-desc">
        基于当前最新行情提供3条场景话术和1条朋友圈文案（AI 生成，仅供参考）
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="sk-loading card">
        正在生成今日话术，约需 10-30 秒…
        <div class="sk-bar" style="margin-top: 12px;"></div>
        <div class="sk-bar" style="width: 80%;"></div>
        <div class="sk-bar" style="width: 60%;"></div>
      </div>

      <!-- 失败降级：示例话术 -->
      <div v-else-if="failed && !live" class="static-zone">
        <div class="tt-fail">⚠️ 生成失败，以下为示例话术，可稍后重试</div>
        <div v-for="(s, i) in scripts" :key="'s' + i" class="tt-card">
          <ScriptCard :title="s.title" :scene="s.scene" :body="s.body" />
        </div>
        <div class="tt-card">
          <ScriptCard
            :title="momentsCard.title"
            :scene="momentsCard.scene"
            :body="momentsCard.body"
          />
        </div>
      </div>

      <!-- 实时生成结果 -->
      <div v-else-if="live" class="live-zone">
        <div v-for="(s, i) in scripts" :key="'l' + i" class="tt-card">
          <ScriptCard
            :title="s.title"
            :scene="s.scene"
            :body="s.body"
            fb-type="dailyScripts"
            :fb-item-key="s.itemKey"
            :fb-prompt-version="promptVersion"
          />
        </div>
        <div v-if="momentsCard.body" class="tt-card">
          <ScriptCard
            :title="momentsCard.title"
            :scene="momentsCard.scene"
            :body="momentsCard.body"
            fb-type="dailyScripts"
            :fb-item-key="momentsCard.itemKey"
            :fb-prompt-version="promptVersion"
          />
        </div>
      </div>
    </section>

    <!-- 合规提示 -->
    <ComplianceCard :items="compliance" />

    <!-- 页脚 -->
    <SiteFooter :f2="footer.f2" :disclaimer="footer.disclaimer" />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import api from '../api/index.js'
import { scripts as fbScripts, moments as fbMoments, compliance, footer } from '../data/fallback.js'
import { prevCloseLabel } from '../data/market-date.js'
import { showToast } from '../utils/format.js'
import ComplianceCard from '../components/ComplianceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import ScriptCard from '../components/ScriptCard.vue'
import FeedbackBar from '../components/FeedbackBar.vue'

/** 生成兜底朋友圈文案（日期替换） */
function makeMoments() {
  const dateLabel = prevCloseLabel()
  return {
    title: fbMoments.title,
    scene: fbMoments.scene,
    body: fbMoments.body.replace(/#\{date\}/g, dateLabel),
    itemKey: 'moments'
  }
}

/** 生成兜底话术（日期替换） */
function makeFallbackScripts() {
  const dateLabel = prevCloseLabel()
  return fbScripts.map(s => ({
    title: s.title,
    scene: s.scene,
    body: s.body
  }))
}

const emotionCard = reactive({
  loading: false,
  elapsed: 0,
  strategy: '',
  label: '',
  hint: '',
  dot: '',
  promptVersion: 'default',
  error: ''
})

const loading = ref(false)
const elapsed = ref(0)
const failed = ref(false)
const live = ref(false)
const promptVersion = ref('default')
const scripts = ref(makeFallbackScripts())
const momentsCard = ref(makeMoments())

let scriptTimer = null
let emotionTimer = null

onUnmounted(() => {
  if (scriptTimer) clearInterval(scriptTimer)
  if (emotionTimer) clearInterval(emotionTimer)
})

/** 生成市场情绪分析 */
function generateEmotion() {
  if (emotionCard.loading) return
  emotionCard.loading = true
  emotionCard.elapsed = 0
  emotionCard.error = ''

  if (emotionTimer) clearInterval(emotionTimer)
  emotionTimer = setInterval(() => {
    emotionCard.elapsed++
  }, 1000)

  api.marketBriefEmotion()
    .then(res => {
      if (!res || res.ok !== true || !res.emotion) {
        throw new Error('生成失败')
      }
      // 后端返回: { emotion: { level, label, hint }, strategy }
      const emo = res.emotion
      const lvl = emo.level || 'neutral'
      emotionCard.strategy = res.strategy || ''
      emotionCard.label = emo.label || '市场情绪中性'
      emotionCard.hint = emo.hint || ''
      // level 映射: greedy→偏暖(warm), fearful→偏冷(cool), neutral→中性
      emotionCard.dot =
        lvl === 'warm' || lvl === 'greedy' ? 'dot-up' :
        lvl === 'cool' || lvl === 'fearful' ? 'dot-down' : 'dot-neutral'
      emotionCard.promptVersion = res.promptVersion || 'default'
    })
    .catch(() => {
      emotionCard.error = '⚠️ 生成失败，请检查网络后重试'
    })
    .finally(() => {
      if (emotionTimer) clearInterval(emotionTimer)
      emotionCard.loading = false
    })
}

/** 生成今日话术 */
function generateScripts() {
  if (loading.value) return
  loading.value = true
  elapsed.value = 0
  failed.value = false

  if (scriptTimer) clearInterval(scriptTimer)
  scriptTimer = setInterval(() => {
    elapsed.value++
  }, 1000)

  api.dailyScripts()
    .then(res => {
      if (!res || res.ok !== true || !res.ai || !res.ai.scripts || !res.ai.scripts.length) {
        throw new Error('暂无生成结果')
      }
      const momentsText = res.ai.moments || ''
      live.value = true
      failed.value = false
      promptVersion.value = res.promptVersion || 'default'
      scripts.value = res.ai.scripts.map((s, i) => ({
        title: s.title || '',
        scene: s.scene || '',
        body: s.body || '',
        itemKey: `script_${i}`
      }))
      momentsCard.value = momentsText
        ? { title: '朋友圈文案', scene: '', body: momentsText, itemKey: 'moments' }
        : makeMoments()
    })
    .catch(err => {
      failed.value = true
      showToast((err.message || '生成失败') + '，已保留示例话术', 'none')
    })
    .finally(() => {
      if (scriptTimer) clearInterval(scriptTimer)
      loading.value = false
    })
}
</script>

<style scoped>
.macro-block { margin-bottom: 20px; }

.macro-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.macro-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.macro-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
  line-height: 1.5;
}

/* 情绪卡片 */
.emotion-card {
  padding: 16px;
}

.me-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.me-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.me-dot.dot-up { background: var(--danger); box-shadow: 0 0 8px rgba(244, 63, 94, 0.4); }
.me-dot.dot-down { background: var(--success); box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }
.me-dot.dot-neutral { background: var(--text-tertiary); }

.me-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.me-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
}

.emotion-divider {
  height: 1px;
  background: var(--border);
  margin: 10px 0;
}

.emotion-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 6px;
}

.emotion-strategy {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
}

.macro-fb {
  margin-top: 8px;
  border-top: 1px solid var(--border);
  padding-top: 4px;
}

.macro-error {
  padding: 12px 16px;
  color: var(--danger);
  font-size: 13px;
  text-align: center;
}

/* 话术区 */
.tt-zone { margin-bottom: 8px; }

.tt-card { margin-bottom: 10px; }
.tt-card:last-child { margin-bottom: 0; }

.static-zone { margin-top: 4px; }

.tt-fail {
  padding: 10px 14px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-md);
  color: var(--warning);
  font-size: 12px;
  margin-bottom: 10px;
}

.live-zone { margin-top: 4px; }

/* ==================== 响应式 ==================== */
@media (max-width: 360px) {
  .macro-title { font-size: 14px; }
  .macro-desc { font-size: 11px; }
  .emotion-card { padding: 12px; }
  .me-label { font-size: 13px; }
  .tt-fail { font-size: 11px; padding: 8px 10px; }
}

@media (min-width: 414px) {
  .macro-title { font-size: 17px; }
  .emotion-card { padding: 18px; }
}

@media (min-width: 768px) {
  .macro-block { margin-bottom: 24px; }
  .emotion-card { padding: 20px; }
  .macro-title { font-size: 18px; }
}
</style>

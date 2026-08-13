<template>
  <div class="wrap">
    <!-- 标题 -->
    <div class="sec-title"><span class="sec-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="5.5" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg></span> 话术生成器</div>
    <div class="sec-desc">
      选择渠道、环节和客户画像标签，一键生成针对性沟通话术及经营策略
    </div>

    <!-- ① 沟通渠道 -->
    <div class="step-section">
      <div class="step-head">
        <div class="step-label">① 沟通渠道<span class="step-tag">单选</span></div>
      </div>
      <div class="chip-row">
        <div
          v-for="scene in scenes"
          :key="scene.id"
          class="chip"
          :class="{ on: selectedScene === scene.id }"
          @click="selectScene(scene.id)"
        >
          <span class="chip-icon">{{ scene.icon }}</span>
          <span>{{ scene.name }}</span>
        </div>
      </div>
      <div v-if="selectedScene" class="step-hint">{{ sceneHint }}</div>
    </div>

    <div v-if="selectedScene" class="divider"></div>

    <!-- ② 沟通环节 -->
    <div v-if="selectedScene" class="step-section">
      <div class="step-head">
        <div class="step-label">② 沟通环节<span class="step-tag">单选</span></div>
      </div>
      <div class="stage-grid">
        <div
          v-for="stage in stages"
          :key="stage.id"
          class="stage-card"
          :class="{ on: selectedStage === stage.id }"
          @click="selectStage(stage.id)"
        >
          <div class="stage-name">{{ stage.name }}</div>
        </div>
      </div>
      <div v-if="selectedStage" class="stage-greet-hint">{{ stageGreetHint }}</div>
    </div>

    <div v-if="selectedScene || hasPreselect" class="divider"></div>

    <!-- ③ 客户画像标签 -->
    <div v-if="selectedStage || hasPreselect" class="step-section">
      <div class="step-head">
        <div class="step-label">
          ③ 客户画像标签
          <span class="step-tag">最多选6个</span>
          <span class="tag-counter" :class="{ full: selectedTags.length >= 6 }">
            {{ selectedTags.length }} / 6
          </span>
        </div>
      </div>
      <div class="tag-groups">
        <div
          v-for="cat in tagCats"
          :key="cat.id"
          class="tag-group"
        >
          <div class="tag-group-head" @click="toggleGroup(cat.id)">
            <span class="tg-icon">{{ cat.icon }}</span>
            <span class="tg-name">{{ cat.name }}</span>
            <span class="tg-desc">{{ cat.desc }}</span>
            <span class="tg-count">{{ getCatCount(cat.id) }}个</span>
            <span class="tg-arrow" :class="{ open: openGroups[cat.id] }">›</span>
          </div>
          <div v-if="openGroups[cat.id]" class="tag-group-body">
            <div
              v-for="tag in getCatTags(cat.id)"
              :key="tag.id"
              class="tag-chip"
              :class="{
                on: selectedTags.includes(tag.id),
                disabled: !selectedTags.includes(tag.id) && selectedTags.length >= 6
              }"
              @click="toggleTag(tag.id)"
            >
              {{ tag.name }}
            </div>
          </div>
        </div>
      </div>
      <!-- 已选标签预览 -->
      <div v-if="selectedTags.length" class="selected-preview">
        <span class="sp-label">已选：</span>
        <span
          v-for="id in selectedTags"
          :key="id"
          class="sp-chip"
          @click="toggleTag(id)"
        >
          {{ getTagName(id) }} ✕
        </span>
      </div>
    </div>

    <div v-if="selectedStage" class="divider"></div>

    <!-- ④ 客户情况 -->
    <div v-if="selectedStage" class="step-section">
      <div class="step-head">
        <div class="step-label">④ 客户情况<span class="step-tag optional">选填</span></div>
      </div>
      <textarea
        v-model="context"
        class="context-input"
        rows="3"
        placeholder="客户说了什么？有什么顾虑？资金情况如何？沟通目的是什么？越具体话术越精准…"
      ></textarea>
      <div class="compliance-tip">⚠️ 请勿输入具体基金产品名称、代码或基金经理姓名，合规拦截将阻止生成</div>
    </div>

    <!-- 生成按钮 -->
    <div v-if="canGenerate" class="gen-btn-wrap">
      <button
        class="gen-btn"
        :class="{ loading }"
        :disabled="loading"
        @click="generate"
      >
        {{ loading ? `⏳ 生成中 ${elapsed}s` : '✨ 生成对客话术' }}
      </button>
    </div>

    <!-- 加载骨架 -->
    <div v-if="loading" class="sk-loading card">
      <div class="sk-bar" style="margin-top: 0;"></div>
      <div class="sk-bar" style="width: 85%;"></div>
      <div class="sk-bar" style="width: 70%;"></div>
      <div class="sk-bar" style="width: 90%;"></div>
      <div class="sk-bar" style="width: 60%;"></div>
    </div>

    <!-- 生成结果 -->
    <div v-if="result" class="result-zone">
      <!-- 话术正文 -->
      <div class="result-card card">
        <div class="rc-head">
          <span class="rc-icon">📝</span>
          <span>对客话术</span>
          <span v-if="result.source" class="rc-source">{{ result.source }}</span>
        </div>
        <div class="rc-body">{{ result.script }}</div>
        <div v-if="result.matchInfo" class="rc-match">{{ result.matchInfo }}</div>
      </div>

      <!-- 经营策略 -->
      <div v-if="result.strategies.length" class="result-card card">
        <div class="rc-head">
          <span class="rc-icon">💡</span>
          <span>经营策略</span>
        </div>
        <div class="strategy-list">
          <div
            v-for="(s, i) in result.strategies"
            :key="'s' + i"
            class="strategy-item"
          >
            <span class="strategy-tag">{{ s.tag }}</span>
            <span class="strategy-text">{{ s.text }}</span>
          </div>
        </div>
      </div>

      <!-- 禁忌提醒 -->
      <div v-if="result.taboos.length" class="result-card card taboo-card">
        <div class="rc-head">
          <span class="rc-icon">🚫</span>
          <span>禁忌提醒</span>
        </div>
        <div class="taboo-list">
          <div
            v-for="(t, i) in result.taboos"
            :key="'t' + i"
            class="taboo-item"
          >
            <span class="taboo-tag">{{ t.tag }}</span>
            <span class="taboo-text">{{ t.text }}</span>
          </div>
        </div>
      </div>

      <!-- 参考话术库 -->
      <div v-if="result.library.length" class="result-card card">
        <div class="rc-head">
          <span class="rc-icon">📚</span>
          <span>参考话术</span>
        </div>
        <div class="library-list">
          <div
            v-for="(lib, i) in result.library"
            :key="'l' + i"
            class="library-item"
          >
            <div class="lib-title">{{ lib.title }}</div>
            <div class="lib-body">{{ lib.body }}</div>
          </div>
        </div>
      </div>

      <!-- 手册引用（RAG） -->
      <div v-if="result.sources && result.sources.length" class="result-card card source-card">
        <div class="rc-head">
          <span class="rc-icon">📖</span>
          <span>手册引用</span>
          <span class="rc-source">RAG 检索</span>
        </div>
        <div class="source-list">
          <div
            v-for="(src, i) in result.sources"
            :key="'src' + i"
            class="source-item"
          >
            <div class="source-title-row">
              <span class="source-title">{{ src.title }}</span>
              <span class="source-score">相关度 {{ src.score }}</span>
            </div>
            <div class="source-snippet">{{ src.snippet }}</div>
          </div>
        </div>
      </div>

      <!-- 重新生成 -->
      <div class="regen-btn" @click="result = null">↻ 重新选择</div>
    </div>

    <!-- 弹窗 -->
    <div v-if="modal.show" class="modal-mask" @click="closeModal">
      <div class="modal-box" @click.stop>
        <div class="modal-icon">{{ modal.icon }}</div>
        <div class="modal-title">{{ modal.title }}</div>
        <div class="modal-text">{{ modal.body }}</div>
        <div class="modal-action" @click="closeModal">知道了</div>
      </div>
    </div>

    <!-- 合规提示 -->
    <ComplianceCard :items="generatorCompliance" />

    <!-- 页脚 -->
    <SiteFooter :f2="footer.f2" :disclaimer="footer.disclaimer" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import api from '../api/index.js'
import { generatorCompliance, footer } from '../data/fallback.js'
import { TAG_CATS, byId, byCat, names as tagNames } from '../data/tags.js'
import {
  SCENES, STAGES, OBJECTIONS, LIBRARY,
  localGen, buildStrategy, matchLibrary,
  detectFundProduct, sceneAdvice, stageAdvice
} from '../data/generator.js'
import { showToast } from '../utils/format.js'
import bus from '../utils/bus.js'
import ComplianceCard from '../components/ComplianceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'

// ==================== 数据 ====================

const scenes = SCENES
const stages = STAGES
const tagCats = TAG_CATS

// ==================== 状态 ====================

const selectedScene = ref('')
const selectedStage = ref('')
const selectedTags = ref([])
const context = ref('')
const openGroups = reactive({})
const hasPreselect = ref(false)  // 从五维评分带入标签时置 true

const loading = ref(false)
const elapsed = ref(0)
const result = ref(null)

const modal = reactive({
  show: false,
  icon: '',
  title: '',
  body: ''
})

let timer = null

onMounted(() => {
  // 从五维评分跳转过来时，通过 bus 读取预选标签（读取即删、5分钟过期）
  let preselectIds = bus.take('preselectProfiles')
  // HMR 兜底：直接从 window 读取（防止 bus 模块多实例）
  if (!preselectIds && window.__BUS_STORE__) {
    const entry = window.__BUS_STORE__.get('preselectProfiles')
    if (entry) {
      window.__BUS_STORE__.delete('preselectProfiles')
      preselectIds = entry.payload
    }
  }
  if (preselectIds && Array.isArray(preselectIds) && preselectIds.length) {
    selectedTags.value = preselectIds.slice(0, 6)
    hasPreselect.value = true
    // 自动展开包含预选标签的分组，方便用户看到已选标签
    preselectIds.forEach(id => {
      const tag = byId(id)
      if (tag) openGroups[tag.cat] = true
    })
    showToast(`已从评分卡带入 ${selectedTags.value.length} 个标签`, 'success')
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// ==================== 计算属性 ====================

const canGenerate = computed(() =>
  selectedScene.value && selectedStage.value && !loading.value
)

const sceneHint = computed(() =>
  selectedScene.value ? sceneAdvice(selectedScene.value) : ''
)

const stageGreetHint = computed(() =>
  selectedStage.value ? stageAdvice(selectedStage.value) : ''
)

// ==================== 交互逻辑 ====================

function selectScene(id) {
  selectedScene.value = id
}

function selectStage(id) {
  selectedStage.value = id
}

function toggleGroup(catId) {
  openGroups[catId] = !openGroups[catId]
}

function toggleTag(tagId) {
  const idx = selectedTags.value.indexOf(tagId)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    if (selectedTags.value.length >= 6) {
      showModal('⚠️', '最多选择6个标签', '已选满6个标签，如需调整请先取消已选标签')
      return
    }
    selectedTags.value.push(tagId)
  }
}

function getCatTags(catId) {
  return byCat(catId)
}

function getCatCount(catId) {
  return byCat(catId).length
}

function getTagName(id) {
  const t = byId(id)
  return t ? t.name : id
}

function closeModal() {
  modal.show = false
}

function showModal(icon, title, body) {
  modal.icon = icon
  modal.title = title
  modal.body = body
  modal.show = true
}

// ==================== 生成 ====================

function generate() {
  if (loading.value) return
  if (!selectedScene.value || !selectedStage.value) return

  // 合规检测：客户情况中是否包含产品名称
  if (context.value) {
    const detected = detectFundProduct(context.value)
    if (detected) {
      showModal(
        '🚫',
        '检测到产品信息',
        `输入内容中检测到${detected}，为合规起见，请移除具体产品信息后重试。话术生成器不对客推荐具体产品。`
      )
      return
    }
  }

  // 至少选一个标签或填客户情况
  if (selectedTags.value.length === 0 && !context.value.trim()) {
    showModal(
      '💡',
      '请补充信息',
      '请至少选择一个客户画像标签，或填写客户情况描述，以便生成更有针对性的话术。'
    )
    return
  }

  loading.value = true
  elapsed.value = 0

  if (timer) clearInterval(timer)
  timer = setInterval(() => { elapsed.value++ }, 1000)

  // 先尝试 API，失败则降级到本地生成
  api.generateScript({
    stage: selectedStage.value,
    scene: selectedScene.value,
    tags: selectedTags.value,
    context: context.value
  })
    .then(res => {
      if (res && res.ok === true && res.script) {
        // API 返回可能包含 sources（RAG 检索结果）
        const apiData = {
          script: typeof res.script === 'string' ? res.script : (res.script.body || res.script.script || ''),
          matchInfo: res.matchInfo || '',
          sources: res.sources || []
        }
        buildResult(apiData, 'AI 生成')
      } else if (res && res.err === 'product-blocked') {
        // 后端合规拦截
        showModal('🚫', '检测到产品信息', res.suggestion || '输入内容中检测到产品信息，请移除后重试。')
      } else {
        throw new Error('API 返回异常')
      }
    })
    .catch(() => {
      // 降级到本地生成引擎
      const local = localGen({
        stageId: selectedStage.value,
        sceneId: selectedScene.value,
        tagIds: selectedTags.value,
        context: context.value
      })
      buildResult(local, '本地引擎')
    })
    .finally(() => {
      if (timer) clearInterval(timer)
      loading.value = false
    })
}

/** 构建结果对象 */
function buildResult(data, source) {
  // 兼容 API 返回的 script 字符串 / 对象，以及本地引擎返回的结构
  let script = ''
  let matchInfo = ''
  let sources = []

  if (typeof data === 'string') {
    script = data
  } else if (data && typeof data === 'object') {
    script = data.script || data.body || ''
    matchInfo = data.matchInfo || ''
    sources = data.sources || []
  }

  // 如果没有 matchInfo（API 路径），补充标签信息
  if (!matchInfo && selectedTags.value.length > 0) {
    const tagNames = selectedTags.value.map(id => {
      const t = byId(id)
      return t ? t.name : id
    })
    matchInfo = `画像标签：${tagNames.join('、')}（${selectedTags.value.length}个）`
  }

  // 构建策略与禁忌
  const { strategies, taboos } = buildStrategy(selectedTags.value)

  // 匹配话术库
  const library = matchLibrary(selectedStage.value, selectedScene.value)

  result.value = {
    script,
    matchInfo,
    strategies,
    taboos,
    library,
    sources,
    source
  }

  // 滚动到结果
  nextTick(() => {
    const el = document.querySelector('.result-zone')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<style scoped>
/* ==================== 标题 ==================== */
.sec-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.sec-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
  line-height: 1.5;
}

/* ==================== 步骤区 ==================== */
.step-section {
  margin-bottom: 4px;
}

.step-head {
  margin-bottom: 10px;
}

.step-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.step-tag {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: var(--bg-secondary, #f1f5f9);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.step-tag.optional {
  color: var(--success);
  background: rgba(16, 185, 129, 0.1);
}

.tag-counter {
  margin-left: auto;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  padding: 2px 10px;
  border-radius: var(--radius-sm);
  background: rgba(26, 54, 93, 0.08);
}

.tag-counter.full {
  color: var(--danger);
  background: rgba(244, 63, 94, 0.08);
}

.step-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
  line-height: 1.5;
  padding: 6px 10px;
  background: rgba(26, 54, 93, 0.04);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary);
}

.divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
  opacity: 0.6;
}

/* ==================== 渠道选择 ==================== */
.chip-row {
  display: flex;
  gap: 8px;
}

.chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

.chip:active {
  transform: scale(0.97);
}

.chip.on {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.08), rgba(44, 82, 130, 0.08));
  box-shadow: 0 2px 12px rgba(26, 54, 93, 0.15);
  color: var(--primary);
  font-weight: 600;
}

.chip-icon {
  font-size: 20px;
}

/* ==================== 环节选择 ==================== */
.stage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stage-card {
  padding: 14px 10px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.stage-card:active {
  transform: scale(0.97);
}

.stage-card.on {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.08), rgba(44, 82, 130, 0.08));
  box-shadow: 0 2px 12px rgba(26, 54, 93, 0.15);
}

.stage-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.stage-card.on .stage-name {
  color: var(--primary);
}

.stage-greet-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
  line-height: 1.5;
  padding: 6px 10px;
  background: rgba(26, 54, 93, 0.04);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--primary);
}

/* ==================== 标签组 ==================== */
.tag-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-group {
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--card-bg);
  overflow: hidden;
}

.tag-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.tag-group-head:active {
  background: rgba(0, 0, 0, 0.02);
}

.tg-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.tg-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}

.tg-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tg-count {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.tg-arrow {
  font-size: 18px;
  color: var(--text-tertiary);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.tg-arrow.open {
  transform: rotate(90deg);
}

.tag-group-body {
  padding: 4px 14px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-secondary, #f8fafc);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.tag-chip:active {
  transform: scale(0.95);
}

.tag-chip.on {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
  font-weight: 500;
}

.tag-chip.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 已选预览 */
.selected-preview {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.sp-label {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.sp-chip {
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background: var(--primary);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.sp-chip:active {
  opacity: 0.7;
}

/* ==================== 客户情况 ==================== */
.context-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--card-bg);
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
  resize: vertical;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.context-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(26, 54, 93, 0.1);
}

.context-input::placeholder {
  color: var(--text-tertiary);
}

.compliance-tip {
  font-size: 11px;
  color: var(--warning, #f59e0b);
  margin-top: 6px;
  line-height: 1.5;
}

/* ==================== 生成按钮 ==================== */
.gen-btn-wrap {
  margin-top: 16px;
  margin-bottom: 16px;
}

.gen-btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gen-btn:active:not(.loading) {
  transform: scale(0.98);
}

.gen-btn.loading {
  opacity: 0.8;
  cursor: not-allowed;
}

/* ==================== 骨架屏 ==================== */
.sk-loading {
  padding: 16px;
  margin-bottom: 16px;
}

.sk-bar {
  height: 12px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--border) 25%, var(--bg-secondary, #f1f5f9) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-top: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ==================== 结果区 ==================== */
.result-zone {
  margin-top: 4px;
  animation: fadeUp 0.4s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.result-card {
  padding: 16px;
  margin-bottom: 10px;
}

.rc-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.rc-icon {
  font-size: 16px;
}

.rc-source {
  margin-left: auto;
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: var(--bg-secondary, #f1f5f9);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.rc-body {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.8;
  white-space: pre-wrap;
}

.rc-match {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 策略 */
.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strategy-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.strategy-tag {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: rgba(26, 54, 93, 0.08);
  color: var(--primary);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.strategy-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 禁忌 */
.taboo-card {
  border-color: rgba(244, 63, 94, 0.2);
}

.taboo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.taboo-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.taboo-tag {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: rgba(244, 63, 94, 0.08);
  color: var(--danger);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.taboo-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 话术库 */
.library-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.library-item {
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--bg-secondary, #f8fafc);
}

.lib-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.lib-body {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
}

/* 重新生成 */
.regen-btn {
  text-align: center;
  padding: 12px;
  font-size: 13px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.2s;
}

.regen-btn:active {
  color: var(--primary);
}

/* 手册引用 */
.source-card {
  border-color: rgba(16, 185, 129, 0.2);
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.source-item {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgba(16, 185, 129, 0.04);
  border-left: 3px solid rgba(16, 185, 129, 0.4);
}

.source-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.source-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--success);
}

.source-score {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-tertiary);
  background: var(--bg-secondary, #f1f5f9);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.source-snippet {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

/* ==================== 弹窗 ==================== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-box {
  width: 80%;
  max-width: 320px;
  background: var(--card-bg, #fff);
  border-radius: var(--radius-lg, 16px);
  padding: 24px 20px 20px;
  text-align: center;
  animation: popIn 0.25s ease;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}

.modal-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.modal-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.modal-action {
  padding: 10px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.modal-action:active {
  transform: scale(0.97);
}

/* ==================== 响应式 ==================== */
@media (max-width: 360px) {
  .chip { padding: 10px 4px; font-size: 12px; }
  .chip-icon { font-size: 18px; }
  .stage-grid { grid-template-columns: 1fr; gap: 6px; }
  .stage-card { padding: 10px 8px; }
  .stage-name { font-size: 12px; }
  .tag-chip { font-size: 11px; padding: 5px 8px; }
  .tag-group-head { padding: 10px 10px; }
  .tg-name { font-size: 12px; }
  .tg-desc { font-size: 10px; }
  .sp-chip { font-size: 10px; padding: 3px 6px; }
  .gen-btn { height: 40px; font-size: 14px; }
  .rc-body { font-size: 12px; line-height: 1.7; }
  .result-card { padding: 14px 12px; }
  .context-input { font-size: 12px; }
}

@media (min-width: 414px) {
  .chip { padding: 16px 10px; }
  .stage-card { padding: 16px 12px; }
  .tag-chip { font-size: 13px; padding: 7px 12px; }
  .rc-body { font-size: 14px; }
}

@media (min-width: 768px) {
  .stage-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .chip:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(26, 54, 93, 0.12); }
  .stage-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(26, 54, 93, 0.12); }
  .tag-chip:hover { transform: translateY(-1px); }
  .tag-group-head:hover { background: rgba(26, 54, 93, 0.03); }
  .gen-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(26, 54, 93, 0.25); }
  .result-card { padding: 20px; }
  .rc-body { font-size: 14px; line-height: 2; }
}
</style>

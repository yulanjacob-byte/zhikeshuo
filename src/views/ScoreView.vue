<template>
  <div class="wrap">
    <!-- 标题区 -->
    <div class="sec-title"><span class="sec-icon"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.5 L14.8 8.5 L21.5 9.5 L16.5 14 L17.8 21 L12 17.5 L6.2 21 L7.5 14 L2.5 9.5 L9.2 8.5 Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/></svg></span> 客户五维评分卡</div>
    <div class="sec-desc">
      首次接触后逐项点选打分，自动输出客户解读、经营建议与生成器标签推荐
    </div>

    <!-- 五维评分 -->
    <div
      v-for="(dim, di) in dims"
      :key="dim.key"
      class="dim-row"
    >
      <div class="dim-name">{{ dim.name }}</div>
      <div class="dim-opts">
        <div
          v-for="(opt, oi) in dim.opts"
          :key="opt.score"
          class="dim-opt"
          :class="{ on: opt.on }"
          @click="selectOpt(di, oi)"
        >
          <div class="opt-score">{{ opt.score }}分</div>
          <div class="opt-label">{{ opt.label }}</div>
        </div>
      </div>
      <div v-if="di < dims.length - 1" class="divider-light"></div>
    </div>

    <!-- 评分结果 -->
    <div v-if="result.show" class="score-result" id="scoreResult" ref="resultEl">
      <div class="sr-block">
        <div class="sr-total">总分：{{ result.total }} / 25</div>
        <div class="sr-tier">{{ result.tier }}</div>
        <div class="sr-advice">{{ result.advice }}</div>
        <div class="sr-tags">{{ result.tagText }}</div>
        <div class="go-gen-btn" @click="goGenerator">✨ 带这些标签去话术生成器</div>
      </div>
    </div>

    <!-- 合规提示 -->
    <ComplianceCard :items="scoreCompliance" />

    <!-- 页脚 -->
    <SiteFooter :f2="footer.f2" :disclaimer="footer.disclaimer" />
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { scoreCompliance, footer } from '../data/fallback.js'
import { NAME_MAP as TAG_NAME_MAP } from '../data/tags.js'
import bus from '../utils/bus.js'
import ComplianceCard from '../components/ComplianceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'

const router = useRouter()

// ==================== 五维定义 ====================

const DIMS = [
  {
    key: 'cognition',
    name: '① 投资认知',
    opts: ['没买过基金', '买过但亏过', '懂基金', '有组合概念', '懂资产配置']
  },
  {
    key: 'risk',
    name: '② 风险接受',
    opts: ['不能亏', '亏一点就焦虑', '接受小波动', '接受阶段回撤', '接受长期波动']
  },
  {
    key: 'trust',
    name: '③ 信任程度',
    opts: ['怀疑银行', '观望试探', '愿意交流', '主动咨询', '全权托付']
  },
  {
    key: 'fund',
    name: '④ 资金实力',
    opts: ['5万以内', '5-50万', '50-300万', '300-1000万', '1000万以上']
  },
  {
    key: 'need',
    name: '⑤ 需求紧迫度',
    opts: ['无明确需求', '有想法无计划', '有明确用途', '近期要安排', '正在寻找方案']
  }
]

// ==================== 标签规则 ====================
// 根据各维度得分高低推荐话术生成器标签
// 标签 ID 对应 GeneratorView 中的标签列表

const TAG_RULES = {
  cognition: {
    low:  ['p21', 'p56'],   // 低分：新手/亏过 → 保守/安抚类标签
    high: ['p34', 'p95']    // 高分：懂配置 → 进阶/配置类标签
  },
  risk: {
    low:  ['p36', 'p37'],   // 低分：不能亏 → 稳健/保本类标签
    high: ['p39', 'p55']    // 高分：接受波动 → 权益/成长类标签
  },
  trust: {
    low:  ['p64'],          // 低分：怀疑 → 信任建立类标签
    high: ['p91', 'p99']    // 高分：全权托付 → 深度服务类标签
  },
  fund: {
    low:  ['p02', 'p03'],   // 低分：小额 → 小额起步类标签
    mid:  ['p04'],          // 中分：中等 → 稳健配置类标签
    high: ['p11', 'p01']    // 高分：大额 → 高净值类标签
  },
  need: {
    low:  ['p85'],          // 低分：无需求 → 需求挖掘类标签
    high: ['p71', 'p77']    // 高分：急迫 → 方案推进类标签
  }
}

// 标签 ID → 名称映射：直接引用 tags.js 的 NAME_MAP，保持与话术生成器一致

// ==================== 分档规则 ====================

const TIERS = [
  {
    max: 9,
    tier: '🌱 保守培育型',
    advice: '先建立信任与认知，不急着谈投资。从货币基金、短债等低波体验开始，用陪伴和小额体验逐步培养。'
  },
  {
    max: 14,
    tier: '🛡️ 稳健转化型',
    advice: '有安全意识也有转化空间。以固收+、低波组合切入，先建立收益体验，再谈资产升级。'
  },
  {
    max: 19,
    tier: '⚖️ 均衡配置型',
    advice: '认知与资金都具备条件。适合做三层组合规划：现金储备 + 稳健底仓 + 长期权益，强调纪律与定期检视。'
  },
  {
    max: 25,
    tier: '💎 成熟财富型',
    advice: '高价值客户。以家庭资产配置为单位沟通，提供组合诊断、再平衡与季度检视服务，值得投入最多服务资源。'
  }
]

// ==================== 状态 ====================

const resultEl = ref(null)

const dims = reactive(
  DIMS.map(dim => ({
    key: dim.key,
    name: dim.name,
    opts: dim.opts.map((label, i) => ({
      score: i + 1,
      label,
      on: false
    }))
  }))
)

let selected = {} // { cognition: 3, risk: 2, ... }

const result = reactive({
  show: false,
  total: 0,
  tier: '',
  advice: '',
  tagText: '',
  tagIds: []
})

// ==================== 交互逻辑 ====================

/** 点击某个选项 */
function selectOpt(dimIndex, optIndex) {
  const dim = dims[dimIndex]
  // 更新选中状态：单选
  dim.opts.forEach((opt, i) => {
    opt.on = i === optIndex
  })
  selected[dim.key] = optIndex + 1

  // 5 项全选后自动计算结果
  if (Object.keys(selected).length === 5) {
    calcResult()
  }
}

/** 计算评分结果 */
function calcResult() {
  const keys = ['cognition', 'risk', 'trust', 'fund', 'need']

  // 总分
  let total = 0
  keys.forEach(k => { total += selected[k] })

  // 分档
  let tierData = TIERS[TIERS.length - 1]
  for (const t of TIERS) {
    if (total <= t.max) {
      tierData = t
      break
    }
  }

  // 标签推荐
  const tagIds = []
  const pushTags = (ids) => {
    ids.forEach(id => {
      if (tagIds.indexOf(id) < 0 && tagIds.length < 6) {
        tagIds.push(id)
      }
    })
  }

  if (selected.cognition <= 2) pushTags(TAG_RULES.cognition.low)
  if (selected.cognition >= 4) pushTags(TAG_RULES.cognition.high)
  if (selected.risk <= 2) pushTags(TAG_RULES.risk.low)
  if (selected.risk >= 4) pushTags(TAG_RULES.risk.high)
  if (selected.trust <= 2) pushTags(TAG_RULES.trust.low)
  if (selected.trust >= 4) pushTags(TAG_RULES.trust.high)
  if (selected.fund <= 2) pushTags(TAG_RULES.fund.low)
  else if (selected.fund === 3) pushTags(TAG_RULES.fund.mid)
  else pushTags(TAG_RULES.fund.high)
  if (selected.need <= 2) pushTags(TAG_RULES.need.low)
  if (selected.need >= 4) pushTags(TAG_RULES.need.high)

  const tagText = tagIds.length
    ? '🏷️ 推荐画像标签：' + tagIds.map(id => TAG_NAME_MAP[id] || id).join('、')
    : '🏷️ 该客户标签特征不明显，可到生成器按沟通场景自选标签'

  // 更新结果
  result.show = true
  result.total = total
  result.tier = `${tierData.tier}（${total}分）`
  result.advice = `💡 经营建议：${tierData.advice}`
  result.tagText = tagText
  result.tagIds = tagIds

  // 滚动到结果区
  nextTick(() => {
    if (resultEl.value) {
      resultEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

/** 跳转到话术生成器，携带预选标签 */
function goGenerator() {
  // 通过 bus 传递预选标签（内存存储、读取即删、5分钟过期）
  const tagIds = result.tagIds.slice(0, 6)
  bus.set('preselectProfiles', tagIds)
  router.push('/generator')
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

/* ==================== 维度行 ==================== */
.dim-row {
  margin-bottom: 4px;
}

.dim-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.dim-opts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* 最后一个选项（5分）占满整行 */
.dim-opts .dim-opt:last-child {
  grid-column: 1 / -1;
}

.dim-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.dim-opt:active {
  transform: scale(0.97);
}

.dim-opt.on {
  border-color: var(--primary);
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.08), rgba(44, 82, 130, 0.08));
  box-shadow: 0 2px 12px rgba(26, 54, 93, 0.15);
}

.opt-score {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-tertiary);
  transition: color 0.2s;
}

.dim-opt.on .opt-score {
  color: var(--primary);
}

.opt-label {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  transition: color 0.2s;
}

.dim-opt.on .opt-label {
  color: var(--text-primary);
  font-weight: 500;
}

.divider-light {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
  opacity: 0.6;
}

/* ==================== 评分结果 ==================== */
.score-result {
  margin-top: 20px;
  animation: fadeUp 0.4s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.sr-block {
  background: linear-gradient(135deg, rgba(26, 54, 93, 0.06), rgba(44, 82, 130, 0.06));
  border: 1px solid rgba(26, 54, 93, 0.15);
  border-radius: var(--radius-lg);
  padding: 20px 16px;
}

.sr-total {
  font-size: 28px;
  font-weight: 800;
  color: var(--primary);
  text-align: center;
  margin-bottom: 8px;
}

.sr-tier {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 12px;
}

.sr-advice {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
  margin-bottom: 12px;
}

.sr-tags {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.go-gen-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary), var(--primary-light));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.go-gen-btn:active {
  transform: scale(0.97);
}

/* ==================== 响应式 ==================== */
@media (max-width: 360px) {
  .dim-opts {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .dim-opts .dim-opt:last-child {
    grid-column: auto;
  }
  .dim-opt { padding: 10px 6px; }
  .opt-score { font-size: 14px; }
  .opt-label { font-size: 11px; }
  .sr-total { font-size: 24px; }
  .sr-tier { font-size: 14px; }
  .sr-advice { font-size: 12px; }
  .go-gen-btn { font-size: 13px; padding: 10px; }
}

@media (min-width: 414px) {
  .dim-opt { padding: 14px 10px; }
  .opt-score { font-size: 18px; }
  .opt-label { font-size: 13px; }
  .sr-total { font-size: 32px; }
}

@media (min-width: 768px) {
  .dim-opts {
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
  }
  .dim-opts .dim-opt:last-child {
    grid-column: auto;
  }
  .dim-opt:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(26, 54, 93, 0.12); }
  .sr-block { padding: 28px 20px; }
  .sr-total { font-size: 36px; }
  .go-gen-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(26, 54, 93, 0.2); }
}
</style>

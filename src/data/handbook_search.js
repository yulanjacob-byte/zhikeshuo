/**
 * 手册 RAG 检索模块
 * 从《银行理财经理基金客户经营与销售实战手册》知识库中检索相关段落
 * 返回格式与原网站一致：{ title: "手册第 X 页", snippet: "...", score: N }
 */

import kb from './handbook_kb.json'

const { chunks, pages } = kb

// ==================== 关键词提取 ====================

/**
 * 从查询文本中提取有意义的关键词
 * 中文不做分词，用 2-4 字滑窗提取子串
 * @param {string} text 查询文本
 * @returns {string[]} 关键词数组（去重）
 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') return []
  const cleaned = text.replace(/[\s\n\r，。！？、；：""''（）()\[\]{}/<>@#\$%\^&\*\+=]/g, '')
  const keywords = new Set()

  // 2字滑窗
  for (let i = 0; i < cleaned.length - 1; i++) {
    keywords.add(cleaned.substring(i, i + 2))
  }
  // 3字滑窗（权重更高）
  for (let i = 0; i < cleaned.length - 2; i++) {
    keywords.add(cleaned.substring(i, i + 3))
  }
  // 4字滑窗（权重最高）
  for (let i = 0; i < cleaned.length - 3; i++) {
    keywords.add(cleaned.substring(i, i + 4))
  }

  return Array.from(keywords)
}

// ==================== 评分 ====================

/**
 * 计算单个 chunk 的匹配分数
 * @param {string} chunkText chunk 文本
 * @param {string[]} keywords 关键词数组
 * @returns {number} 匹配分数
 */
function scoreChunk(chunkText, keywords) {
  if (!chunkText || keywords.length === 0) return 0

  let score = 0
  for (const kw of keywords) {
    if (chunkText.includes(kw)) {
      // 长关键词权重更高
      score += kw.length === 4 ? 4 : kw.length === 3 ? 3 : kw.length === 2 ? 1.5 : 1
    }
  }
  return score
}

// ==================== 检索主函数 ====================

/**
 * 检索手册中与查询相关的段落
 * @param {string} query 查询文本（标签名 + 客户情况）
 * @param {Object} options
 * @param {number} options.topK 返回结果数，默认 3
 * @param {number} options.minScore 最低分数阈值，默认 2
 * @returns {Array<{title: string, snippet: string, score: number, page: number}>}
 */
export function searchHandbook(query, options = {}) {
  const topK = options.topK || 3
  const minScore = options.minScore || 2

  if (!query || typeof query !== 'string') return []

  const keywords = extractKeywords(query)
  if (keywords.length === 0) return []

  // 对每个 chunk 评分
  const scored = chunks.map(chunk => ({
    page: chunk.page,
    text: chunk.text,
    score: scoreChunk(chunk.text, keywords)
  }))

  // 过滤低分
  const filtered = scored.filter(s => s.score >= minScore)

  // 按页聚合：同一页取最高分的 chunk
  const pageMap = new Map()
  for (const s of filtered) {
    const existing = pageMap.get(s.page)
    if (!existing || s.score > existing.score) {
      pageMap.set(s.page, s)
    }
  }

  // 排序并取 topK
  const results = Array.from(pageMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  // 格式化输出
  return results.map(r => ({
    title: `手册第 ${r.page} 页`,
    snippet: truncate(r.text, 120),
    score: Math.round(r.score),
    page: r.page
  }))
}

/**
 * 根据标签和客户情况构建检索查询
 * @param {string[]} tagNames 标签名称数组
 * @param {string} context 客户情况描述
 * @param {string} stageId 沟通环节ID
 * @returns {string} 组合查询字符串
 */
export function buildSearchQuery(tagNames = [], context = '', stageId = '') {
  const parts = []

  // 标签名是高权重关键词
  if (Array.isArray(tagNames)) {
    parts.push(tagNames.join(' '))
  }

  // 客户情况
  if (context) {
    parts.push(context)
  }

  // 环节关键词
  const stageKeywords = {
    first: '首次接触 破冰 建立信任 了解需求',
    reject: '拒绝处理 异议 应对 顾虑 化解',
    close: '成交推进 促成 签约 确认',
    after: '售后 回访 检视 跟进 陪伴'
  }
  if (stageKeywords[stageId]) {
    parts.push(stageKeywords[stageId])
  }

  return parts.join(' ')
}

// ==================== 工具函数 ====================

function truncate(text, maxLen) {
  if (!text) return ''
  // 清理多余空白
  const cleaned = text.replace(/\n{2,}/g, '\n').trim()
  if (cleaned.length <= maxLen) return cleaned
  return cleaned.substring(0, maxLen) + '...'
}

// ==================== 统计信息 ====================

export function getKbStats() {
  return {
    title: kb.title,
    totalPages: kb.totalPages,
    totalChunks: kb.totalChunks
  }
}

export default {
  searchHandbook,
  buildSearchQuery,
  getKbStats
}

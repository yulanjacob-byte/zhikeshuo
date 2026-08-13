/**
 * 格式化工具函数
 */

/** 格式化价格：保留两位小数，加千分位 */
export function fmtPrice(price) {
  if (price == null || isNaN(price)) return '--'
  return Number(price).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** 格式化涨跌幅：返回带符号的百分比字符串 */
export function fmtPct(pct) {
  if (pct == null || isNaN(pct)) return '--'
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

/** 根据涨跌幅返回方向 class */
export function dirClass(pct) {
  if (pct == null || isNaN(pct)) return 'dir-flat'
  if (pct > 0) return 'dir-up'
  if (pct < 0) return 'dir-down'
  return 'dir-flat'
}

/** 根据涨跌幅返回箭头符号 */
export function dirArrow(pct) {
  if (pct == null || isNaN(pct)) return ''
  if (pct > 0) return '▲'
  if (pct < 0) return '▼'
  return '—'
}

/** 复制文本到剪贴板 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  }
}

/** 轻提示 toast */
export function showToast(title, icon = 'none', duration = 2000) {
  const existing = document.querySelector('.app-toast')
  if (existing) existing.remove()

  const el = document.createElement('div')
  el.className = 'app-toast'
  const iconMap = { none: '', success: '✅', error: '❌', loading: '⏳' }
  el.innerHTML = `<span class="toast-icon">${iconMap[icon] || ''}</span><span>${title}</span>`
  document.body.appendChild(el)

  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, duration)
}

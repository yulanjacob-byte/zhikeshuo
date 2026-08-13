/**
 * 轻量跨页面通信模块
 * 模拟原站 bus 模块：内存存储、读一次即删、5分钟过期
 *
 * 用法：
 *   bus.set('key', payload)          // 存入数据
 *   const data = bus.take('key')     // 读取并删除（过期返回 null）
 *   bus.peek('key')                  // 只读不删（调试用）
 */

// 挂载到 window 上，确保 Vite HMR 不会产生多实例
const store = (window.__BUS_STORE__ = window.__BUS_STORE__ || new Map())

const DEFAULT_EXPIRY = 5 * 60 * 1000 // 5 分钟

/**
 * 存入数据
 * @param {string} key
 * @param {*} payload - 任意可序列化数据
 * @param {number} [expiry=300000] - 过期毫秒数，默认5分钟
 */
function set(key, payload, expiry = DEFAULT_EXPIRY) {
  store.set(key, {
    payload,
    ts: Date.now(),
    expiry
  })
}

/**
 * 读取数据并删除（一次性读取）
 * @param {string} key
 * @returns {*} payload 或 null（不存在/已过期）
 */
function take(key) {
  const entry = store.get(key)
  if (!entry) return null

  store.delete(key)

  if (Date.now() - entry.ts > entry.expiry) {
    return null
  }

  return entry.payload
}

/**
 * 只读不删（调试用）
 * @param {string} key
 * @returns {*} payload 或 null
 */
function peek(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > entry.expiry) {
    store.delete(key)
    return null
  }
  return entry.payload
}

/** 清空所有缓存 */
function clear() {
  store.clear()
}

export default { set, take, peek, clear }
export { set, take, peek, clear }

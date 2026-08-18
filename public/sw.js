// 空的 Service Worker —— 仅用于替代旧 PWA SW，使其自动注销
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', async () => {
  // 清除所有缓存
  const keys = await caches.keys()
  await Promise.all(keys.map(k => caches.delete(k)))
  // 注销自己
  await self.registration.unregister()
  // 刷新所有客户端
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(c => c.navigate(c.url))
})

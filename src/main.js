import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './styles/main.css'

// 注销旧的 PWA Service Worker，清除浏览器缓存
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      console.log('[PWA] 注销旧 Service Worker:', reg.scope)
      reg.unregister()
    })
  })
  // 清除所有缓存
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        console.log('[PWA] 清除缓存:', name)
        caches.delete(name)
      })
    })
  }
}

createApp(App).use(router).mount('#app')

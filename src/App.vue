<template>
  <div class="app-shell">
    <!-- 顶部头部 -->
    <header class="page-header">
      <div class="ph-left">
        <div class="ph-logo">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- K线柱 -->
            <rect x="5" y="15" width="3" height="8" rx="0.5" stroke="#1a365d" stroke-width="1.5" fill="none"/>
            <line x1="6.5" y1="12" x2="6.5" y2="15" stroke="#1a365d" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="6.5" y1="23" x2="6.5" y2="26" stroke="#1a365d" stroke-width="1.5" stroke-linecap="round"/>
            <rect x="12" y="11" width="3" height="10" rx="0.5" stroke="#1a365d" stroke-width="1.5" fill="none"/>
            <line x1="13.5" y1="8" x2="13.5" y2="11" stroke="#1a365d" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="13.5" y1="21" x2="13.5" y2="24" stroke="#1a365d" stroke-width="1.5" stroke-linecap="round"/>
            <rect x="19" y="7" width="3" height="12" rx="0.5" stroke="#1a365d" stroke-width="1.5" fill="#1a365d" fill-opacity="0.08"/>
            <line x1="20.5" y1="4" x2="20.5" y2="7" stroke="#1a365d" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="20.5" y1="19" x2="20.5" y2="22" stroke="#1a365d" stroke-width="1.5" stroke-linecap="round"/>
            <!-- 对话气泡 -->
            <path d="M22 22 C22 20 24 19 26 19 C28 19 29.5 20 29.5 22 C29.5 24 28 25 26 25 L24.5 25 L23.5 26.5 L23.5 25 C22.5 24.5 22 23.5 22 22 Z" stroke="#1a365d" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="ph-title">知市达客</div>
          <div class="ph-sub">知市场，懂客户，善沟通</div>
        </div>
      </div>
      <div class="ph-date">
        <div class="ph-d1">{{ dateStr.day }}</div>
        <div class="ph-d2">{{ dateStr.weekday }} · {{ dateStr.year }}</div>
      </div>
    </header>

    <!-- 路由出口 -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- 底部导航 -->
    <nav class="tabbar">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        class="tb-item"
        :class="{ active: currentTab === tab.key }"
        @click="navigate(tab.path)"
      >
        <div class="tb-icon" v-html="tab.icon"></div>
        <div class="tb-text">{{ tab.label }}</div>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'market', path: '/market', label: '市场速递', icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="13" width="4" height="8" rx="1" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="10" y="9" width="4" height="12" rx="1" stroke="currentColor" stroke-width="1.8" fill="none"/><rect x="17" y="5" width="4" height="16" rx="1" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>` },
  { key: 'score', path: '/score', label: '五维评分', icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.5 L14.8 8.5 L21.5 9.5 L16.5 14 L17.8 21 L12 17.5 L6.2 21 L7.5 14 L2.5 9.5 L9.2 8.5 Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/></svg>` },
  { key: 'daily', path: '/daily', label: '今日话术', icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5 C4 3.9 4.9 3 6 3 L18 3 C19.1 3 20 3.9 20 5 L20 14 C20 15.1 19.1 16 18 16 L9 16 L5 19.5 L5 16 C4.4 16 4 15.1 4 14 Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" fill="none"/><circle cx="8.5" cy="9.5" r="1" fill="currentColor"/><circle cx="12" cy="9.5" r="1" fill="currentColor"/><circle cx="15.5" cy="9.5" r="1" fill="currentColor"/></svg>` },
  { key: 'generator', path: '/generator', label: '话术生成器', icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9.5" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="5.5" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>` }
]

const currentTab = computed(() => route.meta.tab || 'daily')

const dateStr = computed(() => {
  const d = new Date()
  const beijing = new Date(d.getTime() + 8 * 3600 * 1000)
  const month = beijing.getUTCMonth() + 1
  const day = beijing.getUTCDate()
  const year = beijing.getUTCFullYear()
  const dow = beijing.getUTCDay()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return {
    day: `${month}月${day}日`,
    weekday: weekdays[dow],
    year
  }
})

function navigate(path) {
  if (route.path !== path) router.push(path)
}
</script>

<style scoped>
.app-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
</style>

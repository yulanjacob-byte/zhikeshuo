import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/market' },
  {
    path: '/daily',
    name: 'daily',
    component: () => import('./views/DailyView.vue'),
    meta: { title: '今日话术', tab: 'daily' }
  },
  {
    path: '/market',
    name: 'market',
    component: () => import('./views/MarketView.vue'),
    meta: { title: '市场速递', tab: 'market' }
  },
  {
    path: '/score',
    name: 'score',
    component: () => import('./views/ScoreView.vue'),
    meta: { title: '五维评分', tab: 'score' }
  },
  {
    path: '/generator',
    name: 'generator',
    component: () => import('./views/GeneratorView.vue'),
    meta: { title: '话术生成器', tab: 'generator' }
  },
  {
    path: '/indexDetail',
    name: 'indexDetail',
    component: () => import('./views/IndexDetailView.vue'),
    meta: { title: '指数详情' }
  },
  {
    path: '/indexAll',
    name: 'indexAll',
    component: () => import('./views/IndexAllView.vue'),
    meta: { title: '指数行情' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 知市达客` : '知市达客'
})

export default router

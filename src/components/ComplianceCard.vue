<template>
  <div class="comp-card card">
    <div class="cc-title">合规使用与风险提示：</div>
    <div v-for="(item, i) in items" :key="i" class="cc-item">
      <span class="cc-num">{{ i + 1 }}.</span>
      <span class="cc-text">{{ item }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.comp-card {
  padding: 14px 16px;
  margin-top: 16px;
  border-left: 3px solid var(--warning);
}

.cc-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--warning);
  margin-bottom: 8px;
}

.cc-item {
  display: flex;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 4px;
}

.cc-num {
  color: var(--warning);
  font-weight: 600;
  flex-shrink: 0;
}

.cc-text { flex: 1; }
</style>

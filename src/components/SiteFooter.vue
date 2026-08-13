<template>
  <div class="about">
    <div v-if="f1" class="f1">{{ f1 }}</div>
    <div class="f2">{{ f2 }}</div>
    <div v-if="disclaimer" class="f-disc">{{ disclaimer }}</div>
  </div>
</template>

<script setup>
defineProps({
  f1: { type: String, default: '' },
  f2: { type: String, default: '基金有风险，投资须谨慎' },
  f3: { type: String, default: '' },
  disclaimer: { type: String, default: '' }
})
</script>

<style scoped>
.about {
  margin-top: 20px;
  padding: 0 4px 12px;
  text-align: center;
}

.f1 {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.f2 {
  font-size: 13px;
  font-weight: 600;
  color: var(--danger);
  margin-bottom: 8px;
}

.f-disc {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.6;
  text-align: justify;
}
</style>

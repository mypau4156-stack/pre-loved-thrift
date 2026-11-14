<template>
  <section id="deals" class="section deals-section">
    <div class="wrap">
      <div class="deals-embed">
        <div class="elfsight-app-15d91cb3-4f95-4672-b363-d872ff7c35ec" data-elfsight-app-lazy></div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineEmits<{ (event: 'navigate', id: string): void }>()
</script>

<style scoped>
.deals-section { overflow: hidden; }
.deals-embed { width: 100%; }
.deals-embed :deep(.elfsight-app),
.deals-embed :deep(.elfsight-app *) { max-width: 100%; }
</style>

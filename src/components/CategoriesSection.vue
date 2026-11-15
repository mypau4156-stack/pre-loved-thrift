<template>
 <section id="shop" class="section"><div class="wrap">
 <div class="sec-head"><h2>Shop by Category</h2><a class="link" href="#shop" @click.prevent="emit('navigate', '')">View All Categories →</a></div>
 <div class="row"><button v-for="c in categoryCards" :key="c.key" type="button" class="category-card"
 :style="{ background: `linear-gradient(#fff0 30%, ${c.bg})`, borderColor: c.bg }" @click="emit('navigate', c.name)">
 <img :src="c.img" :alt="c.name" /><h3>{{ c.name }}</h3><span>{{ c.count }}</span></button></div>
 </div></section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { categories, getStorefrontCategory, type Product } from '../data/mockData'

const props = defineProps<{ products: Product[] }>()
const emit = defineEmits<{ (e: 'navigate', category: string): void }>()
const categoryCards = computed(() => {
  return categories.map(category => ({
    ...category,
    key: category.name.toLowerCase(),
    count: `${props.products.filter(product => getStorefrontCategory(product.cat) === category.name).length} items`
  }))
})
</script>
<style scoped>
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 20px; }
.category-card { border: 1px solid; border-radius: 26px; padding: 18px 18px 22px; text-align: center; cursor: pointer; display: flex; flex-direction: column; color: var(--ink); font: inherit; }
.category-card img { width: 100%; aspect-ratio: 1 / 1; object-fit: contain; object-position: center; background: #f8f1ee; border-radius: 20px; display: block; padding: 18px; }
h3 { font-size: 16px; margin: 14px 0 4px; } span { font-size: 13px; color: var(--muted); }
</style>

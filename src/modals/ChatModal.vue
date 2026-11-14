<template>
  <ion-modal :is-open="open" class="chat-modal" @didDismiss="$emit('close')">
    <div class="chat">
      <header>
        <img src="/assets/logo-emblem.png" alt="Pre-Loved Thrift logo" />
        <div><b>Pre-Loved Assistant</b><small>Your shopping assistant</small></div>
        <button aria-label="Close" @click="$emit('close')"><ion-icon :icon="closeOutline" /></button>
      </header>
      <div class="msgs" ref="box" aria-live="polite">
        <div v-for="(m, i) in msgs" :key="i" :class="['m', m.from]">{{ m.text }}</div>
        <div v-if="typing" class="m bot dots"><i /><i /><i /></div>
      </div>
      <div class="chips"><button v-for="c in chips" :key="c" @click="send(c)">{{ c }}</button></div>
      <form @submit.prevent="send(text)">
        <input v-model="text" placeholder="Ask about the shop or your order" aria-label="Message" />
        <button class="go" aria-label="Send"><ion-icon :icon="sendIcon" /></button>
      </form>
    </div>
  </ion-modal>
</template>
<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { IonModal, IonIcon } from '@ionic/vue'
import { closeOutline, send as sendIcon } from 'ionicons/icons'
defineProps<{ open: boolean }>()
defineEmits<{ (e: 'close'): void }>()
const msgs = ref([{ from: 'bot', text: 'Hi! Welcome to Pre-Loved Thrift. I can help you browse clothing and accessories, use the Outfit Builder, manage your account, or get help with an order. What would you like to know?' }])
const chips = ['What can I shop?', 'How does the Outfit Builder work?', 'How do I manage my account?']
const text = ref(''); const typing = ref(false); const box = ref<HTMLElement>()

function reply(q: string) {
  const s = q.toLowerCase().replace(/[’']/g, '')
  if (/^(hi|hello|hey)\b/.test(s)) {
    return 'Hello! I can help you browse products, manage your account, use the Outfit Builder, find deals, or get help with an order.'
  }
  if (/what can i (shop|buy)|what do you (sell|have)|products|clothes|browse|shop by category/.test(s)) {
    return 'Browse the shop for dresses, tops, denim, shoes, and other curated thrift finds. Use the category cards to explore, or tap Search thrift finds in the header to look for an item.'
  }
  if (/how.*(order|buy|checkout)|place an order|purchase/.test(s)) {
    return 'To order, create or sign in to a buyer account, browse the shop, and add items to your cart. Review your items and checkout from the cart. You can later view order details and status under My orders in your account.'
  }
  if (/account|sign.?up|sign.?in|log.?in|register|create.*account|google/.test(s)) {
    return 'Tap the account icon in the header to sign in or create a buyer account. You can use email and password or continue with Google. Your buyer dashboard includes your orders, wishlist, reviews, and profile.'
  }
  if (/cart|add.*item|remove.*item|checkout/.test(s)) {
    return 'Tap Add to cart on an item to save it for checkout. Open the bag icon in the header to review your cart, change selections, remove items, and continue to checkout.'
  }
  if (/wishlist|favorite|save.*item|heart/.test(s)) {
    return 'Sign in, then tap the heart on a product to save it. Open the heart icon or choose Wishlist in your buyer dashboard to see your saved finds.'
  }
  if (/outfit|stylist|builder|wear together/.test(s)) {
    return 'Open Outfit Builder from the storefront navigation. Add clothing pieces to your cart, then choose a character and drag or tap items from your cart to style an outfit.'
  }
  if (/deal|discount|sale|promo|offer/.test(s)) {
    return 'Visit the Deals section on the storefront to see current offers. You can also browse categories and new arrivals for more finds.'
  }
  if (/review|rate.*item|rating/.test(s)) {
    return 'After an eligible order, open My orders in your buyer dashboard and choose Rate item to leave a review.'
  }
  if (/seller|sell.*item|seller account/.test(s)) {
    return 'Sellers can use the Seller option in the account sign-in window to access the seller area and manage listings and orders.'
  }
  if (/rider|delivery rider/.test(s)) {
    return 'Delivery riders can choose Delivery rider in the account sign-in window to access their assigned deliveries.'
  }
  if (/shipping|delivery fee|shipping fee/.test(s)) {
    return 'Shipping is ₱261, and it’s free when your order subtotal is over ₱2,900.'
  }
  if (/payment|gcash|cash on delivery|\bcod\b|card/.test(s)) {
    return 'Checkout offers GCash and cash on delivery. For GCash, scan the shop QR and upload your receipt; the seller verifies the transfer manually. Card payments are demo-only and are not charged.'
  }
  if (/track|status|where.*order|my order/.test(s)) {
    return 'Sign in and open My orders in your buyer dashboard to view order details and tracking status.'
  }
  if (/return|refund/.test(s)) {
    return 'The storefront lists a 7-day return window. Sign in and open My orders to message the seller about a specific order or return.'
  }
  if (/size|sizing|fit/.test(s)) {
    return 'Available sizes depend on the item. Clothing uses letter sizes, while shoes use EU sizes. Open the product or cart item to see its size options.'
  }
  if (/contact|support|help/.test(s)) {
    return 'Buyers can message the seller from an order in My orders. Assigned riders can message the seller from the relevant delivery in the Rider Portal. Replies appear in the same conversation.'
  }
  if (/category|categories|dress|denim|jean|shoe|bag|accessor|product/.test(s)) {
    return 'Browse the storefront’s categories for dresses, tops, denim, shoes, and accessories, or use Search thrift finds in the header to find a particular item.'
  }
  return 'I can help you browse products, use your cart or wishlist, create an account, style an outfit, find deals, and manage orders. What would you like help with?'
}
async function send(t: string) {
  const q = t.trim(); if (!q || typing.value) return
  msgs.value.push({ from: 'me', text: q }); text.value = ''; typing.value = true
  await nextTick(); box.value?.scrollTo({ top: box.value.scrollHeight, behavior: 'smooth' })
  setTimeout(async () => {
    typing.value = false; msgs.value.push({ from: 'bot', text: reply(q) })
    await nextTick(); box.value?.scrollTo({ top: box.value.scrollHeight, behavior: 'smooth' })
  }, 400)
}
</script>
<style>
ion-modal.chat-modal { --width: min(420px, 94vw); --height: min(620px, 90vh); --border-radius: 26px; --box-shadow: 0 30px 70px rgba(60,20,20,.3); }
.chat { display: flex; flex-direction: column; height: 100%; background: var(--cream); }
.chat header { display: flex; align-items: center; gap: 12px; padding: 16px 18px; background: linear-gradient(135deg, #e47a7a, #c45f5f); color: #fff; }
.chat header img { width: 40px; height: 40px; border-radius: 50%; background: #fbf9f6; object-fit: cover; }
.chat header div { flex: 1; display: flex; flex-direction: column; } .chat header small { opacity: .85; font-size: 12px; }
.chat header button { background: #fff3; border: 0; color: #fff; border-radius: 50%; width: 34px; height: 34px; cursor: pointer; }
.chat .msgs { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.chat .m { max-width: 82%; padding: 11px 15px; border-radius: 18px; font-size: 14px; line-height: 1.5; }
.chat .bot { background: #fff; border: 1px solid #f0e6e0; border-bottom-left-radius: 4px; align-self: flex-start; }
.chat .me { background: var(--coral); color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }
.chat .dots { display: flex; gap: 4px; } .chat .dots i { width: 7px; height: 7px; border-radius: 50%; background: #cdb9b0; animation: pl-bounce 1s infinite; }
.chat .dots i:nth-child(2) { animation-delay: .15s; } .chat .dots i:nth-child(3) { animation-delay: .3s; }
@keyframes pl-bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
.chat .chips { display: flex; gap: 8px; padding: 0 18px 10px; flex-wrap: wrap; }
.chat .chips button { border: 1px solid #eadfd8; background: #fff; border-radius: 999px; padding: 7px 13px; font: 600 12px var(--font-body); cursor: pointer; color: var(--coral-dark); }
.chat form { display: flex; gap: 10px; padding: 12px 16px 16px; border-top: 1px solid #eee3dc; background: #fff; }
.chat form input { flex: 1; border: 1.5px solid #eadfd8; border-radius: 999px; padding: 12px 16px; font: 14px var(--font-body); outline: none; background: var(--cream); }
.chat form input:focus { border-color: var(--coral); }
.chat .go { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--coral); color: #fff; cursor: pointer; font-size: 18px; }
</style>
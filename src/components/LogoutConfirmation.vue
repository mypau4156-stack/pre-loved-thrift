<template>
  <div v-if="open" class="logout-backdrop" role="presentation" @click.self="$emit('cancel')">
    <section class="logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description">
      <div class="logout-sign"><ion-icon :icon="logOutOutline" /></div>
      <span class="logout-eyebrow">YOUR {{ accountType.toUpperCase() }} SESSION</span>
      <h2 id="logout-title">Leaving your {{ accountType === 'seller' ? 'shop' : 'account' }}?</h2>
      <p id="logout-description">Are you sure you want to log out of your {{ accountType }} account?</p>
      <div class="logout-actions">
        <button type="button" class="logout-cancel" @click="$emit('cancel')">Stay here</button>
        <button type="button" class="logout-confirm" @click="$emit('confirm')">
          <ion-icon :icon="logOutOutline" /> Log out
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { logOutOutline } from 'ionicons/icons'

defineProps<{
  open: boolean
  accountType: 'buyer' | 'seller' | 'rider'
}>()

defineEmits<{
  (event: 'cancel'): void
  (event: 'confirm'): void
}>()
</script>

<style scoped>
.logout-backdrop { position: fixed; inset: 0; z-index: 1101; display: grid; place-items: center; padding: 20px; background: rgba(48, 36, 34, .52); backdrop-filter: blur(5px); }
.logout-dialog { position: relative; box-sizing: border-box; width: min(100%, 430px); padding: 28px; overflow: hidden; border: 1px solid #fff; border-radius: 26px; background: linear-gradient(160deg, #fffaf7 0%, #fff 62%); box-shadow: 0 24px 70px rgba(52, 33, 29, .28); animation: logout-dialog-in .24s ease-out; }
.logout-dialog::before { position: absolute; inset: 0 0 auto; height: 6px; background: linear-gradient(90deg, #e9947e, #d86464, #e8ad74); content: ''; }
.logout-sign { width: 58px; height: 58px; margin-bottom: 15px; display: grid; place-items: center; border: 1px solid #f4d0c6; border-radius: 19px; background: linear-gradient(145deg, #fff0eb, #ffe2d8); color: #c85f56; box-shadow: 0 8px 18px rgba(200, 95, 86, .13); }
.logout-sign ion-icon { font-size: 29px; }
.logout-eyebrow { color: #b2786b; font-size: 9px; font-weight: 800; letter-spacing: .16em; }
.logout-dialog h2 { margin: 6px 0 7px; color: #493832; font: 700 25px/1.2 var(--font-head); }
.logout-dialog p { margin: 0; color: #85736d; font-size: 12px; line-height: 1.6; }
.logout-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 22px; }
.logout-actions button { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 17px; border-radius: 999px; cursor: pointer; font: 700 11px var(--font-body); }
.logout-cancel { border: 1px solid #eadbd4; background: #fff; color: #806d65; }
.logout-confirm { border: 1px solid #cf625b; background: linear-gradient(135deg, #df7970, #c95c59); color: #fff; box-shadow: 0 7px 15px rgba(201, 92, 89, .22); }
@keyframes logout-dialog-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (max-width: 600px) {
  .logout-dialog { padding: 24px 19px 19px; border-radius: 22px; }
  .logout-dialog h2 { font-size: 22px; }
  .logout-actions button { flex: 1; }
}
</style>

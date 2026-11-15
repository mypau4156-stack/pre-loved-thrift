<template>
  <ion-modal :is-open="open" class="store-chat-modal" @didDismiss="$emit('close')">
    <section class="store-chat" aria-label="Message the seller">
      <header class="store-chat-header">
        <img class="store-chat-logo" src="/assets/logo-emblem.png" alt="Pre-Loved Thrift logo" />
        <div><b>{{ sellerName }}</b></div>
        <button type="button" aria-label="Close chat" @click="$emit('close')"><ion-icon :icon="closeOutline" /></button>
      </header>

      <div v-if="!user" class="store-chat-login">
        <b>Sign in to message the seller</b>
        <p>Your conversation will stay available in the storefront chat.</p>
        <button type="button" @click="$emit('login')">Sign in</button>
      </div>
      <div v-else-if="user.role !== 'buyer'" class="store-chat-login">
        <b>This chat is for buyers</b>
        <p>Riders can message the seller from their assigned delivery.</p>
      </div>
      <template v-else>
        <div ref="messageBox" class="store-chat-messages" aria-live="polite">
          <p v-if="loading && !messages.length" class="store-chat-hint">Opening your conversation…</p>
          <div v-else-if="error" class="store-chat-setup-error" role="alert">
            <b>Chat is unavailable</b>
            <p>{{ error }}</p>
          </div>
          <p v-else-if="!messages.length && !error" class="store-chat-hint">Send a message to start a conversation with the seller.</p>
          <article v-for="message in messages" :key="message.id" class="store-chat-message" :class="{ own: message.senderRole === 'buyer' }">
            <small>{{ message.senderRole === 'buyer' ? 'You' : sellerName }} · {{ formatTime(message.sentAt) }}</small>
            <p>{{ message.text }}</p>
          </article>
        </div>
        <form class="store-chat-form" @submit.prevent="send">
          <input v-model="draft" maxlength="500" :disabled="loading || sending || !conversationId"
            placeholder="Message the seller…" aria-label="Message the seller" />
          <button type="submit" :disabled="!draft.trim() || loading || sending || !conversationId" aria-label="Send message">
            <ion-icon :icon="sendOutline" />
          </button>
        </form>
      </template>
    </section>
  </ion-modal>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { IonIcon, IonModal } from '@ionic/vue'
import { chatbubbleEllipsesOutline, closeOutline, sendOutline } from 'ionicons/icons'
import { listStoreChatMessages, openStoreChat, sendStoreChatMessage, type StoreChatMessage } from '../services/storeChat'
import { supabase } from '../utils/supabase'
import type { AppUser } from '../types/database'

const props = defineProps<{ open: boolean; user: AppUser | null }>()
defineEmits<{ (event: 'close'): void; (event: 'login'): void }>()

const sellerName = ref('Shop seller')
const conversationId = ref('')
const messages = ref<StoreChatMessage[]>([])
const draft = ref('')
const error = ref('')
const loading = ref(false)
const sending = ref(false)
const messageBox = ref<HTMLElement | null>(null)
let channel: ReturnType<NonNullable<typeof supabase>['channel']> | undefined
let loadToken = 0

watch(() => [props.open, props.user?.id, props.user?.role] as const, async ([isOpen, userId, role]) => {
  loadToken += 1
  const token = loadToken
  stopSubscription()
  conversationId.value = ''
  messages.value = []
  error.value = ''
  if (!isOpen || !userId || role !== 'buyer') return

  loading.value = true
  try {
    const conversation = await openStoreChat()
    if (token !== loadToken) return
    conversationId.value = conversation.conversationId
    sellerName.value = conversation.sellerName
    await refreshMessages(token)
    if (token === loadToken) subscribeToMessages(conversation.conversationId, token)
  } catch (reason) {
    if (token === loadToken) error.value = reason instanceof Error ? reason.message : 'Unable to open the seller chat.'
  } finally {
    if (token === loadToken) loading.value = false
  }
}, { immediate: true })

async function refreshMessages(token: number) {
  if (!conversationId.value) return
  const next = await listStoreChatMessages(conversationId.value)
  if (token !== loadToken) return
  messages.value = next
  await nextTick()
  messageBox.value?.scrollTo({ top: messageBox.value.scrollHeight, behavior: 'smooth' })
}

function subscribeToMessages(id: string, token: number) {
  if (!supabase) return
  channel = supabase.channel(`store-chat-${id}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'buyer_seller_messages',
      filter: `conversation_id=eq.${id}`
    }, () => {
      void refreshMessages(token).catch(reason => {
        if (token === loadToken) error.value = reason instanceof Error ? reason.message : 'Unable to refresh messages.'
      })
    })
    .subscribe()
}

function stopSubscription() {
  if (channel && supabase) void supabase.removeChannel(channel)
  channel = undefined
}

async function send() {
  const text = draft.value.trim()
  const user = props.user
  if (!text || !user || user.role !== 'buyer' || !conversationId.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    await sendStoreChatMessage(conversationId.value, user.id, 'buyer', text)
    draft.value = ''
    await refreshMessages(loadToken)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Unable to send your message.'
  } finally {
    sending.value = false
  }
}

function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

onUnmounted(stopSubscription)
</script>

<style>
ion-modal.store-chat-modal { --width: min(420px, 94vw); --height: min(620px, 88vh); --border-radius: 22px; }
.store-chat { display: flex; flex-direction: column; height: 100%; background: #fbf9f6; }
.store-chat-header { min-height: 70px; padding: 12px 16px; display: flex; align-items: center; gap: 11px; background: linear-gradient(135deg, #e47a7a, #c45f5f); color: #fff; }
.store-chat-logo { width: 48px; height: 48px; flex: 0 0 48px; border: 2px solid #ffffffa8; border-radius: 50%; background: #fbf9f6; object-fit: cover; object-position: center 26%; }
.store-chat-header > div { flex: 1; display: grid; gap: 3px; }
.store-chat-header small { font-size: 11px; opacity: .85; }
.store-chat-header button { width: 34px; height: 34px; border: 0; border-radius: 50%; background: #ffffff33; color: #fff; font-size: 20px; cursor: pointer; }
.store-chat-login { flex: 1; padding: 28px; display: grid; align-content: center; justify-items: center; gap: 10px; text-align: center; }
.store-chat-login p, .store-chat-hint { color: #8d7b74; font-size: 12px; line-height: 1.5; text-align: center; }
.store-chat-login button { padding: 11px 20px; border: 0; border-radius: 10px; background: #c45f5f; color: #fff; font-weight: 700; cursor: pointer; }
.store-chat-messages { flex: 1; min-height: 0; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 9px; }
.store-chat-setup-error { max-width: 100%; margin: auto; padding: 18px; border: 1px solid #f0c9c4; border-radius: 14px; background: #fff; text-align: center; }
.store-chat-setup-error b { color: #8d3935; font-size: 14px; }
.store-chat-setup-error p { margin: 8px 0 0; color: #765b55; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.store-chat-message { width: fit-content; max-width: 84%; padding: 9px 12px; border-radius: 13px 13px 13px 3px; background: #fff; border: 1px solid #f0e6e0; }
.store-chat-message.own { align-self: flex-end; border-radius: 13px 13px 3px 13px; background: #f9e2df; border-color: #f4d5d0; }
.store-chat-message small { color: #927d75; font-size: 9px; }
.store-chat-message p { margin: 4px 0 0; color: #493832; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.store-chat-form { padding: 12px; display: flex; gap: 9px; border-top: 1px solid #eee3dc; background: #fff; }
.store-chat-form input { min-width: 0; min-height: 42px; flex: 1; padding: 0 12px; border: 1px solid #eadfd9; border-radius: 11px; outline: none; font: 13px var(--font-body); }
.store-chat-form button { width: 42px; height: 42px; display: grid; place-items: center; border: 0; border-radius: 11px; background: #c45f5f; color: #fff; font-size: 18px; cursor: pointer; }
.store-chat-form button:disabled { opacity: .5; cursor: not-allowed; }
</style>

<template>
  <ion-page>
    <ion-content :fullscreen="true">
        <div v-if="!isSupabaseConfigured" class="config-warning" role="alert">
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code>, then restart the dev server.
        </div>
        <div v-if="!dashboardOpen && !sellerOpen && !riderOpen && !cartOpen" class="store-announcements">
          <div class="elfsight-app-dd1fc735-75ea-4ab8-b6f1-67d55ec594d5" data-elfsight-app-lazy></div>
        </div>
        <AppHeader v-if="!sellerOpen && !riderOpen" :user="user" :wish-count="wished.length" :cart-count="cartItemCount"
          :search-open="searchOpen" :profile-open="dashboardOpen || authOpen" :dashboard-mode="dashboardOpen"
        @open-auth="authOpen = true" @open-user="openCustomerDashboard('overview')"
        @open-seller-center="openSellerAuth" @logout="confirmBuyerLogout"
        @open-search="searchOpen = true" @open-chat="chatOpen = true"
        @open-wish="wishOpen = true" @open-cart="cartOpen = true"
        @navigate="handleHeaderNavigation" />
      <div v-if="!dashboardOpen && !sellerOpen && !riderOpen" class="storefront">
        <HeroSection />
        <CategoriesSection @navigate="handleCategoryNavigation" />
        <ProductsSection :wished="wishedIds" @toggle-wish="toggleWish" @add-cart="addToCart" @navigate="handleCategoryNavigation" />
        <OutfitBuilder :cart="cart" :products="dashboardProducts" @need-login="needLogin" @outfit-checkout="onOutfitCheckout" />
        <DealsSection @navigate="handleHeaderNavigation" />
        <section id="spin-wheel" class="section">
          <div class="wrap">
            <div class="elfsight-app-0564ad1b-442e-457b-8ecb-2d3a12f9b703" data-elfsight-app-lazy></div>
          </div>
        </section>
        <AppFooter />
      </div>
      <UserDashboard v-if="user" :key="dashboardView" v-show="dashboardOpen" :user="user" :wishlist="wished" :cart-count="cartItemCount"
        :orders="orders" :products="dashboardProducts" :categories="categories" :initial-view="dashboardView"
        @storefront="dashboardOpen = false"
        @add-cart="dashboardAddToCart" @buy-again="buyAgain" @toggle-wish="dashboardToggleWish"
        @update-user="onProfileUpdate" @message="addOrderMessage" @message-seller="sellerChatOpen = true" />
      <SellerDashboard v-if="sellerUser && sellerOpen" :user="sellerUser" :orders="sellerOrders" :riders="registeredRiders"
        @logout="logout" @profile-update="onSellerProfileUpdate"
        @status-change="updateSellerOrderStatus" @rider-change="updateSellerOrderRider" @message="addOrderMessage" />
      <RiderDashboard v-if="riderUser && riderOpen" :rider="riderUser" :orders="sellerOrders"
        @storefront="returnToStorefront" @logout="confirmRiderLogout"
        @profile-update="updateRiderProfile"
        @order-update="updateDeliveryOrder" @message="addOrderMessage" />
    </ion-content>

    <AuthModal :open="authOpen" @close="closeAuth" @auth="onAuth" @seller-login="openSellerAuth" @rider-login="riderAuthOpen = true" />
    <SellerAuthModal :open="sellerAuthOpen" @close="onSellerAuthDismiss" @back="backToAuthSelection" @auth="onSellerAuth" />
    <RiderAuthModal :open="riderAuthOpen" @close="onRiderAuthDismiss" @back="backToAuthSelection" @auth="onRiderAuth" />
    <SearchModal :open="searchOpen" @close="searchOpen = false" />
    <ChatModal :open="chatOpen" @close="chatOpen = false" />
    <StorefrontSellerChat :open="sellerChatOpen" :user="user" @close="sellerChatOpen = false" @login="authOpen = true" />
    <CartModal :open="cartOpen" :items="cart" :user="user" :checkout-loading="checkoutLoading" @close="cartOpen = false"
      @open-dashboard="dashboardOpen = true; cartOpen = false"
      @remove="confirmRemoveCart" @checkout="checkoutCart" @edit="editCart"
      @toggle="toggleCartSelect" @toggle-all="toggleCartAll" @quantity="changeCartQuantity" />
    <WishlistModal :open="wishOpen" :items="wished" @close="wishOpen = false"
      @remove="confirmRemoveWish" @add-cart="moveToCart" />
    <LogoutConfirmation :open="logoutRole !== null" :account-type="logoutRole || 'buyer'"
      @cancel="logoutRole = null" @confirm="confirmLogout" />

    <div v-if="orderConfirmationOpen" class="success-overlay" @click.self="closeOrderConfirmation">
      <div class="success-popup" role="dialog" aria-modal="true" aria-label="Order confirmation">
        <div class="success-header">
          <div class="success-brand">
            <img class="brand-mark" src="/assets/logo-emblem.png" alt="Pre-Loved Thrift emblem" />
            <div class="brand-copy">
              <strong>PRE-LOVED</strong>
              <span>Thrift</span>
            </div>
          </div>
          <button class="close-top" aria-label="Close" @click="closeOrderConfirmation"><ion-icon :icon="closeOutline" /></button>
        </div>

        <div class="success-body">
          <h2>{{ orderConfirmation.payment === 'GCash' ? 'Order placed' : 'Order confirmed' }} <span class="spark">✨</span></h2>
          <p class="panel-subtitle">Order placed · demo checkout</p>

          <div class="confirmation-box">
            <h3>{{ orderConfirmation.orderId }}</h3>
            <p>₱{{ orderConfirmation.total.toLocaleString('en-PH') }} · {{ orderConfirmation.payment }}. {{ orderConfirmation.payment === 'GCash' ? 'Payment is pending seller verification.' : orderConfirmation.payment.startsWith('Card') ? 'Demo only; no card payment was charged.' : 'No online payment was processed.' }} Your order is in your account dashboard.</p>
          </div>

          <button class="view-orders" type="button" @click="openOrdersFromConfirmation">View my orders</button>
        </div>
      </div>
    </div>

    <div v-if="cartToast" class="cart-toast" role="status" aria-live="polite">
      <span class="toast-icon">✓</span>
      <span>Added to cart</span>
    </div>
    <button v-if="!sellerOpen && !riderOpen && !cartOpen && (!dashboardOpen || user?.role === 'buyer')" class="storefront-chat-launcher" type="button" @click="sellerChatOpen = true">
      <ion-icon :icon="chatbubbleEllipsesOutline" /><span>Message seller</span>
    </button>
  </ion-page>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonIcon, alertController } from '@ionic/vue'
import { chatbubbleEllipsesOutline, closeOutline } from 'ionicons/icons'
import AppHeader from '../components/AppHeader.vue'
import HeroSection from '../components/HeroSection.vue'
import CategoriesSection from '../components/CategoriesSection.vue'
import ProductsSection from '../components/ProductsSection.vue'
import OutfitBuilder from '../components/OutfitBuilder.vue'
import DealsSection from '../components/DealsSection.vue'
import AppFooter from '../components/AppFooter.vue'
import UserDashboard from '../components/UserDashboard.vue'
import LogoutConfirmation from '../components/LogoutConfirmation.vue'
import SellerDashboard from '../components/SellerDashboard.vue'
import RiderDashboard from '../components/RiderDashboard.vue'
import AuthModal from '../modals/AuthModal.vue'
import SellerAuthModal from '../modals/SellerAuthModal.vue'
import RiderAuthModal from '../modals/RiderAuthModal.vue'
import SearchModal from '../modals/SearchModal.vue'
import ChatModal from '../modals/ChatModal.vue'
import StorefrontSellerChat from '../modals/StorefrontSellerChat.vue'
import CartModal from '../modals/CartModal.vue'
import WishlistModal from '../modals/WishlistModal.vue'
import { categories, getProductSizes, products, type CartItem, type OrderMessage, type OrderRecord, type Product, type SellerOrderRecord } from '../data/mockData'
import { isSupabaseConfigured, supabase } from '../utils/supabase'
import { prepareProductImageFromDataUrl } from '../utils/productImage'
import {
  applyPendingRole,
  fetchMyProfile,
  listRiders,
  profileToUser,
  signOut as signOutOfSupabase,
  updateMyProfile
} from '../services/auth'
import {
  addCartItemRecord,
  addOrderMessageRecord,
  addWishlistItem as addWishItem,
  assignOrderRider,
  createOrder,
  deleteCartItemRecord,
  deleteCartItems,
  deleteWishlistItem as deleteWishItem,
  listBuyerOrders,
  listCart,
  listRiderOrders,
  listSellerOrders,
  listWishlist,
  setCartSelected,
  updateCartItemRecord,
  updateDeliveryOrder as updateDeliveryOrderRecord,
  updateOrderStatus
} from '../services/shop'
import { listStorefrontProducts } from '../services/seller'
import type { AppUser, RiderSummary } from '../types/database'

type User = AppUser
type RiderAccount = RiderSummary
type ProfileUpdate = { name: string; email: string; phone?: string; address?: string; avatar?: string }

const authOpen = ref(false), sellerAuthOpen = ref(false), riderAuthOpen = ref(false), dashboardOpen = ref(false), sellerOpen = ref(false), riderOpen = ref(false), searchOpen = ref(false), chatOpen = ref(false)
const sellerChatOpen = ref(false)
const cartOpen = ref(false), wishOpen = ref(false), checkoutLoading = ref(false)
const dashboardView = ref<'overview' | 'orders' | 'wishlist' | 'profile' | 'categories'>('overview')
const cartToast = ref(false)
const orderConfirmationOpen = ref(false)
const returningToAuthSelection = ref(false)
const logoutRole = ref<'buyer' | 'rider' | null>(null)
const orderConfirmation = ref({ orderId: '', payment: 'GCash', total: 0 })
const user = ref<User | null>(null)
const sellerUser = ref<User | null>(null)
const riderUser = ref<User | null>(null)
const registeredRiders = ref<RiderAccount[]>([])
const wished = ref<CartItem[]>([])
const cart = ref<CartItem[]>([])
const cartItemCount = computed(() => cart.value.reduce((sum, item) => sum + (item.quantity ?? 1), 0))
const orders = ref<OrderRecord[]>([])
const sellerOrders = ref<SellerOrderRecord[]>([])
const dashboardProducts = ref<Product[]>(products.map(product => ({ ...product, newArrival: true })))
const wishedIds = computed(() => wished.value.map(i => i.id))
let pending: (() => void) | null = null
let cartToastTimer: number | undefined
let unsubscribeSupabaseAuth: (() => void) | undefined
let unsubscribeOrderMessages: (() => void) | undefined
let sessionToken = 0
const cartMutationQueue = new Map<string, Promise<void>>()

function showCartToast() {
  cartToast.value = true
  if (cartToastTimer) window.clearTimeout(cartToastTimer)
  cartToastTimer = window.setTimeout(() => {
    cartToast.value = false
  }, 1500)
}

function errorMessage(error: unknown, fallback = 'Please try again.') {
  return error instanceof Error ? error.message : fallback
}

async function showError(header: string, error: unknown, fallback = 'Please try again.') {
  console.error(header, error)
  const alert = await alertController.create({
    header,
    message: errorMessage(error, fallback),
    buttons: ['OK']
  })
  await alert.present()
}

function resetBuyerState() {
  cart.value = []
  wished.value = []
  orders.value = []
  dashboardProducts.value = products.map(product => ({ ...product, newArrival: true }))
  dashboardOpen.value = false
}

function clearSessionState() {
  user.value = null
  sellerUser.value = null
  riderUser.value = null
  sellerOrders.value = []
  registeredRiders.value = []
  dashboardOpen.value = false
  sellerOpen.value = false
  riderOpen.value = false
  orderConfirmationOpen.value = false
  resetBuyerState()
}

async function loadBuyerData(buyerId: string) {
  const [cartItems, wishItems, orderItems] = await Promise.all([
    listCart(buyerId),
    listWishlist(buyerId),
    listBuyerOrders(buyerId)
  ])
  cart.value = await Promise.all(cartItems.map(async item => {
    if (!item.productId || item.fit?.version === 7 || !item.img.startsWith('data:image/')) return item
    try {
      const prepared = await prepareProductImageFromDataUrl(item.img)
      const updatedItem = { ...item, img: prepared.dataUrl, fit: prepared.fit }
      if (!item.rowId) return updatedItem

      try {
        return await updateCartItemRecord(item.rowId, { image: prepared.dataUrl, fit: prepared.fit })
      } catch (error) {
        await showError('Unable to save the prepared product image', error)
        return updatedItem
      }
    } catch (error) {
      await showError('Unable to prepare the product image', error)
      return item
    }
  }))
  wished.value = wishItems
  orders.value = orderItems
}

async function loadSellerOrders() {
  sellerOrders.value = await listSellerOrders()
}

async function loadRiderOrders(riderId: string) {
  sellerOrders.value = await listRiderOrders(riderId)
}

async function refreshCurrentOrders() {
  if (sellerUser.value) await loadSellerOrders()
  else if (riderUser.value) await loadRiderOrders(riderUser.value.id)
  else if (user.value) orders.value = await listBuyerOrders(user.value.id)
}

async function refreshRegisteredRiders() {
  registeredRiders.value = await listRiders()
}

async function syncSession(openDashboard: boolean) {
  if (!isSupabaseConfigured) return
  const token = ++sessionToken

  try {
    let profile = await fetchMyProfile()
    if (token !== sessionToken) return
    if (!profile) {
      clearSessionState()
      return
    }

    if (!profile.role_locked) {
      profile = await applyPendingRole(profile)
      if (token !== sessionToken) return
    }

    const account = profileToUser(profile)
    user.value = null
    sellerUser.value = null
    riderUser.value = null
    sellerOrders.value = []
    registeredRiders.value = []

    if (profile.role === 'buyer') {
      resetBuyerState()
      user.value = account
      dashboardOpen.value = openDashboard
      sellerOpen.value = false
      riderOpen.value = false
      await Promise.all([loadBuyerData(profile.id), loadDashboardProducts()])
    } else if (profile.role === 'seller') {
      resetBuyerState()
      sellerUser.value = account
      dashboardOpen.value = false
      riderOpen.value = false
      sellerOpen.value = true
      await Promise.all([refreshRegisteredRiders(), loadSellerOrders()])
    } else {
      resetBuyerState()
      riderUser.value = account
      dashboardOpen.value = false
      sellerOpen.value = false
      riderOpen.value = true
      await loadRiderOrders(profile.id)
    }
  } catch (error) {
    if (token !== sessionToken) return
    console.error('Unable to restore the Supabase session.', error)
    await showError('Unable to load your account', error, 'Please sign in again.')
  }
}

onMounted(async () => {
  void loadDashboardProducts()

  if (supabase) {
    const client = supabase
    const channel = client.channel('order-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages' }, () => {
        void refreshCurrentOrders().catch(error => showError('Unable to refresh messages', error))
      })
      .subscribe()
    unsubscribeOrderMessages = () => { void client.removeChannel(channel) }

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        sessionToken += 1
        clearSessionState()
        return
      }
      if (event === 'SIGNED_IN') void syncSession(true)
      else if (event === 'INITIAL_SESSION') void syncSession(false)
      else if (event === 'USER_UPDATED') void syncSession(dashboardOpen.value)
    })
    unsubscribeSupabaseAuth = () => subscription.unsubscribe()

    const oauthError = new URLSearchParams(window.location.search).get('error_description')
    if (oauthError) {
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('error')
      cleanUrl.searchParams.delete('error_code')
      cleanUrl.searchParams.delete('error_description')
      window.history.replaceState({}, document.title, cleanUrl)
      await showError('Social sign-in failed', new Error(oauthError), 'Please try again.')
    }

    await syncSession(false)
  }

  if (!document.querySelector('script[data-elfsight-platform], script[src^="https://elfsightcdn.com/platform.js"]')) {
    const script = document.createElement('script')
    script.src = 'https://elfsightcdn.com/platform.js'
    script.async = true
    script.dataset.elfsightPlatform = ''
    script.onerror = () => console.error('Unable to load the header announcement widget.')
    document.head.appendChild(script)
  }
})

onUnmounted(() => {
  unsubscribeSupabaseAuth?.()
  unsubscribeOrderMessages?.()
})

/* Guests get the login form; the clicked action runs right after they log in. */
const needLogin = (action: () => void) => {
  if (user.value) return action()
  pending = action
  authOpen.value = true
}

const toItem = (p: Product | CartItem, size?: string): CartItem => ({
  id: size ? `${p.id}::${size}` : p.id,
  rowId: 'rowId' in p ? p.rowId : undefined,
  productId: p.productId,
  name: p.name,
  price: p.price,
  img: p.img,
  quantity: 'quantity' in p ? p.quantity ?? 1 : 1,
  slot: p.slot,
  fit: p.fit,
  selected: true,
  size,
  cat: p.cat,
  type: p.type
})

const toggleWish = (p: Product) => needLogin(() => {
  void (async () => {
    const existing = wished.value.find(w => String(w.id) === String(p.id))
    if (existing) {
      if (existing.rowId) await deleteWishItem(existing.rowId)
      wished.value = wished.value.filter(w => w.rowId !== existing.rowId)
      return
    }
    if (!user.value) return
    wished.value.push(await addWishItem(user.value.id, toItem(p)))
  })().catch(error => showError('Unable to update your wishlist', error))
})

async function promptForProductSize(product: Product | CartItem) {
  const sizes = getProductSizes(product)
  if (!sizes.length) return undefined

  let selectedSize = ''
  const alert = await alertController.create({
    header: sizes[0].startsWith('EU ') ? 'Select shoe size' : 'Select clothing size',
    message: 'Choose a size before adding this item to your cart.',
    inputs: sizes.map(size => ({
      type: 'radio' as const,
      label: size,
      value: size,
      handler: input => { selectedSize = String(input.value) }
    })),
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Add to cart', role: 'confirm', handler: () => Boolean(selectedSize) }
    ]
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  return result.role === 'confirm' ? selectedSize : undefined
}

async function withCartItemLock(item: CartItem, action: () => Promise<void>) {
  const key = `${String(item.id)}\u0000${item.size ?? ''}`
  const previous = cartMutationQueue.get(key) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>(resolve => { release = resolve })
  cartMutationQueue.set(key, current)

  await previous
  try {
    await action()
  } finally {
    release()
    if (cartMutationQueue.get(key) === current) cartMutationQueue.delete(key)
  }
}

async function addOrIncrementCartItem(item: CartItem) {
  const userId = user.value?.id
  if (!userId) return

  await withCartItemLock(item, async () => {
    const index = cart.value.findIndex(existing =>
      String(existing.id) === String(item.id) && existing.size === item.size)
    if (index >= 0) {
      const existing = cart.value[index]
      const quantity = (existing.quantity ?? 1) + (item.quantity ?? 1)
      cart.value[index] = existing.rowId
        ? await updateCartItemRecord(existing.rowId, { quantity })
        : await addCartItemRecord(userId, { ...existing, quantity })
      return
    }

    cart.value.push(await addCartItemRecord(userId, {
      ...item,
      quantity: item.quantity ?? 1
    }))
  })
}

async function addCartItem(product: Product | CartItem, afterAdded?: () => void) {
  const size = await promptForProductSize(product)
  if (getProductSizes(product).length && !size) return

  let cartProduct = product
  if ('productId' in product && product.productId && product.img.startsWith('data:image/')) {
    const preparedImage = await prepareProductImageFromDataUrl(product.img)
    cartProduct = { ...product, img: preparedImage.dataUrl, fit: preparedImage.fit }
  }

  const item = toItem(cartProduct, size)
  await addOrIncrementCartItem(item)
  afterAdded?.()
  showCartToast()
}

const reportAddToCartError = (error: unknown) => {
  void showError('Unable to add item', error)
}
const addToCart = (p: Product) => needLogin(() => { void addCartItem(p).catch(reportAddToCartError) })

async function buyAgain(items: CartItem[]) {
  if (!user.value || !items.length) return

  try {
    for (const item of items) {
      await addOrIncrementCartItem({
        ...item,
        rowId: undefined,
        selected: true,
        quantity: item.quantity ?? 1
      })
    }

    showCartToast()
  } catch (error) {
    await showError('Unable to buy this order again', error)
  }
}

function changeCartQuantity(id: CartItem['id'], delta: number) {
  void (async () => {
    const item = cart.value.find(cartItem => String(cartItem.id) === String(id))
    if (!item) return

    await withCartItemLock(item, async () => {
      const index = cart.value.findIndex(cartItem => String(cartItem.id) === String(id))
      if (index < 0) return
      const current = cart.value[index]
      const quantity = (current.quantity ?? 1) + delta
      if (quantity < 1) return
      cart.value[index] = current.rowId
        ? await updateCartItemRecord(current.rowId, { quantity })
        : { ...current, quantity }
    })
  })().catch(error => showError('Unable to update item quantity', error))
}

const removeWish = async (id: CartItem['id']) => {
  const item = wished.value.find(w => String(w.id) === String(id))
  if (!item) return
  if (item.rowId) await deleteWishItem(item.rowId)
  wished.value = wished.value.filter(w => w.rowId !== item.rowId)
}

const removeCart = async (id: CartItem['id']) => {
  const item = cart.value.find(c => String(c.id) === String(id))
  if (!item) return
  if (item.rowId) await deleteCartItemRecord(item.rowId)
  cart.value = cart.value.filter(c => c.rowId !== item.rowId)
}

const editCart = (p: { id: CartItem['id']; size?: string; note?: string }) => {
  void (async () => {
    const item = cart.value.find(c => String(c.id) === String(p.id))
    if (!item) return
    if (!item.rowId) {
      item.size = p.size
      item.note = p.note
      return
    }
    const updated = await updateCartItemRecord(item.rowId, { size: p.size ?? '', note: p.note ?? '' })
    const index = cart.value.findIndex(c => c.rowId === item.rowId)
    if (index >= 0) cart.value[index] = updated
  })().catch(error => showError('Unable to update cart item', error))
}

const moveToCart = (p: CartItem) => needLogin(() => {
  void addCartItem(p, () => { void removeWish(p.id).catch(error => showError('Unable to update your wishlist', error)) })
    .catch(reportAddToCartError)
})

/* A check button on each cart row marks what actually gets checked out. */
const toggleCartSelect = (id: CartItem['id']) => {
  void (async () => {
    const item = cart.value.find(c => String(c.id) === String(id))
    if (!item) return
    const next = item.selected === false
    item.selected = next
    if (!item.rowId) return
    try {
      await setCartSelected([item.rowId], next)
    } catch (error) {
      item.selected = !next
      throw error
    }
  })().catch(error => showError('Unable to update your cart', error))
}

const toggleCartAll = (value: boolean) => {
  void (async () => {
    const previous = cart.value.map(item => item.selected !== false)
    cart.value.forEach(c => { c.selected = value })
    const rowIds = cart.value.map(item => item.rowId).filter((id): id is string => Boolean(id))
    try {
      await setCartSelected(rowIds, value)
    } catch (error) {
      cart.value.forEach((item, index) => { item.selected = previous[index] })
      throw error
    }
  })().catch(error => showError('Unable to update your cart', error))
}

async function checkoutCart(checkout: { payment: string; customerName: string; customerEmail: string; customerPhone: string; customerAddress: string; paymentProof?: string }) {
  if (!user.value || checkoutLoading.value) return
  const purchased = cart.value.filter(c => c.selected !== false)
  if (!purchased.length) return

  checkoutLoading.value = true
  try {
    const order = await createOrder({
      buyer: user.value,
      items: purchased,
      payment: checkout.payment,
      paymentProof: checkout.paymentProof,
      customerName: checkout.customerName,
      customerEmail: checkout.customerEmail,
      customerPhone: checkout.customerPhone,
      customerAddress: checkout.customerAddress
    })

    orders.value.unshift(order)

    const rowIds = purchased.map(item => item.rowId).filter((id): id is string => Boolean(id))
    if (rowIds.length) {
      try {
        await deleteCartItems(rowIds)
      } catch (error) {
        console.error('Unable to clear purchased cart items.', error)
      }
    }
    cart.value = cart.value.filter(item => item.selected === false)

    showOrderConfirmation({
      orderId: order.id,
      payment: order.payment || checkout.payment,
      total: Math.round(order.total)
    })
  } catch (error) {
    await showError('Unable to place order', error)
  } finally {
    checkoutLoading.value = false
  }
}

const showOrderConfirmation = (payload: { orderId: string; payment: string; total: number }) => {
  orderConfirmation.value = payload
  orderConfirmationOpen.value = true
  cartOpen.value = false
  dashboardOpen.value = false
  sellerOpen.value = false
}
const closeOrderConfirmation = () => {
  orderConfirmationOpen.value = false
}
const openOrdersFromConfirmation = () => {
  closeOrderConfirmation()
  dashboardOpen.value = true
  dashboardView.value = 'orders'
  sellerOpen.value = false
}

/* An outfit built in the Outfit Builder is checked out through the same cart. */
const onOutfitCheckout = (items: CartItem[]) => {
  const buyerId = user.value?.id
  if (!buyerId) return
  void (async () => {
    for (const item of items) {
      if (cart.value.some(c => String(c.id) === String(item.id))) continue
      await addCartItemRecord(buyerId, { ...item, selected: true })
    }
    cart.value = await listCart(buyerId)
    cartOpen.value = true
  })().catch(error => showError('Unable to add the outfit', error))
}

async function loadDashboardProducts() {
  try {
    const sellerProducts = await listStorefrontProducts()
    dashboardProducts.value = [...sellerProducts, ...products.map(product => ({ ...product, newArrival: true }))]
  } catch (error) {
    console.error('Unable to load seller products.', error)
    dashboardProducts.value = products.map(product => ({ ...product, newArrival: true }))
  }
}
watch(dashboardOpen, isOpen => {
  if (isOpen) void loadDashboardProducts()
})

const openCustomerDashboard = (tab: 'overview' | 'orders' | 'wishlist' | 'profile' | 'categories' = 'overview') => {
  dashboardOpen.value = true
  dashboardView.value = tab
  sellerOpen.value = false
  authOpen.value = false
}

const handleCategoryNavigation = () => {
  if (user.value) {
    openCustomerDashboard('categories')
    return
  }
  authOpen.value = true
}

const onAuth = async () => {
  const action = pending
  pending = null
  authOpen.value = false
  sellerAuthOpen.value = false
  riderAuthOpen.value = false
  await syncSession(true)
  if (action && user.value) action()
}

const onProfileUpdate = async (updated: ProfileUpdate) => {
  if (!user.value) return
  try {
    const profile = await updateMyProfile({
      full_name: updated.name,
      phone: updated.phone ?? '',
      address: updated.address ?? '',
      avatar: updated.avatar ?? ''
    })
    user.value = profileToUser(profile)
    dashboardOpen.value = true
    sellerOpen.value = false
  } catch (error) {
    await showError('Unable to save profile', error)
  }
}

const closeAuth = () => { authOpen.value = false; pending = null }
const backToAuthSelection = () => {
  returningToAuthSelection.value = true
  sellerAuthOpen.value = false
  riderAuthOpen.value = false
}
const onSellerAuthDismiss = () => {
  sellerAuthOpen.value = false
  if (!returningToAuthSelection.value) return
  returningToAuthSelection.value = false
  authOpen.value = true
}
const onRiderAuthDismiss = () => {
  riderAuthOpen.value = false
  if (!returningToAuthSelection.value) return
  returningToAuthSelection.value = false
  authOpen.value = true
}

const logout = async () => {
  try {
    await signOutOfSupabase()
  } catch (error) {
    await showError('Unable to log out', error)
    return
  }
  clearSessionState()
}

async function confirmAction(header: string, message: string) {
  const alert = await alertController.create({
    header,
    message,
    backdropDismiss: false,
    buttons: [
      { text: 'No', role: 'cancel' },
      { text: 'Yes', role: 'confirm' }
    ]
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  return result.role === 'confirm'
}

function confirmBuyerLogout() {
  logoutRole.value = 'buyer'
}
function confirmRiderLogout() {
  logoutRole.value = 'rider'
}
async function confirmLogout() {
  logoutRole.value = null
  await logout()
}

async function confirmRemoveCart(id: CartItem['id']) {
  const item = cart.value.find(entry => String(entry.id) === String(id))
  if (!item || !(await confirmAction('Remove item?', `Remove ${item.name} from your cart?`))) return
  try {
    await removeCart(id)
  } catch (error) {
    await showError('Unable to remove item', error)
  }
}
async function confirmRemoveWish(id: CartItem['id']) {
  const item = wished.value.find(entry => String(entry.id) === String(id))
  if (!item || !(await confirmAction('Remove favorite?', `Remove ${item.name} from your wishlist?`))) return
  try {
    await removeWish(id)
  } catch (error) {
    await showError('Unable to remove favorite', error)
  }
}

const openSellerAuth = () => {
  if (sellerUser.value) {
    dashboardOpen.value = false
    sellerOpen.value = true
    void Promise.all([loadSellerOrders(), refreshRegisteredRiders()])
      .catch(error => showError('Unable to refresh seller data', error))
    return
  }
  sellerAuthOpen.value = true
}

const onSellerAuth = async () => {
  await onAuth()
}

const onSellerProfileUpdate = (seller: ProfileUpdate) => {
  if (!sellerUser.value) return
  sellerUser.value = {
    ...sellerUser.value,
    name: seller.name,
    phone: seller.phone,
    address: seller.address,
    avatar: seller.avatar
  }
}

const onRiderAuth = async () => {
  await onAuth()
}

const updateRiderProfile = async (updated: ProfileUpdate) => {
  if (!riderUser.value) return
  try {
    const profile = await updateMyProfile({
      full_name: updated.name,
      phone: updated.phone ?? '',
      avatar: updated.avatar ?? ''
    })
    riderUser.value = profileToUser(profile)
    await loadRiderOrders(profile.id)
  } catch (error) {
    await showError('Unable to save rider profile', error)
  }
}

const returnToStorefront = () => { sellerOpen.value = false; dashboardOpen.value = false; riderOpen.value = false }

const updateSellerOrderStatus = (id: string, status: string) => {
  void (async () => {
    const order = sellerOrders.value.find(item => item.id === id) ?? orders.value.find(item => item.id === id)
    if (!order?.dbId) return
    await updateOrderStatus(order.dbId, status)
    updateOrderData(id, { status })
  })().catch(error => showError('Unable to update order status', error))
}

const updateSellerOrderRider = (id: string, rider: RiderAccount) => {
  void (async () => {
    const order = sellerOrders.value.find(item => item.id === id)
    if (!order?.dbId) return
    await assignOrderRider(order.dbId, rider)
    updateOrderData(id, {
      rider: rider.name,
      riderEmail: rider.email,
      riderPhone: rider.phone
    })
  })().catch(error => showError('Unable to assign rider', error))
}

const updateDeliveryOrder = (id: string, patch: Partial<OrderRecord>) => {
  void (async () => {
    const order = sellerOrders.value.find(item => item.id === id) ?? orders.value.find(item => item.id === id)
    if (!order?.dbId) return
    await updateDeliveryOrderRecord(order.dbId, {
      status: patch.status,
      deliveredItemIndexes: patch.deliveredItemIndexes,
      deliveryProof: patch.deliveryProof,
      deliveryCompletedAt: patch.deliveryCompletedAt
    })
    updateOrderData(id, patch)
  })().catch(error => showError('Unable to update delivery', error))
}

const addOrderMessage = (id: string, message: OrderMessage) => {
  void (async () => {
    const order = sellerOrders.value.find(item => item.id === id) ?? orders.value.find(item => item.id === id)
    if (!order?.dbId) return
    await addOrderMessageRecord(order.dbId, message)
    const existing = order.messages ?? []
    updateOrderData(id, { messages: [...existing, message] })
  })().catch(error => showError('Unable to send message', error))
}

function updateOrderData(id: string, patch: Partial<OrderRecord>) {
  const sellerOrder = sellerOrders.value.find(item => item.id === id)
  if (sellerOrder) Object.assign(sellerOrder, patch)
  const customerOrder = orders.value.find(item => item.id === id)
  if (customerOrder) Object.assign(customerOrder, patch)
}

const dashboardAddToCart = (product: Product) => addToCart(product)
const dashboardToggleWish = (product: Product) => toggleWish(product)

function handleHeaderNavigation(id: string) {
  if (dashboardOpen.value && id === 'shop') {
    void loadDashboardProducts()
    dashboardView.value = 'categories'
    return
  }
  void navigateStorefront(id)
}

async function navigateStorefront(id: string) {
  if (dashboardOpen.value || sellerOpen.value) {
    dashboardOpen.value = false; sellerOpen.value = false
    await nextTick()
  }
  const content = document.querySelector('ion-content')
  const scroller = content?.shadowRoot?.querySelector<HTMLElement>('.inner-scroll')
  if (!scroller) return
  if (id === 'top') {
    scroller.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const target = document.getElementById(id)
  if (!target) return
  const targetTop = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
  const headerHeight = document.querySelector('.hdr')?.getBoundingClientRect().height ?? 78
  scroller.scrollTo({ top: Math.max(0, targetTop - headerHeight), behavior: 'smooth' })
}
</script>
<style scoped>
.config-warning {
  padding: 10px 16px;
  background: #3a2320;
  color: #ffe8e3;
  text-align: center;
  font: 600 12px/1.5 var(--font-body);
}
.config-warning code {
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(255,255,255,.14);
  font-size: 11px;
}
.storefront-chat-launcher {
  position: absolute;
  right: max(20px, env(safe-area-inset-right));
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 10000;
  pointer-events: auto;
  min-height: 52px;
  padding: 0 20px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 0;
  border-radius: 999px;
  background: #c45f5f;
  color: #fff;
  box-shadow: 0 10px 28px rgba(67, 35, 30, .24);
  cursor: pointer;
  font: 700 13px var(--font-body);
}
.storefront-chat-launcher ion-icon { font-size: 20px; }
@media (max-width: 600px) {
  .storefront-chat-launcher { right: 14px; bottom: max(14px, env(safe-area-inset-bottom)); min-height: 48px; padding: 0 16px; }
}
.success-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(25, 10, 10, 0.18);
  z-index: 2000;
  padding: 20px;
}
.success-popup {
  width: min(440px, calc(100vw - 28px));
  background: linear-gradient(180deg, #d98a87 0%, #d07774 100%);
  border-radius: 18px;
  box-shadow: 0 18px 36px rgba(58, 32, 30, 0.2);
  overflow: hidden;
}
.success-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 10px 14px 6px;
  min-height: 60px;
  background: rgba(255,255,255,0.04);
}
.success-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}
.success-brand .brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 800;
}
.success-brand .brand-copy strong {
  font-size: 15px;
  letter-spacing: 0.04em;
}
.success-brand .brand-copy span {
  font-size: 9px;
  margin-top: 2px;
  letter-spacing: 0.17em;
}
.success-header .brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: contain;
  background: rgba(255,255,255,0.15);
  border: 2px solid rgba(255,255,255,0.8);
}
.success-header .close-top {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #fff;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 24px;
}
.success-body {
  background: rgba(255,255,255,0.06);
  padding: 8px 18px 18px;
  text-align: center;
}
.success-body h2 {
  margin: 0;
  font-size: clamp(28px, 2.8vw, 42px);
  letter-spacing: -0.06em;
  line-height: 1.05;
  color: #fff;
  font-weight: 800;
}
.spark { font-size: 0.8em; }
.panel-subtitle {
  margin: 8px 0 16px;
  font-size: 18px;
  color: rgba(255,255,255,0.96);
  font-weight: 500;
}
.confirmation-box {
  background: rgba(255,255,255,0.96);
  border-radius: 16px;
  padding: 18px 16px 16px;
  box-shadow: inset 0 0 0 1px rgba(115, 78, 75, 0.08);
}
.confirmation-box h3 {
  margin: 0 0 10px;
  font-size: clamp(28px, 2.5vw, 38px);
  line-height: 1;
  letter-spacing: -0.06em;
  color: #1d1919;
}
.confirmation-box p {
  margin: 0;
  font-size: 15px;
  line-height: 1.4;
  color: #2b2524;
}
.view-orders {
  width: 100%;
  margin-top: 18px;
  border: 0;
  border-radius: 14px;
  padding: 14px 16px;
  background: #f3d0c8;
  color: #2b2524;
  font: 800 20px var(--font-body);
  cursor: pointer;
}
.cart-toast {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-radius: 999px;
  background: rgba(33, 24, 24, 0.94);
  color: #fff;
  font: 700 15px var(--font-body);
  box-shadow: 0 18px 32px rgba(31, 21, 20, 0.28);
  animation: toast-in .2s ease;
  min-width: 180px;
  justify-content: center;
}
.toast-icon {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #fff;
  color: var(--coral-dark);
  font-weight: 800;
}
@keyframes toast-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 520px) {
  .cart-toast { right: 16px; bottom: 16px; }
}
</style>

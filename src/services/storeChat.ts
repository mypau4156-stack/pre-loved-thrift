import { requireSupabase } from '../utils/supabase'

export interface StoreChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderRole: 'buyer' | 'seller'
  text: string
  sentAt: string
}

export interface StoreChatConversation {
  id: string
  buyerId: string
  sellerId: string
  buyerName: string
  buyerEmail: string
  updatedAt: string
  messages: StoreChatMessage[]
}

interface ConversationRow {
  id: string
  buyer_id: string
  seller_id: string
  updated_at: string
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: 'buyer' | 'seller'
  text: string
  created_at: string
}

function storeChatError(error: { code?: string; message?: string }): Error {
  if (error.code === 'PGRST202' || error.code === '42883') {
    return new Error('Store chat is not set up in Supabase yet. Run supabase/migrations/0006_storefront_seller_chat.sql in the Supabase SQL Editor, then try again.')
  }
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return new Error('The store chat tables are missing. Run supabase/migrations/0006_storefront_seller_chat.sql in the Supabase SQL Editor, then try again.')
  }
  return new Error(error.message || 'The store chat request failed.')
}

function mapMessage(row: MessageRow): StoreChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    text: row.text,
    sentAt: row.created_at
  }
}

export async function openStoreChat(): Promise<{ conversationId: string; sellerId: string; sellerName: string }> {
  const { data, error } = await requireSupabase().rpc('get_or_create_store_chat')
  if (error) throw storeChatError(error)
  const result = Array.isArray(data) ? data[0] : data
  if (!result?.conversation_id || !result.seller_id) {
    throw new Error('Supabase did not return a seller conversation. Check that the store chat migration is installed and that a seller account exists.')
  }
  return {
    conversationId: result.conversation_id,
    sellerId: result.seller_id,
    sellerName: result.seller_name?.trim() || 'Shop seller'
  }
}

export async function listStoreChatMessages(conversationId: string): Promise<StoreChatMessage[]> {
  const { data, error } = await requireSupabase()
    .from('buyer_seller_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw storeChatError(error)
  return ((data ?? []) as MessageRow[]).map(mapMessage)
}

export async function sendStoreChatMessage(
  conversationId: string,
  senderId: string,
  senderRole: 'buyer' | 'seller',
  text: string
): Promise<StoreChatMessage> {
  const { data, error } = await requireSupabase()
    .from('buyer_seller_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_role: senderRole,
      text: text.trim()
    })
    .select('*')
    .single()

  if (error) throw storeChatError(error)
  return mapMessage(data as MessageRow)
}

export async function listSellerStoreChats(): Promise<StoreChatConversation[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('buyer_seller_conversations')
    .select('id, buyer_id, seller_id, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw storeChatError(error)
  const rows = (data ?? []) as ConversationRow[]
  if (!rows.length) return []

  const buyerIds = [...new Set(rows.map(row => row.buyer_id))]
  const conversationIds = rows.map(row => row.id)
  const [profilesResult, messagesResult] = await Promise.all([
    client.from('profiles').select('id, full_name, email').in('id', buyerIds),
    client.from('buyer_seller_messages').select('*').in('conversation_id', conversationIds).order('created_at', { ascending: true })
  ])
  if (profilesResult.error) throw storeChatError(profilesResult.error)
  if (messagesResult.error) throw storeChatError(messagesResult.error)

  const profiles = new Map((profilesResult.data ?? []).map(profile => [profile.id, profile]))
  const messages = (messagesResult.data ?? []) as MessageRow[]
  return rows.map(row => {
    const buyer = profiles.get(row.buyer_id)
    return {
      id: row.id,
      buyerId: row.buyer_id,
      sellerId: row.seller_id,
      buyerName: buyer?.full_name?.trim() || buyer?.email?.split('@')[0] || 'Buyer',
      buyerEmail: buyer?.email || '',
      updatedAt: row.updated_at,
      messages: messages.filter(message => message.conversation_id === row.id).map(mapMessage)
    }
  })
}

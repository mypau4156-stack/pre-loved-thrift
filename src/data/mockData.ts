export interface Category { name: string; count: string; img: string; bg: string }
export interface GarmentImageFit {
  imageWidth: number
  imageHeight: number
  left: number
  top: number
  right: number
  bottom: number
  waistLeft?: number
  waistRight?: number
  waistY?: number
  contain?: boolean
  version?: number
}
export interface Product { id: number | string; productId?: string; name: string; price: number; was?: number; img: string; hot?: boolean; newArrival?: boolean;
cat: string; type?: string; slot?: Slot; fit?: GarmentImageFit }
export interface Garment { id: string; name: string; src: string; slot: Slot }
export interface Character { id: string; label: string; gender: 'girl' | 'boy'; build: 'petite' | 'chubby' }
export type Slot = 'dress' | 'top' | 'bottom' | 'shoes'
export interface CartItem {
id: number | string
rowId?: string
productId?: string
name: string
price: number
img: string
slot?: Slot
fit?: GarmentImageFit
selected?: boolean
size?: string
note?: string
cat?: string
type?: string
}
function slotFromDetails(details: string): Slot | undefined {
  if (/\b(shoes?|footwear|sneakers?|boots?|sandals?)\b/.test(details)) return 'shoes'
  if (/\b(dresses?|gowns?)\b/.test(details)) return 'dress'
  if (/\b(tops?|t-?shirts?|tees?|shirts?|blouses?|sweaters?|polos?|jackets?|coats?|hoodies?|cardigans?)\b/.test(details)) return 'top'
  if (/\b(bottoms?|jeans|denim|pants|trousers|shorts?|skorts?|skirts?|leggings)\b/.test(details)) return 'bottom'
  return undefined
}
export function getProductSlot(product: { name: string; slot?: Slot; cat?: string; type?: string }): Slot | undefined {
  const normalizedName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  if (normalizedName.includes('y2k women fairy grunge')) return 'top'
  if (normalizedName.includes('high waist slim skirt')) return 'bottom'

  const typeDetails = (product.type ?? '').toLowerCase()
  if (/\b(bags?|handbags?|accessories)\b/.test(typeDetails)) return undefined
  const typeSlot = slotFromDetails(typeDetails)
  if (typeSlot) return typeSlot
  const namedSlot = slotFromDetails(product.name.toLowerCase())
  if (namedSlot) return namedSlot
  if (product.slot) return product.slot
  const categoryDetails = (product.cat ?? '').toLowerCase()
  const categorySlot = /\b(women'?s?\s+dresses?|dresses?)\b/.test(categoryDetails)
    ? 'dress'
    : /\b(tops?|t-?shirts?|shirts?)\b/.test(categoryDetails)
    ? 'top'
    : /\b(denim|bottoms?|jeans|pants|trousers|shorts?|skirts?)\b/.test(categoryDetails)
      ? 'bottom'
      : /\b(shoes?|footwear)\b/.test(categoryDetails)
        ? 'shoes'
        : undefined
  if (categorySlot) return categorySlot
  return undefined
}
export function isShortBottom(product: { name: string; cat?: string; type?: string }): boolean {
  const details = `${product.name} ${product.cat ?? ''} ${product.type ?? ''}`.toLowerCase()
  if (/\b(maxi|long)\s+skirts?\b/.test(details)) return false
  return /\bshorts?\b(?![- ]sleeve)\b|\bskorts?\b|\b(mini\s+)?skirts?\b/.test(details)
}
export function getProductSizes(product: { name: string; slot?: Slot; cat?: string; type?: string }): string[] {
  const details = `${product.slot ?? ''} ${product.cat ?? ''} ${product.type ?? ''} ${product.name}`.toLowerCase()
  if (/\b(shoe|shoes|footwear|sneaker|sneakers|boot|boots|sandal|sandals)\b/.test(details)) {
    return Array.from({ length: 10 }, (_, index) => `EU ${index + 36}`)
  }
  if (product.slot === 'dress' || product.slot === 'top' || product.slot === 'bottom' ||
    /\b(clothing|apparel|dress|dresses|top|tops|shirt|shirts|t-shirt|t-shirts|denim|jeans|pants|trousers|shorts|skirt|skirts)\b/.test(details)) {
    return ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  }
  return []
}
export interface OrderRecord {
id: string
dbId?: string
date: string
items: CartItem[]
subtotal?: number
shipping?: number
total: number
payment?: string
paymentProof?: string
status?: string
rider?: string
riderEmail?: string
riderPhone?: string
customerEmail?: string
customerName?: string
customerPhone?: string
customerAddress?: string
deliveredItemIndexes?: number[]
deliveryProof?: string
deliveryCompletedAt?: string
messages?: OrderMessage[]
}
export interface OrderMessage {
sender: 'rider' | 'customer' | 'seller'
channel?: 'delivery' | 'buyer-seller' | 'rider-seller'
text: string
sentAt: string
}
export interface SellerOrderRecord extends OrderRecord {
buyer: string
payment: string
status: string
}
export const categories: Category[] = [
{ name: 'Women Dresses', count: ' ', img: '/product%20category/Chic%20Fall%20Capsule%20Wardrobe%20Essentials.png', bg: '#f7e2d8' },
{ name: 'Tops & T-shirts', count: ' ', img: '/product%20category/COMBRAIDED%20Men%E2%80%99s%20Textured%20Polo%20T-Shirt%20_%20Polycotton%20Regular%20Fit%20_%20Casual%20&%20Stylish%20Daily%20Wear.png', bg: '#f8dcdc' },
{ name: 'Denim Wear', count: ' ', img: '/product%20category/Jack%20&%20Jones%20gy%20fit%20JJIALEX%20JJNORREBRO%20SQ%20400%20LN%20-%20Straight%20leg%20jeans%20-%20blue%20denim.png', bg: '#dfece8' },
{ name: 'Shoes & Footwear', count: ' ', img: '/product%20category/French%20High-Heeled%20Women%27s%20Shoes%202025%20New%20Summer%20Fairy%20Style%20Temperament%20Black%20Fine%20Roman%20-%20Upgraded%20(White)%20_%2040.png', bg: '#f8e5cb' },
{ name: 'Bags & Accessories', count: ' ', img: '/product%20category/Elegant%20Women%27s%20Handbag%20with%20Gold%20Buckle.png', bg: '#f7dfe4' }
]
export const garments: Garment[] = [
 { id: 'g1', name: 'Rose Dress', src: '/assets/garments/rose-dress.jpg', slot: 'dress' },
 { id: 'g2', name: 'Mauve Dress', src: '/assets/garments/mauve-dress.jpg', slot: 'dress' },
 { id: 'g3', name: 'Cream Blouse', src: '/assets/garments/cream-blouse.jpg', slot: 'top' },
 { id: 'g4', name: 'Denim Jeans', src: '/assets/garments/denim-jeans.jpg', slot: 'bottom' },
 { id: 'g5', name: 'Sage Skirt', src: '/assets/garments/sage-skirt.jpg', slot: 'bottom' }
]
export const products: Product[] = [
 { id: 1, name: 'Burgundy Ruched Gown', price: 2088, was: 3016, hot: true, img: '/product%20category/Burgundy%20Ruched%20Gown.png', cat: 'Women', type: 'Clothing', slot: 'dress', fit: { imageWidth: 736, imageHeight: 1104, left: 176, top: 61, right: 578, bottom: 1090 } },
 { id: 2, name: 'COMBRAIDED Men’s Textured Polo', price: 1624, img: '/product%20category/COMBRAIDED%20Men%E2%80%99s%20Textured%20Polo%20T-Shirt%20_%20Polycotton%20Regular%20Fit%20_%20Casual%20&%20Stylish%20Daily%20Wear.png', hot: true, cat: 'Men', type: 'Clothing', slot: 'top', fit: { imageWidth: 736, imageHeight: 1104, left: 11, top: 102, right: 730, bottom: 930 } },
 { id: 3, name: 'Deck Shoes', price: 1914, was: 2610, img: '/product%20category/Deck%20Shoes.png', cat: 'Shoes', type: 'Shoes', slot: 'shoes', fit: { imageWidth: 736, imageHeight: 1104, left: 61, top: 141, right: 682, bottom: 963 } },
 { id: 4, name: 'Elegant Women’s Handbag', price: 2436, was: 3364, img: '/product%20category/Elegant%20Women%27s%20Handbag%20with%20Gold%20Buckle.png', cat: 'Accessories', type: 'Bag' },
 { id: 5, name: 'French High-Heeled Women’s Shoes', price: 2262, img: '/product%20category/French%20High-Heeled%20Women%27s%20Shoes%202025%20New%20Summer%20Fairy%20Style%20Temperament%20Black%20Fine%20Roman%20-%20Upgraded%20(White)%20_%2040.png', cat: 'Shoes', type: 'Shoes', slot: 'shoes', fit: { imageWidth: 736, imageHeight: 736, left: 6, top: 40, right: 730, bottom: 697 } },
 { id: 6, name: 'Jack & Jones Straight Leg Jeans', price: 1740, was: 2436, hot: true, img: '/product%20category/Jack%20&%20Jones%20gy%20fit%20JJIALEX%20JJNORREBRO%20SQ%20400%20LN%20-%20Straight%20leg%20jeans%20-%20blue%20denim.png', cat: 'Denim', type: 'Clothing', slot: 'bottom', fit: { imageWidth: 735, imageHeight: 1059, left: 162, top: 68, right: 573, bottom: 992 } }
]
export const characters: Character[] = [
 { id: 'gp', label: 'Girl · Small', gender: 'girl', build: 'petite' },
 { id: 'gc', label: 'Girl · Plus size', gender: 'girl', build: 'chubby' },
 { id: 'bp', label: 'Boy · Small', gender: 'boy', build: 'petite' },
 { id: 'bc', label: 'Boy · Plus size', gender: 'boy', build: 'chubby' }
]
export const bodyTypes = [
 { id: 'petite', label: 'Small' },
 { id: 'plus', label: 'Plus size' }
]
export const skinTones = [
 { label: 'Fair', swatch: '#fde0cc', filter: 'none' },
 { label: 'Light', swatch: '#f3c3a0', filter: 'sepia(.15) saturate(.9)' },
 { label: 'Medium', swatch: '#d9a077', filter: 'sepia(.35) saturate(1.1)' },
 { label: 'Tan', swatch: '#b97b52', filter: 'sepia(.55) saturate(1.25)' },
 { label: 'Brown', swatch: '#8a5636', filter: 'sepia(.75) saturate(1.4)' },
 { label: 'Deep', swatch: '#5e3a24', filter: 'sepia(.95) saturate(1.5)' }
]

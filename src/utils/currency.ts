export const SHIPPING_FEE = 50

export function shippingFor(_subtotal: number): number {
  return SHIPPING_FEE
}

export function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-PH')}`
}

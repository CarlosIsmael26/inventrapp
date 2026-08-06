export type QuotationStatus = 'issued' | 'converted'

export type QuotationItem = {
  productId: string
  code: string
  name: string
  brand: string
  quantity: number
  unitPrice: number
  total: number
}

export type Quotation = {
  id: string
  number: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  notes: string | null
  status: QuotationStatus
  taxRate: number
  subtotal: number
  tax: number
  total: number
  currency: string
  items: QuotationItem[]
  validUntil: Date
  createdAt: Date | null
  createdBy: string
  createdByName: string
  saleId?: string | null
  convertedAt?: Date | null
}

export type QuotationInput = {
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
  validUntil: string
  items: Array<{ productId: string; quantity: number }>
}

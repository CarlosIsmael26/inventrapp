import type { QuotationItem } from './quotation'

export type Sale = { id: string; number: string; sourceQuotationId: string | null; sourceQuotationNumber: string | null; customerName: string; customerEmail: string | null; customerPhone: string | null; notes: string | null; status: 'completed'; taxRate: number; subtotal: number; tax: number; total: number; currency: string; items: QuotationItem[]; createdAt: Date | null; createdBy: string; createdByName: string }
export type SaleInput = { sourceQuotationId?: string; customerName: string; customerEmail: string; customerPhone: string; notes: string; items: Array<{ productId: string; quantity: number }> }

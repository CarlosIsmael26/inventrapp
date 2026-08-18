import { auth } from '../config/firebase'
import type { Quotation, QuotationInput } from '../types/quotation'

type ApiQuotation = Omit<Quotation, 'validUntil' | 'createdAt' | 'convertedAt'> & { validUntil: string; createdAt: string | null; convertedAt?: string | null }
type ApiResult = { message?: string; quotations?: ApiQuotation[]; quotation?: ApiQuotation }

async function request(businessId: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: QuotationInput, quotationId?: string): Promise<ApiResult> {
  const user = auth.currentUser
  if (!user) throw new Error('Tu sesión ha expirado.')
  const response = await fetch(`/api/quotations?businessId=${encodeURIComponent(businessId)}${quotationId ? `&quotationId=${encodeURIComponent(quotationId)}` : ''}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text()
  let result: ApiResult = {}
  if (text) { try { result = JSON.parse(text) as ApiResult } catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) } }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible completar la operación.')
  return result
}

function mapQuotation(quotation: ApiQuotation): Quotation {
  return { ...quotation, validUntil: new Date(quotation.validUntil), createdAt: quotation.createdAt ? new Date(quotation.createdAt) : null, convertedAt: quotation.convertedAt ? new Date(quotation.convertedAt) : null }
}

export async function getQuotations(businessId: string): Promise<Quotation[]> { return ((await request(businessId, 'GET')).quotations ?? []).map(mapQuotation) }
export async function createQuotation(businessId: string, input: QuotationInput): Promise<{ message: string; quotation: Quotation }> {
  const result = await request(businessId, 'POST', input)
  if (!result.quotation) throw new Error('El servidor no devolvió la cotización creada.')
  return { message: result.message ?? 'Cotización creada correctamente.', quotation: mapQuotation(result.quotation) }
}
export async function updateQuotation(businessId: string, quotationId: string, input: QuotationInput): Promise<{ message: string; quotation: Quotation }> { const result = await request(businessId, 'PATCH', input, quotationId); if (!result.quotation) throw new Error('El servidor no devolvió la cotización actualizada.'); return { message: result.message ?? 'Cotización actualizada correctamente.', quotation: mapQuotation(result.quotation) } }
export async function deleteQuotation(businessId: string, quotationId: string): Promise<string> { return (await request(businessId, 'DELETE', undefined, quotationId)).message ?? 'Cotización eliminada correctamente.' }

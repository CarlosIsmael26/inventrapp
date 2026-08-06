import { auth } from '../config/firebase'
import type { Quotation, QuotationInput } from '../types/quotation'

type ApiQuotation = Omit<Quotation, 'validUntil' | 'createdAt'> & { validUntil: string; createdAt: string | null }
type ApiResult = { message?: string; quotations?: ApiQuotation[]; quotation?: ApiQuotation }

async function request(businessId: string, method: 'GET' | 'POST', body?: QuotationInput): Promise<ApiResult> {
  const user = auth.currentUser
  if (!user) throw new Error('Tu sesión ha expirado.')
  const response = await fetch(`/api/quotations?businessId=${encodeURIComponent(businessId)}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text()
  let result: ApiResult = {}
  if (text) { try { result = JSON.parse(text) as ApiResult } catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) } }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible completar la operación.')
  return result
}

function mapQuotation(quotation: ApiQuotation): Quotation {
  return { ...quotation, validUntil: new Date(quotation.validUntil), createdAt: quotation.createdAt ? new Date(quotation.createdAt) : null }
}

export async function getQuotations(businessId: string): Promise<Quotation[]> { return ((await request(businessId, 'GET')).quotations ?? []).map(mapQuotation) }
export async function createQuotation(businessId: string, input: QuotationInput): Promise<{ message: string; quotation: Quotation }> {
  const result = await request(businessId, 'POST', input)
  if (!result.quotation) throw new Error('El servidor no devolvió la cotización creada.')
  return { message: result.message ?? 'Cotización creada correctamente.', quotation: mapQuotation(result.quotation) }
}

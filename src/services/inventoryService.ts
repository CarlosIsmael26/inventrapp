import { auth } from '../config/firebase'
import type { InventoryProduct, InventoryProductInput } from '../types/inventory'

type ApiProduct = Omit<InventoryProduct, 'createdAt' | 'updatedAt'> & { createdAt: string | null; updatedAt: string | null }
type ApiResult = { message?: string; products?: ApiProduct[] }

async function request(businessId: string, method: 'GET' | 'POST', body?: unknown): Promise<ApiResult> {
  const user = auth.currentUser
  if (!user) throw new Error('Tu sesión ha expirado.')
  const response = await fetch(`/api/inventory?businessId=${encodeURIComponent(businessId)}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text(); let result: ApiResult = {}
  if (text) { try { result = JSON.parse(text) as ApiResult } catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) } }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible completar la operación.')
  return result
}

export async function getInventoryProducts(businessId: string): Promise<InventoryProduct[]> {
  return ((await request(businessId, 'GET')).products ?? []).map((product) => ({ ...product, createdAt: product.createdAt ? new Date(product.createdAt) : null, updatedAt: product.updatedAt ? new Date(product.updatedAt) : null }))
}
export async function importInventoryProducts(businessId: string, products: InventoryProductInput[]): Promise<string> {
  return (await request(businessId, 'POST', { products })).message ?? 'Productos importados correctamente.'
}

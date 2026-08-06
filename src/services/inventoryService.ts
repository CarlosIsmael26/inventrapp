import { auth } from '../config/firebase'
import type { InventoryAudit, InventoryAuditMovement, InventoryProduct, InventoryProductInput, ManualInventoryProductInput } from '../types/inventory'

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

async function requestProduct(businessId: string, method: 'POST' | 'PATCH' | 'DELETE', productId?: string, body?: ManualInventoryProductInput): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error('Tu sesión ha expirado.')
  const query = new URLSearchParams({ businessId, ...(productId ? { productId } : {}) })
  const response = await fetch(`/api/products?${query}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text(); let result: ApiResult = {}
  if (text) { try { result = JSON.parse(text) as ApiResult } catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) } }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible completar la operación.')
  return result.message ?? 'Operación completada correctamente.'
}

export function createInventoryProduct(businessId: string, input: ManualInventoryProductInput): Promise<string> { return requestProduct(businessId, 'POST', undefined, input) }
export function updateInventoryProduct(businessId: string, productId: string, input: ManualInventoryProductInput): Promise<string> { return requestProduct(businessId, 'PATCH', productId, input) }
export function deleteInventoryProduct(businessId: string, productId: string): Promise<string> { return requestProduct(businessId, 'DELETE', productId) }

export async function getInventoryAudit(businessId: string): Promise<InventoryAudit> {
  const user = auth.currentUser
  if (!user) throw new Error('Tu sesión ha expirado.')
  const response = await fetch(`/api/inventory-audit?businessId=${encodeURIComponent(businessId)}`, { headers: { Authorization: `Bearer ${await user.getIdToken()}` } })
  const text = await response.text()
  let result: { message?: string; business?: InventoryAudit['business']; generatedAt?: string; products?: ApiProduct[]; movements?: Array<Omit<InventoryAuditMovement, 'createdAt'> & { createdAt: string | null }>; movementLimitReached?: boolean } = {}
  if (text) { try { result = JSON.parse(text) as typeof result } catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) } }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible preparar la auditoría del inventario.')
  if (!result.business || !result.generatedAt) throw new Error('La auditoría recibida está incompleta.')
  return {
    business: result.business,
    generatedAt: new Date(result.generatedAt),
    products: (result.products ?? []).map((product) => ({ ...product, createdAt: product.createdAt ? new Date(product.createdAt) : null, updatedAt: product.updatedAt ? new Date(product.updatedAt) : null })),
    movements: (result.movements ?? []).map((movement) => ({ ...movement, createdAt: movement.createdAt ? new Date(movement.createdAt) : null })),
    movementLimitReached: Boolean(result.movementLimitReached),
  }
}

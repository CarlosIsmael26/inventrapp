import { auth } from '../config/firebase'
import type { Sale, SaleInput } from '../types/sale'

type ApiSale = Omit<Sale, 'createdAt'> & { createdAt: string | null }
type ApiResult = { message?: string; sales?: ApiSale[]; sale?: ApiSale }
async function request(businessId: string, method: 'GET' | 'POST', body?: SaleInput): Promise<ApiResult> { const user = auth.currentUser; if (!user) throw new Error('Tu sesión ha expirado.'); const response = await fetch(`/api/sales?businessId=${encodeURIComponent(businessId)}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); const text = await response.text(); let result: ApiResult = {}; if (text) { try { result = JSON.parse(text) as ApiResult } catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) } } if (!response.ok) throw new Error(result.message ?? 'No fue posible completar la operación.'); return result }
const mapSale = (sale: ApiSale): Sale => ({ ...sale, createdAt: sale.createdAt ? new Date(sale.createdAt) : null })
export async function getSales(businessId: string): Promise<Sale[]> { return ((await request(businessId, 'GET')).sales ?? []).map(mapSale) }
export async function createSale(businessId: string, input: SaleInput): Promise<{ message: string; sale: Sale }> { const result = await request(businessId, 'POST', input); if (!result.sale) throw new Error('El servidor no devolvió la venta creada.'); return { message: result.message ?? 'Venta registrada correctamente.', sale: mapSale(result.sale) } }

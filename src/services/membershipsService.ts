import { auth } from '../config/firebase'
import type { BusinessRole, BusinessUserIdentity, Membership, MembershipStatus, UserBusinessMembership } from '../types/membership'

type ApiMembership = Omit<Membership, 'createdAt' | 'updatedAt'> & { createdAt: string | null; updatedAt: string | null }
type ApiResult = { message?: string; memberships?: ApiMembership[] | UserBusinessMembership[]; user?: BusinessUserIdentity }

async function request(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<ApiResult> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Tu sesión ha expirado.')
  const response = await fetch(path, { method, headers: { Authorization: `Bearer ${await currentUser.getIdToken()}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await response.text()
  let result: ApiResult = {}
  if (text) {
    try { result = JSON.parse(text) as ApiResult }
    catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) }
  }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible completar la operación.')
  return result
}

export async function getBusinessMemberships(businessId: string): Promise<Membership[]> {
  const result = await request(`/api/businesses/${encodeURIComponent(businessId)}/memberships`, 'GET')
  return ((result.memberships ?? []) as ApiMembership[]).map((item) => ({ ...item, createdAt: item.createdAt ? new Date(item.createdAt) : null, updatedAt: item.updatedAt ? new Date(item.updatedAt) : null }))
}
export async function createMembership(businessId: string, userId: string, role: BusinessRole): Promise<string> {
  return (await request(`/api/businesses/${encodeURIComponent(businessId)}/memberships`, 'POST', { userId, role })).message ?? 'Miembro asignado correctamente.'
}
export async function updateMembership(businessId: string, id: string, role: BusinessRole, status: MembershipStatus): Promise<string> {
  return (await request(`/api/businesses/${encodeURIComponent(businessId)}/memberships/${encodeURIComponent(id)}`, 'PATCH', { role, status })).message ?? 'Membresía actualizada correctamente.'
}
export async function deleteMembership(businessId: string, id: string): Promise<string> {
  return (await request(`/api/businesses/${encodeURIComponent(businessId)}/memberships/${encodeURIComponent(id)}`, 'DELETE')).message ?? 'Miembro retirado correctamente.'
}
export async function getMyMemberships(): Promise<{ memberships: UserBusinessMembership[]; user: BusinessUserIdentity | null }> {
  const result = await request('/api/my-memberships', 'GET')
  return { memberships: (result.memberships ?? []) as UserBusinessMembership[], user: result.user ?? null }
}

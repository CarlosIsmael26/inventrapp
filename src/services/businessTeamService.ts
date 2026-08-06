import { auth } from '../config/firebase'
import type { BusinessTeamMember, CreateBusinessTeamUserInput, TeamRole, TeamStatus } from '../types/businessTeam'

type ApiMember = Omit<BusinessTeamMember, 'createdAt'> & { createdAt: string | null }
type ApiResult = { message?: string; members?: ApiMember[] }

async function request(businessId: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown): Promise<ApiResult> {
  const user = auth.currentUser
  if (!user) throw new Error('Tu sesión ha expirado.')
  const response = await fetch(`/api/business-team?businessId=${encodeURIComponent(businessId)}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text(); let result: ApiResult = {}
  if (text) { try { result = JSON.parse(text) as ApiResult } catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) } }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible completar la operación.')
  return result
}

export async function getBusinessTeam(businessId: string): Promise<BusinessTeamMember[]> {
  return ((await request(businessId, 'GET')).members ?? []).map((member) => ({ ...member, createdAt: member.createdAt ? new Date(member.createdAt) : null }))
}
export async function createBusinessTeamUser(businessId: string, input: CreateBusinessTeamUserInput): Promise<string> {
  return (await request(businessId, 'POST', input)).message ?? 'Usuario creado correctamente.'
}
export async function updateBusinessTeamMember(businessId: string, userId: string, role: TeamRole, status: TeamStatus): Promise<string> {
  return (await request(businessId, 'PATCH', { userId, role, status })).message ?? 'Acceso actualizado correctamente.'
}

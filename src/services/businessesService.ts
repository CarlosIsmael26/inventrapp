import { auth } from '../config/firebase'
import type { Business, BusinessInput } from '../types/business'

type ApiBusiness = Omit<Business, 'createdAt' | 'updatedAt'> & {
  createdAt: string | null
  updatedAt: string | null
}

type ApiResponse = {
  message?: string
  businesses?: ApiBusiness[]
}

async function requestBusinesses(
  path: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: BusinessInput,
): Promise<ApiResponse> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Tu sesión ha expirado.')
  const token = await currentUser.getIdToken()
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let result: ApiResponse = {}
  if (text) {
    try {
      result = JSON.parse(text) as ApiResponse
    } catch {
      throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`)
    }
  }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible completar la operación.')
  return result
}

export async function getBusinesses(): Promise<Business[]> {
  const result = await requestBusinesses('/api/businesses', 'GET')
  return (result.businesses ?? []).map((business) => ({
    ...business,
    createdAt: business.createdAt ? new Date(business.createdAt) : null,
    updatedAt: business.updatedAt ? new Date(business.updatedAt) : null,
  }))
}

export async function createBusiness(input: BusinessInput): Promise<string> {
  const result = await requestBusinesses('/api/businesses', 'POST', input)
  return result.message ?? 'Negocio creado correctamente.'
}

export async function updateBusiness(id: string, input: BusinessInput): Promise<string> {
  const result = await requestBusinesses(`/api/businesses/${encodeURIComponent(id)}`, 'PATCH', input)
  return result.message ?? 'Negocio actualizado correctamente.'
}

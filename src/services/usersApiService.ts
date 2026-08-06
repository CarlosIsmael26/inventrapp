import { auth } from '../config/firebase'
import type { PlatformRole, PlatformUser, UserStatus } from '../types/user'

export type CreateUserInput = {
  displayName: string
  email: string
  temporaryPassword: string
  platformRole: PlatformRole
  status: UserStatus
}

export type UpdateUserInput = {
  uid: string
  displayName: string
  platformRole: PlatformRole
  status: UserStatus
}

type ApiUser = Omit<PlatformUser, 'createdAt' | 'updatedAt'> & {
  createdAt: string | null
  updatedAt: string | null
}

type ApiResult = {
  message?: string
  user?: ApiUser
  users?: ApiUser[]
  resetLink?: string
}

async function requestUsersApi(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<ApiResult> {
  const currentUser = auth.currentUser

  if (!currentUser) {
    throw new Error('Tu sesión ha expirado.')
  }

  const idToken = await currentUser.getIdToken()
  const response = await fetch('/api/users', {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const responseText = await response.text()
  let result: ApiResult = {}

  if (responseText) {
    try {
      result = JSON.parse(responseText) as ApiResult
    } catch {
      throw new Error(
        response.ok
          ? 'El servidor devolvió una respuesta inválida.'
          : `Error del servidor (${response.status}).`,
      )
    }
  }

  if (!response.ok) {
    throw new Error(
      result.message ?? `No fue posible completar la operación (${response.status}).`,
    )
  }

  return result
}

function mapApiUser(user: ApiUser): PlatformUser {
  return {
    ...user,
    createdAt: user.createdAt ? new Date(user.createdAt) : null,
    updatedAt: user.updatedAt ? new Date(user.updatedAt) : null,
  }
}

export async function getPlatformUsers(): Promise<PlatformUser[]> {
  const result = await requestUsersApi('GET')
  return (result.users ?? []).map(mapApiUser)
}

export async function createPlatformUser(
  input: CreateUserInput,
): Promise<string> {
  const result = await requestUsersApi('POST', input)
  return result.message ?? 'Usuario creado correctamente.'
}

export async function updatePlatformUser(
  input: UpdateUserInput,
): Promise<string> {
  const result = await requestUsersApi('PATCH', input)
  return result.message ?? 'Usuario actualizado correctamente.'
}

export async function deletePlatformUser(uid: string): Promise<string> {
  const result = await requestUsersApi('DELETE', { uid })
  return result.message ?? 'Usuario eliminado correctamente.'
}

export async function generateUserPasswordResetLink(
  uid: string,
): Promise<{ message: string; resetLink: string }> {
  const result = await requestUsersApi('PUT', { uid })

  if (!result.resetLink) {
    throw new Error('El servidor no devolvió el enlace de restablecimiento.')
  }

  return {
    message: result.message ?? 'Enlace generado correctamente.',
    resetLink: result.resetLink,
  }
}

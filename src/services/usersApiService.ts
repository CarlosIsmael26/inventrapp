import { auth } from '../config/firebase'

import type {
  PlatformRole,
  UserStatus,
} from '../types/user'

export type CreateUserInput = {
  displayName: string
  email: string
  temporaryPassword: string
  platformRole: PlatformRole
  status: UserStatus
}

type CreatedUser = {
  uid: string
  displayName: string
  email: string
  platformRole: PlatformRole
  status: UserStatus
}

type CreateUserResponse = {
  message: string
  user: CreatedUser
}

export async function createPlatformUser(
  input: CreateUserInput,
): Promise<CreateUserResponse> {
  const currentUser = auth.currentUser

  if (!currentUser) {
    throw new Error('Tu sesión ha expirado.')
  }

  const idToken = await currentUser.getIdToken()

  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  })

  const responseText = await response.text()

  let result: {
    message?: string
    user?: CreatedUser
  } = {}

  if (responseText) {
    try {
      result = JSON.parse(responseText)
    } catch {
      if (!response.ok) {
        throw new Error(
          `Error del servidor (${response.status}): ${responseText}`,
        )
      }

      throw new Error(
        'El servidor devolvió una respuesta inválida.',
      )
    }
  }

  if (!response.ok) {
    throw new Error(
      result.message ??
        `No fue posible crear el usuario (${response.status}).`,
    )
  }

  if (!result.user) {
    throw new Error(
      'La respuesta del servidor no contiene el usuario creado.',
    )
  }

  return {
    message:
      result.message ?? 'Usuario creado correctamente.',
    user: result.user,
  }
}
import type { DecodedIdToken } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

const PLATFORM_ROLES = [
  'user',
  'support',
  'super_admin',
] as const
const USER_STATUSES = ['active', 'blocked'] as const

type PlatformRole = (typeof PLATFORM_ROLES)[number]
type UserStatus = (typeof USER_STATUSES)[number]

type CreateUserBody = {
  displayName: string
  email: string
  temporaryPassword: string
  platformRole: PlatformRole
  status: UserStatus
}

type ApiRequest = IncomingMessage & {
  body?: unknown
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function json(
  response: ServerResponse,
  data: unknown,
  status = 200,
): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(data))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlatformRole(value: unknown): value is PlatformRole {
  return (
    typeof value === 'string' &&
    PLATFORM_ROLES.some((role) => role === value)
  )
}

function isUserStatus(value: unknown): value is UserStatus {
  return (
    typeof value === 'string' &&
    USER_STATUSES.some((status) => status === value)
  )
}

function parseCreateUserBody(value: unknown): CreateUserBody {
  if (!isRecord(value)) {
    throw new ApiError(400, 'La solicitud no es válida.')
  }

  const displayName =
    typeof value.displayName === 'string'
      ? value.displayName.trim()
      : ''
  const email =
    typeof value.email === 'string'
      ? value.email.trim().toLowerCase()
      : ''
  const temporaryPassword =
    typeof value.temporaryPassword === 'string'
      ? value.temporaryPassword
      : ''

  if (!displayName || !email || !temporaryPassword) {
    throw new ApiError(
      400,
      'Nombre, correo y contraseña son obligatorios.',
    )
  }

  if (displayName.length > 120) {
    throw new ApiError(
      400,
      'El nombre no puede superar los 120 caracteres.',
    )
  }

  if (temporaryPassword.length < 6) {
    throw new ApiError(
      400,
      'La contraseña debe tener al menos 6 caracteres.',
    )
  }

  if (!isPlatformRole(value.platformRole)) {
    throw new ApiError(400, 'El rol de plataforma no es válido.')
  }

  if (!isUserStatus(value.status)) {
    throw new ApiError(400, 'El estado del usuario no es válido.')
  }

  return {
    displayName,
    email,
    temporaryPassword,
    platformRole: value.platformRole,
    status: value.status,
  }
}

async function verifySuperAdmin(
  request: ApiRequest,
): Promise<DecodedIdToken> {
  const authorization = request.headers.authorization

  if (
    typeof authorization !== 'string' ||
    !authorization.startsWith('Bearer ')
  ) {
    throw new ApiError(401, 'Debes iniciar sesión.')
  }

  const idToken = authorization.slice(7).trim()

  if (!idToken) {
    throw new ApiError(401, 'Debes iniciar sesión.')
  }

  const { auth, db } = getFirebaseAdmin()

  let decodedToken: DecodedIdToken

  try {
    decodedToken = await auth.verifyIdToken(idToken, true)
  } catch {
    throw new ApiError(
      401,
      'Tu sesión no es válida o ha expirado.',
    )
  }

  const profile = await db
    .collection('users')
    .doc(decodedToken.uid)
    .get()

  if (
    !profile.exists ||
    profile.data()?.platformRole !== 'super_admin' ||
    profile.data()?.status !== 'active'
  ) {
    throw new ApiError(
      403,
      'No tienes permisos para crear usuarios.',
    )
  }

  return decodedToken
}

async function readRequestBody(request: ApiRequest): Promise<unknown> {
  if (request.body !== undefined) {
    return request.body
  }

  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')

  if (!rawBody) {
    throw new ApiError(400, 'La solicitud no contiene datos.')
  }

  return JSON.parse(rawBody) as unknown
}

function getFirebaseErrorCode(error: unknown): string {
  if (isRecord(error) && typeof error.code === 'string') {
    return error.code
  }

  return ''
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.setHeader('Allow', 'POST')
    response.setHeader('Cache-Control', 'no-store')
    response.end()
    return
  }

  let createdUid: string | null = null

  try {
    const authenticatedAdmin = await verifySuperAdmin(request)
    const body = parseCreateUserBody(await readRequestBody(request))
    const { auth, db } = getFirebaseAdmin()

    const newUser = await auth.createUser({
      displayName: body.displayName,
      email: body.email,
      password: body.temporaryPassword,
      disabled: body.status === 'blocked',
    })

    createdUid = newUser.uid

    await db.collection('users').doc(newUser.uid).set({
      displayName: body.displayName,
      email: body.email,
      platformRole: body.platformRole,
      status: body.status,
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: authenticatedAdmin.uid,
      updatedBy: authenticatedAdmin.uid,
    })

    return json(
      response,
      {
        message: 'Usuario creado correctamente.',
        user: {
          uid: newUser.uid,
          displayName: body.displayName,
          email: body.email,
          platformRole: body.platformRole,
          status: body.status,
        },
      },
      201,
    )
  } catch (error) {
    if (createdUid) {
      const { auth } = getFirebaseAdmin()
      await auth.deleteUser(createdUid).catch((rollbackError) => {
        console.error(
          'No fue posible revertir el usuario creado:',
          rollbackError,
        )
      })
    }

    if (error instanceof ApiError) {
      return json(response, { message: error.message }, error.status)
    }

    console.error('Error creando usuario:', error)

    const errorCode = getFirebaseErrorCode(error)

    if (errorCode === 'auth/email-already-exists') {
      return json(
        response,
        {
          message: 'El correo electrónico ya está registrado.',
        },
        409,
      )
    }

    if (
      error instanceof SyntaxError ||
      errorCode === 'auth/invalid-email' ||
      errorCode === 'auth/invalid-password'
    ) {
      return json(
        response,
        { message: 'Los datos del usuario no son válidos.' },
        400,
      )
    }

    return json(
      response,
      {
        message:
          'No fue posible crear el usuario. Revisa la configuración del servidor.',
      },
      500,
    )
  }
}

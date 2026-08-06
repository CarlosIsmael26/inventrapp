import type { DecodedIdToken, UserRecord } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

const PLATFORM_ROLES = ['user', 'support', 'super_admin'] as const
const USER_STATUSES = ['active', 'blocked'] as const

type PlatformRole = (typeof PLATFORM_ROLES)[number]
type UserStatus = (typeof USER_STATUSES)[number]
type ApiRequest = IncomingMessage & { body?: unknown }

type CreateUserInput = {
  displayName: string
  email: string
  temporaryPassword: string
  platformRole: PlatformRole
  status: UserStatus
}

type UpdateUserInput = {
  uid: string
  displayName: string
  platformRole: PlatformRole
  status: UserStatus
}

class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function json(response: ServerResponse, data: unknown, status = 200): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(data))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlatformRole(value: unknown): value is PlatformRole {
  return typeof value === 'string' && PLATFORM_ROLES.some((role) => role === value)
}

function isUserStatus(value: unknown): value is UserStatus {
  return typeof value === 'string' && USER_STATUSES.some((status) => status === value)
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, message)
  }

  return value.trim()
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

function parseCreateUser(value: unknown): CreateUserInput {
  if (!isRecord(value)) {
    throw new ApiError(400, 'La solicitud no es válida.')
  }

  const displayName = requiredString(value.displayName, 'El nombre es obligatorio.')
  const email = requiredString(value.email, 'El correo es obligatorio.').toLowerCase()
  const temporaryPassword = requiredString(
    value.temporaryPassword,
    'La contraseña temporal es obligatoria.',
  )

  if (displayName.length > 120) {
    throw new ApiError(400, 'El nombre no puede superar los 120 caracteres.')
  }

  if (temporaryPassword.length < 6) {
    throw new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.')
  }

  if (!isPlatformRole(value.platformRole) || !isUserStatus(value.status)) {
    throw new ApiError(400, 'El rol o estado no es válido.')
  }

  return {
    displayName,
    email,
    temporaryPassword,
    platformRole: value.platformRole,
    status: value.status,
  }
}

function parseUpdateUser(value: unknown): UpdateUserInput {
  if (!isRecord(value)) {
    throw new ApiError(400, 'La solicitud no es válida.')
  }

  const uid = requiredString(value.uid, 'El usuario es obligatorio.')
  const displayName = requiredString(value.displayName, 'El nombre es obligatorio.')

  if (displayName.length > 120) {
    throw new ApiError(400, 'El nombre no puede superar los 120 caracteres.')
  }

  if (!isPlatformRole(value.platformRole) || !isUserStatus(value.status)) {
    throw new ApiError(400, 'El rol o estado no es válido.')
  }

  return {
    uid,
    displayName,
    platformRole: value.platformRole,
    status: value.status,
  }
}

function parseUid(value: unknown): string {
  if (!isRecord(value)) {
    throw new ApiError(400, 'La solicitud no es válida.')
  }

  return requiredString(value.uid, 'El usuario es obligatorio.')
}

async function verifySuperAdmin(request: ApiRequest): Promise<DecodedIdToken> {
  const authorization = request.headers.authorization

  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    throw new ApiError(401, 'Debes iniciar sesión.')
  }

  const { auth, db } = getFirebaseAdmin()
  let decodedToken: DecodedIdToken

  try {
    decodedToken = await auth.verifyIdToken(authorization.slice(7).trim(), true)
  } catch {
    throw new ApiError(401, 'Tu sesión no es válida o ha expirado.')
  }

  const profile = await db.collection('users').doc(decodedToken.uid).get()

  if (
    !profile.exists ||
    profile.data()?.platformRole !== 'super_admin' ||
    profile.data()?.status !== 'active'
  ) {
    throw new ApiError(403, 'No tienes permisos para administrar usuarios.')
  }

  return decodedToken
}

function getFirebaseErrorCode(error: unknown): string {
  return isRecord(error) && typeof error.code === 'string' ? error.code : ''
}

function assertCanChangeCurrentUser(
  adminUid: string,
  targetUid: string,
  platformRole: PlatformRole,
  status?: UserStatus,
): void {
  if (adminUid === targetUid && status === 'blocked') {
    throw new ApiError(400, 'No puedes bloquear tu propio usuario.')
  }

  if (adminUid === targetUid && platformRole !== 'super_admin') {
    throw new ApiError(400, 'No puedes quitarte el rol de Super Admin.')
  }
}

async function listUsers(response: ServerResponse): Promise<void> {
  const { db } = getFirebaseAdmin()
  const snapshot = await db.collection('users').get()
  const documents = [...snapshot.docs].sort((first, second) => {
    const firstCreatedAt = first.data().createdAt?.toMillis?.() ?? 0
    const secondCreatedAt = second.data().createdAt?.toMillis?.() ?? 0
    return secondCreatedAt - firstCreatedAt
  })

  json(response, {
    users: documents.map((document) => {
      const data = document.data()

      return {
        uid: document.id,
        displayName: data.displayName ?? 'Usuario sin nombre',
        email: data.email ?? '',
        platformRole: data.platformRole ?? 'user',
        status: data.status ?? 'active',
        businessName: data.businessName ?? 'Sin negocio',
        businessRole: data.businessRole ?? 'Sin asignar',
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
      }
    }),
  })
}

async function createUser(
  response: ServerResponse,
  value: unknown,
  adminUid: string,
): Promise<void> {
  const input = parseCreateUser(value)
  const { auth, db } = getFirebaseAdmin()
  let createdUser: UserRecord | null = null

  try {
    createdUser = await auth.createUser({
      displayName: input.displayName,
      email: input.email,
      password: input.temporaryPassword,
      disabled: input.status === 'blocked',
    })

    await db.collection('users').doc(createdUser.uid).set({
      displayName: input.displayName,
      email: input.email,
      platformRole: input.platformRole,
      status: input.status,
      mustChangePassword: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: adminUid,
      updatedBy: adminUid,
    })
  } catch (error) {
    if (createdUser) {
      await auth.deleteUser(createdUser.uid).catch((rollbackError) => {
        console.error('No fue posible revertir el usuario creado:', rollbackError)
      })
    }

    throw error
  }

  json(
    response,
    {
      message: 'Usuario creado correctamente.',
      user: {
        uid: createdUser.uid,
        displayName: input.displayName,
        email: input.email,
        platformRole: input.platformRole,
        status: input.status,
      },
    },
    201,
  )
}

async function updateUser(
  response: ServerResponse,
  value: unknown,
  adminUid: string,
): Promise<void> {
  const input = parseUpdateUser(value)
  assertCanChangeCurrentUser(
    adminUid,
    input.uid,
    input.platformRole,
    input.status,
  )

  const { auth, db } = getFirebaseAdmin()
  const previousAuthUser = await auth.getUser(input.uid)
  const profileReference = db.collection('users').doc(input.uid)

  await auth.updateUser(input.uid, {
    displayName: input.displayName,
    disabled: input.status === 'blocked',
  })

  try {
    await profileReference.update({
      displayName: input.displayName,
      platformRole: input.platformRole,
      status: input.status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminUid,
    })
  } catch (error) {
    await auth
      .updateUser(input.uid, {
        displayName: previousAuthUser.displayName,
        disabled: previousAuthUser.disabled,
      })
      .catch((rollbackError) => {
        console.error('No fue posible revertir la actualización:', rollbackError)
      })
    throw error
  }

  json(response, { message: 'Usuario actualizado correctamente.' })
}

async function deleteUser(
  response: ServerResponse,
  value: unknown,
  adminUid: string,
): Promise<void> {
  const uid = parseUid(value)

  if (uid === adminUid) {
    throw new ApiError(400, 'No puedes eliminar tu propio usuario.')
  }

  const { auth, db } = getFirebaseAdmin()
  const profileReference = db.collection('users').doc(uid)
  const [authUser, profile] = await Promise.all([
    auth.getUser(uid),
    profileReference.get(),
  ])

  await auth.updateUser(uid, { disabled: true })

  try {
    await profileReference.delete()
    await auth.deleteUser(uid)
  } catch (error) {
    if (profile.exists) {
      await profileReference.set(profile.data() ?? {}).catch((rollbackError) => {
        console.error('No fue posible restaurar el perfil:', rollbackError)
      })
    }

    await auth.updateUser(uid, { disabled: authUser.disabled }).catch((rollbackError) => {
      console.error('No fue posible restaurar el acceso:', rollbackError)
    })
    throw error
  }

  json(response, { message: 'Usuario eliminado correctamente.' })
}

async function createPasswordResetLink(
  response: ServerResponse,
  value: unknown,
): Promise<void> {
  const uid = parseUid(value)
  const { auth } = getFirebaseAdmin()
  const user = await auth.getUser(uid)

  if (!user.email) {
    throw new ApiError(400, 'El usuario no tiene un correo registrado.')
  }

  const resetLink = await auth.generatePasswordResetLink(user.email)
  json(response, { message: 'Enlace generado correctamente.', resetLink })
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse,
): Promise<void> {
  try {
    const authenticatedAdmin = await verifySuperAdmin(request)

    if (request.method === 'GET') {
      return listUsers(response)
    }

    const body = await readRequestBody(request)

    if (request.method === 'POST') {
      return createUser(response, body, authenticatedAdmin.uid)
    }

    if (request.method === 'PATCH') {
      return updateUser(response, body, authenticatedAdmin.uid)
    }

    if (request.method === 'DELETE') {
      return deleteUser(response, body, authenticatedAdmin.uid)
    }

    if (request.method === 'PUT') {
      return createPasswordResetLink(response, body)
    }

    response.statusCode = 405
    response.setHeader('Allow', 'GET, POST, PATCH, PUT, DELETE')
    response.end()
  } catch (error) {
    if (error instanceof ApiError) {
      return json(response, { message: error.message }, error.status)
    }

    console.error('Error administrando usuarios:', error)
    const errorCode = getFirebaseErrorCode(error)

    if (errorCode === 'auth/email-already-exists') {
      return json(response, { message: 'El correo ya está registrado.' }, 409)
    }

    if (errorCode === 'auth/user-not-found' || errorCode === 'not-found') {
      return json(response, { message: 'El usuario ya no existe.' }, 404)
    }

    if (
      error instanceof SyntaxError ||
      errorCode === 'auth/invalid-email' ||
      errorCode === 'auth/invalid-password'
    ) {
      return json(response, { message: 'Los datos enviados no son válidos.' }, 400)
    }

    return json(
      response,
      { message: 'No fue posible completar la operación.' },
      500,
    )
  }
}

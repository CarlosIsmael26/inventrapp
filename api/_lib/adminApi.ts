import type { DecodedIdToken } from 'firebase-admin/auth'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { getFirebaseAdmin } from './firebaseAdmin.js'

export type ApiRequest = IncomingMessage & { body?: unknown }

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export function json(response: ServerResponse, data: unknown, status = 200): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(data))
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function requiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, message)
  return value.trim()
}

export function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function readRequestBody(request: ApiRequest): Promise<unknown> {
  if (request.body !== undefined) return request.body
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const rawBody = Buffer.concat(chunks).toString('utf8')
  if (!rawBody) throw new ApiError(400, 'La solicitud no contiene datos.')
  return JSON.parse(rawBody) as unknown
}

export async function verifySuperAdmin(request: ApiRequest): Promise<DecodedIdToken> {
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
  if (!profile.exists || profile.data()?.platformRole !== 'super_admin' || profile.data()?.status !== 'active') {
    throw new ApiError(403, 'No tienes permisos para administrar negocios.')
  }
  return decodedToken
}

export function handleAdminApiError(response: ServerResponse, error: unknown): void {
  if (error instanceof ApiError) return json(response, { message: error.message }, error.status)
  console.error('Error en operación administrativa:', error)
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : ''
  if (code === 'not-found') return json(response, { message: 'El registro ya no existe.' }, 404)
  if (error instanceof SyntaxError) return json(response, { message: 'Los datos enviados no son válidos.' }, 400)
  json(response, { message: 'No fue posible completar la operación.' }, 500)
}

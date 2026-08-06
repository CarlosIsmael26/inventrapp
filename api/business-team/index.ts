import type { UserRecord } from 'firebase-admin/auth'
import { FieldValue } from 'firebase-admin/firestore'
import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, isRecord, json, readRequestBody, requiredString } from '../_lib/adminApi.js'
import { verifyBusinessManager } from '../_lib/businessAccess.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

const roles = ['admin', 'cashier', 'seller', 'warehouse', 'viewer'] as const
const statuses = ['active', 'inactive'] as const
type TeamRole = typeof roles[number]
type TeamStatus = typeof statuses[number]

function parseRole(value: unknown): TeamRole {
  if (typeof value !== 'string' || !roles.includes(value as TeamRole)) throw new ApiError(400, 'El rol no es válido.')
  return value as TeamRole
}
function getBusinessId(request: ApiRequest): string { return requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('businessId'), 'El negocio es obligatorio.') }

async function listTeam(businessId: string, response: ServerResponse): Promise<void> {
  const { db } = getFirebaseAdmin()
  const snapshot = await db.collection('memberships').where('businessId', '==', businessId).get()
  const userIds = [...new Set(snapshot.docs.map((item) => String(item.data().userId)))]
  const profiles = userIds.length ? await db.getAll(...userIds.map((uid) => db.collection('users').doc(uid))) : []
  const users = new Map(profiles.map((profile) => [profile.id, profile.data()]))
  const members = snapshot.docs.map((document) => {
    const data = document.data(); const user = users.get(String(data.userId))
    return { id: document.id, userId: data.userId, displayName: user?.displayName ?? 'Usuario sin nombre', email: user?.email ?? '', role: data.role, status: data.status, createdAt: data.createdAt?.toDate?.().toISOString() ?? null }
  }).sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'))
  json(response, { members })
}

async function createTeamUser(request: ApiRequest, response: ServerResponse, businessId: string, actorUid: string, actorRole: 'owner' | 'admin'): Promise<void> {
  const body = await readRequestBody(request)
  if (!isRecord(body)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const displayName = requiredString(body.displayName, 'El nombre es obligatorio.')
  const email = requiredString(body.email, 'El correo es obligatorio.').toLowerCase()
  const password = requiredString(body.temporaryPassword, 'La contraseña temporal es obligatoria.')
  const role = parseRole(body.role)
  if (actorRole === 'admin' && role === 'admin') throw new ApiError(403, 'Solo el propietario puede crear otros administradores.')
  if (displayName.length > 120) throw new ApiError(400, 'El nombre es demasiado largo.')
  if (password.length < 6) throw new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.')
  const { auth, db } = getFirebaseAdmin()
  let createdUser: UserRecord | null = null
  try {
    createdUser = await auth.createUser({ displayName, email, password })
    const membershipId = `${businessId}__${createdUser.uid}`
    const batch = db.batch()
    batch.create(db.collection('users').doc(createdUser.uid), { displayName, email, platformRole: 'user', status: 'active', mustChangePassword: true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: actorUid, updatedBy: actorUid })
    batch.create(db.collection('memberships').doc(membershipId), { businessId, userId: createdUser.uid, role, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: actorUid, updatedBy: actorUid })
    await batch.commit()
  } catch (error) {
    if (createdUser) await auth.deleteUser(createdUser.uid).catch((rollbackError) => console.error('No fue posible revertir el usuario:', rollbackError))
    throw error
  }
  json(response, { message: 'Usuario del negocio creado correctamente.' }, 201)
}

async function updateMember(request: ApiRequest, response: ServerResponse, businessId: string, actorUid: string, actorRole: 'owner' | 'admin'): Promise<void> {
  const body = await readRequestBody(request)
  if (!isRecord(body)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const userId = requiredString(body.userId, 'El usuario es obligatorio.')
  const role = parseRole(body.role)
  if (typeof body.status !== 'string' || !statuses.includes(body.status as TeamStatus)) throw new ApiError(400, 'El estado no es válido.')
  if (userId === actorUid) throw new ApiError(400, 'No puedes modificar tu propio acceso desde esta pantalla.')
  const { db } = getFirebaseAdmin()
  const reference = db.collection('memberships').doc(`${businessId}__${userId}`)
  const membership = await reference.get()
  if (!membership.exists || membership.data()?.businessId !== businessId) throw new ApiError(404, 'El miembro ya no existe.')
  if (membership.data()?.role === 'owner') throw new ApiError(403, 'El propietario no puede modificarse desde el equipo.')
  if (actorRole === 'admin' && (membership.data()?.role === 'admin' || role === 'admin')) throw new ApiError(403, 'Solo el propietario puede administrar otros administradores.')
  const status = body.status as TeamStatus
  await reference.update({ role, status, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid })
  json(response, { message: 'Acceso actualizado correctamente.' })
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const businessId = getBusinessId(request)
    const manager = await verifyBusinessManager(request, businessId)
    if (request.method === 'GET') return await listTeam(businessId, response)
    if (request.method === 'POST') return await createTeamUser(request, response, businessId, manager.token.uid, manager.role)
    if (request.method === 'PATCH') return await updateMember(request, response, businessId, manager.token.uid, manager.role)
    response.statusCode = 405; response.setHeader('Allow', 'GET, POST, PATCH'); response.end()
  } catch (error) {
    const code = isRecord(error) && typeof error.code === 'string' ? error.code : ''
    if (code === 'auth/email-already-exists') return json(response, { message: 'El correo ya está registrado.' }, 409)
    handleAdminApiError(response, error)
  }
}

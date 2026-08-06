import { FieldValue } from 'firebase-admin/firestore'
import type { DocumentReference } from 'firebase-admin/firestore'
import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, isRecord, json, readRequestBody, requiredString, verifySuperAdmin } from '../_lib/adminApi.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

const roles = ['owner', 'admin', 'cashier', 'seller', 'warehouse', 'viewer'] as const
const statuses = ['active', 'inactive'] as const
type BusinessRole = typeof roles[number]
type MembershipStatus = typeof statuses[number]

function makeMembershipId(businessId: string, userId: string): string { return `${businessId}__${userId}` }
function parseRole(value: unknown): BusinessRole {
  if (typeof value !== 'string' || !roles.includes(value as BusinessRole)) throw new ApiError(400, 'El rol del negocio no es válido.')
  return value as BusinessRole
}
function parseStatus(value: unknown): MembershipStatus {
  if (typeof value !== 'string' || !statuses.includes(value as MembershipStatus)) throw new ApiError(400, 'El estado de la membresía no es válido.')
  return value as MembershipStatus
}
function identifiers(request: ApiRequest) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  return { businessId: requiredString(url.searchParams.get('businessId'), 'El negocio es obligatorio.'), membershipId: url.searchParams.get('membershipId')?.trim() || null }
}

async function listMemberships(businessId: string, response: ServerResponse): Promise<void> {
  const { db } = getFirebaseAdmin()
  if (!(await db.collection('businesses').doc(businessId).get()).exists) throw new ApiError(404, 'El negocio ya no existe.')
  const snapshot = await db.collection('memberships').where('businessId', '==', businessId).get()
  const userIds = [...new Set(snapshot.docs.map((document) => String(document.data().userId)))]
  const userDocuments = userIds.length ? await db.getAll(...userIds.map((id) => db.collection('users').doc(id))) : []
  const users = new Map(userDocuments.map((document) => [document.id, document.data()]))
  const memberships = snapshot.docs.map((document) => {
    const data = document.data()
    const user = users.get(String(data.userId))
    return { id: document.id, businessId: data.businessId, userId: data.userId, role: data.role, status: data.status,
      displayName: user?.displayName ?? 'Usuario sin nombre', email: user?.email ?? '', userStatus: user?.status ?? 'blocked',
      createdAt: data.createdAt?.toDate?.().toISOString() ?? null, updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null }
  }).sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'))
  json(response, { memberships })
}

async function transferOwnership(transaction: FirebaseFirestore.Transaction, businessReference: DocumentReference, previousOwnerId: string | null, nextOwnerId: string, adminUid: string): Promise<void> {
  if (previousOwnerId && previousOwnerId !== nextOwnerId) {
    const previousReference = businessReference.firestore.collection('memberships').doc(makeMembershipId(businessReference.id, previousOwnerId))
    const previous = await transaction.get(previousReference)
    if (previous.exists) transaction.update(previousReference, { role: 'admin', updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid })
  }
  transaction.update(businessReference, { ownerUserId: nextOwnerId, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid })
}

async function createMembership(request: ApiRequest, response: ServerResponse, businessId: string, adminUid: string): Promise<void> {
  const body = await readRequestBody(request)
  if (!isRecord(body)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const userId = requiredString(body.userId, 'El usuario es obligatorio.')
  const role = parseRole(body.role)
  const { db } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc(businessId)
  const userReference = db.collection('users').doc(userId)
  const reference = db.collection('memberships').doc(makeMembershipId(businessId, userId))
  await db.runTransaction(async (transaction) => {
    const [business, user, existing] = await Promise.all([transaction.get(businessReference), transaction.get(userReference), transaction.get(reference)])
    if (!business.exists) throw new ApiError(404, 'El negocio ya no existe.')
    if (!user.exists) throw new ApiError(404, 'El usuario ya no existe.')
    if (user.data()?.status !== 'active') throw new ApiError(409, 'Solo puedes asignar usuarios activos.')
    if (existing.exists) throw new ApiError(409, 'El usuario ya pertenece a este negocio.')
    if (role === 'owner') await transferOwnership(transaction, businessReference, business.data()?.ownerUserId ?? null, userId, adminUid)
    transaction.create(reference, { businessId, userId, role, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: adminUid, updatedBy: adminUid })
  })
  json(response, { message: 'Miembro asignado correctamente.' }, 201)
}

async function updateMembership(request: ApiRequest, response: ServerResponse, businessId: string, id: string, adminUid: string): Promise<void> {
  const body = await readRequestBody(request)
  if (!isRecord(body)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const role = parseRole(body.role)
  const status = parseStatus(body.status)
  const { db } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc(businessId)
  const reference = db.collection('memberships').doc(id)
  await db.runTransaction(async (transaction) => {
    const [business, membership] = await Promise.all([transaction.get(businessReference), transaction.get(reference)])
    if (!business.exists) throw new ApiError(404, 'El negocio ya no existe.')
    if (!membership.exists || membership.data()?.businessId !== businessId) throw new ApiError(404, 'La membresía ya no existe.')
    const userId = String(membership.data()?.userId)
    if (role === 'owner' && status === 'active') await transferOwnership(transaction, businessReference, business.data()?.ownerUserId ?? null, userId, adminUid)
    else if (business.data()?.ownerUserId === userId) transaction.update(businessReference, { ownerUserId: null, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid })
    transaction.update(reference, { role, status, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid })
  })
  json(response, { message: 'Membresía actualizada correctamente.' })
}

async function deleteMembership(response: ServerResponse, businessId: string, id: string, adminUid: string): Promise<void> {
  const { db } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc(businessId)
  const reference = db.collection('memberships').doc(id)
  await db.runTransaction(async (transaction) => {
    const [business, membership] = await Promise.all([transaction.get(businessReference), transaction.get(reference)])
    if (!membership.exists || membership.data()?.businessId !== businessId) throw new ApiError(404, 'La membresía ya no existe.')
    if (business.exists && business.data()?.ownerUserId === membership.data()?.userId) transaction.update(businessReference, { ownerUserId: null, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid })
    transaction.delete(reference)
  })
  json(response, { message: 'Miembro retirado correctamente.' })
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const admin = await verifySuperAdmin(request)
    const ids = identifiers(request)
    if (request.method === 'GET') return await listMemberships(ids.businessId, response)
    if (request.method === 'POST') return await createMembership(request, response, ids.businessId, admin.uid)
    if (request.method === 'PATCH' && ids.membershipId) return await updateMembership(request, response, ids.businessId, ids.membershipId, admin.uid)
    if (request.method === 'DELETE' && ids.membershipId) return await deleteMembership(response, ids.businessId, ids.membershipId, admin.uid)
    response.statusCode = 405; response.setHeader('Allow', 'GET, POST, PATCH, DELETE'); response.end()
  } catch (error) { handleAdminApiError(response, error) }
}

import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, json } from '../_lib/adminApi.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

async function verifyActiveUser(request: ApiRequest): Promise<string> {
  const authorization = request.headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new ApiError(401, 'Debes iniciar sesión.')
  const { auth, db } = getFirebaseAdmin()
  let uid: string
  try { uid = (await auth.verifyIdToken(authorization.slice(7).trim(), true)).uid }
  catch { throw new ApiError(401, 'Tu sesión no es válida o ha expirado.') }
  const profile = await db.collection('users').doc(uid).get()
  if (!profile.exists || profile.data()?.status !== 'active') throw new ApiError(403, 'Tu cuenta no está activa.')
  return uid
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    if (request.method !== 'GET') { response.statusCode = 405; response.setHeader('Allow', 'GET'); response.end(); return }
    const uid = await verifyActiveUser(request)
    const { db } = getFirebaseAdmin()
    const snapshot = await db.collection('memberships').where('userId', '==', uid).get()
    const documents = snapshot.docs.filter((document) => document.data().status === 'active')
    const businessIds = [...new Set(documents.map((document) => String(document.data().businessId)))]
    const businessDocuments = businessIds.length ? await db.getAll(...businessIds.map((id) => db.collection('businesses').doc(id))) : []
    const businesses = new Map(businessDocuments.filter((document) => document.exists).map((document) => [document.id, document.data()]))
    const memberships = documents.flatMap((document) => {
      const data = document.data(); const business = businesses.get(String(data.businessId))
      if (!business || business.status !== 'active') return []
      return [{ id: document.id, businessId: data.businessId, role: data.role, business: { id: data.businessId, name: business.name, slug: business.slug, businessType: business.businessType, currency: business.currency, timezone: business.timezone, logoUrl: typeof business.logoUrl === 'string' ? business.logoUrl : null } }]
    })
    const profile = await db.collection('users').doc(uid).get()
    json(response, { memberships, user: { displayName: profile.data()?.displayName ?? 'Usuario', email: profile.data()?.email ?? '' } })
  } catch (error) { handleAdminApiError(response, error) }
}

import type { DecodedIdToken } from 'firebase-admin/auth'

import { ApiError, type ApiRequest } from './adminApi.js'
import { getFirebaseAdmin } from './firebaseAdmin.js'

export type BusinessManager = { token: DecodedIdToken; role: 'owner' | 'admin' }

export async function verifyBusinessManager(request: ApiRequest, businessId: string): Promise<BusinessManager> {
  const authorization = request.headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new ApiError(401, 'Debes iniciar sesión.')
  const { auth, db } = getFirebaseAdmin()
  let token: DecodedIdToken
  try { token = await auth.verifyIdToken(authorization.slice(7).trim(), true) }
  catch { throw new ApiError(401, 'Tu sesión no es válida o ha expirado.') }
  const membershipId = `${businessId}__${token.uid}`
  const [profile, business, membership] = await Promise.all([
    db.collection('users').doc(token.uid).get(), db.collection('businesses').doc(businessId).get(), db.collection('memberships').doc(membershipId).get(),
  ])
  if (!profile.exists || profile.data()?.status !== 'active') throw new ApiError(403, 'Tu cuenta no está activa.')
  if (!business.exists || business.data()?.status !== 'active') throw new ApiError(403, 'El negocio no está activo.')
  const role = membership.data()?.role
  if (!membership.exists || membership.data()?.status !== 'active' || (role !== 'owner' && role !== 'admin')) throw new ApiError(403, 'No tienes permisos para administrar el equipo.')
  return { token, role }
}

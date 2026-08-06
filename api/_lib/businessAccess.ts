import type { DecodedIdToken } from 'firebase-admin/auth'

import { ApiError, type ApiRequest } from './adminApi.js'
import { getFirebaseAdmin } from './firebaseAdmin.js'

export type BusinessManager = { token: DecodedIdToken; role: 'owner' | 'admin' }

export type BusinessRole = 'owner' | 'admin' | 'cashier' | 'seller' | 'warehouse' | 'viewer'

export async function verifyBusinessAccess(request: ApiRequest, businessId: string, allowedRoles: BusinessRole[]): Promise<{ token: DecodedIdToken; role: BusinessRole }> {
  const authorization = request.headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new ApiError(401, 'Debes iniciar sesión.')
  const { auth, db } = getFirebaseAdmin()
  let token: DecodedIdToken
  try { token = await auth.verifyIdToken(authorization.slice(7).trim(), true) }
  catch { throw new ApiError(401, 'Tu sesión no es válida o ha expirado.') }
  const [profile, business, membership] = await Promise.all([
    db.collection('users').doc(token.uid).get(), db.collection('businesses').doc(businessId).get(), db.collection('memberships').doc(`${businessId}__${token.uid}`).get(),
  ])
  if (!profile.exists || profile.data()?.status !== 'active') throw new ApiError(403, 'Tu cuenta no está activa.')
  if (!business.exists || business.data()?.status !== 'active') throw new ApiError(403, 'El negocio no está activo.')
  const role = membership.data()?.role as BusinessRole | undefined
  if (!membership.exists || membership.data()?.status !== 'active' || !role || !allowedRoles.includes(role)) throw new ApiError(403, 'No tienes permisos para realizar esta operación.')
  return { token, role }
}

export async function verifyBusinessManager(request: ApiRequest, businessId: string): Promise<BusinessManager> {
  const access = await verifyBusinessAccess(request, businessId, ['owner', 'admin'])
  return { token: access.token, role: access.role as 'owner' | 'admin' }
}

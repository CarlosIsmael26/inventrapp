import type { ServerResponse } from 'node:http'

import { type ApiRequest, handleAdminApiError, json, requiredString } from '../_lib/adminApi.js'
import { verifyBusinessAccess } from '../_lib/businessAccess.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

function isoDate(value: unknown): string | null { return value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function' ? value.toDate().toISOString() : null }

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const businessId = requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('businessId'), 'El negocio es obligatorio.')
    if (request.method !== 'GET') { response.statusCode = 405; response.setHeader('Allow', 'GET'); response.end(); return }
    await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'cashier', 'seller'])
    const { db } = getFirebaseAdmin()
    const snapshot = await db.collection('businesses').doc(businessId).collection('clients').orderBy('updatedAt', 'desc').limit(1000).get()
    json(response, { clients: snapshot.docs.map((document) => { const data = document.data(); return { id: document.id, name: String(data.name ?? ''), email: typeof data.email === 'string' ? data.email : null, phone: typeof data.phone === 'string' ? data.phone : null, status: data.status === 'inactive' ? 'inactive' : 'active', quoteCount: Number(data.quoteCount ?? 0), lastQuotedAt: isoDate(data.lastQuotedAt), createdAt: isoDate(data.createdAt), updatedAt: isoDate(data.updatedAt) } }) })
  } catch (error) { handleAdminApiError(response, error) }
}

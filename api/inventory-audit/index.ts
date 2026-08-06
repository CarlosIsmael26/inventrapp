import type { DocumentData } from 'firebase-admin/firestore'
import type { ServerResponse } from 'node:http'

import { type ApiRequest, handleAdminApiError, json, requiredString } from '../_lib/adminApi.js'
import { verifyBusinessAccess } from '../_lib/businessAccess.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

function isoDate(value: unknown): string | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString()
  return null
}

function productName(data: DocumentData | undefined): string {
  return typeof data?.name === 'string' ? data.name : ''
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    if (request.method !== 'GET') { response.statusCode = 405; response.setHeader('Allow', 'GET'); response.end(); return }
    const businessId = requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('businessId'), 'El negocio es obligatorio.')
    await verifyBusinessAccess(request, businessId, ['owner', 'admin'])
    const { db } = getFirebaseAdmin()
    const businessReference = db.collection('businesses').doc(businessId)
    const [business, productSnapshot, movementSnapshot] = await Promise.all([
      businessReference.get(),
      businessReference.collection('products').get(),
      businessReference.collection('inventoryMovements').orderBy('createdAt', 'desc').limit(5000).get(),
    ])
    const allProducts = new Map(productSnapshot.docs.map((document) => [document.id, document.data()]))
    const actorIds = [...new Set(movementSnapshot.docs.map((document) => document.data().createdBy).filter((value): value is string => typeof value === 'string' && Boolean(value)))]
    const actorSnapshots = actorIds.length ? await db.getAll(...actorIds.map((uid) => db.collection('users').doc(uid))) : []
    const actors = new Map(actorSnapshots.map((document) => [document.id, document.data()]))
    const products = productSnapshot.docs
      .filter((document) => document.data().status !== 'deleted')
      .map((document) => {
        const data = document.data()
        return { id: document.id, code: data.code, name: data.name, brand: data.brand, quantity: Number(data.quantity ?? 0), purchasePrice: Number(data.purchasePrice ?? data.unitValue ?? 0), salePrice: Number(data.salePrice ?? 0), profitPercentage: Number(data.profitPercentage ?? 0), createdAt: isoDate(data.createdAt), updatedAt: isoDate(data.updatedAt) }
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'))
    const movements = movementSnapshot.docs.map((document) => {
      const data = document.data()
      const actor = actors.get(String(data.createdBy ?? ''))
      const product = allProducts.get(String(data.productId ?? ''))
      return { id: document.id, code: String(data.code ?? product?.code ?? ''), productName: String(data.name ?? productName(product)), type: String(data.type ?? 'unknown'), previousQuantity: Number(data.previousQuantity ?? 0), newQuantity: Number(data.newQuantity ?? 0), difference: Number(data.difference ?? 0), purchasePrice: Number(data.purchasePrice ?? product?.purchasePrice ?? 0), salePrice: Number(data.salePrice ?? product?.salePrice ?? 0), createdAt: isoDate(data.createdAt), actorName: String(actor?.displayName ?? actor?.name ?? 'Usuario'), actorEmail: String(actor?.email ?? '') }
    })
    json(response, { business: { name: String(business.data()?.name ?? 'Negocio'), currency: String(business.data()?.currency ?? 'USD') }, generatedAt: new Date().toISOString(), products, movements, movementLimitReached: movementSnapshot.size === 5000 })
  } catch (error) { handleAdminApiError(response, error) }
}

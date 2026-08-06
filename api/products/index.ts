import { FieldValue } from 'firebase-admin/firestore'
import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, isRecord, json, readRequestBody, requiredString } from '../_lib/adminApi.js'
import { verifyBusinessAccess } from '../_lib/businessAccess.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

type ProductInput = { code: string; normalizedCode: string; name: string; brand: string; quantity: number; purchasePrice: number; profitPercentage: number; salePrice: number }

function codeKey(code: string): string { return Buffer.from(code, 'utf8').toString('base64url') }
function numberField(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ApiError(400, `${label} no es válido.`)
  return value
}
function parseProduct(value: unknown): ProductInput {
  if (!isRecord(value)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const code = requiredString(value.code, 'El código es obligatorio.')
  const name = requiredString(value.name, 'El nombre es obligatorio.')
  const brand = requiredString(value.brand, 'La marca es obligatoria.')
  if (code.length > 120 || name.length > 200 || brand.length > 120) throw new ApiError(400, 'Uno de los textos es demasiado largo.')
  const quantity = numberField(value.quantity, 'La cantidad')
  if (!Number.isInteger(quantity)) throw new ApiError(400, 'La cantidad debe ser un número entero.')
  const purchasePrice = numberField(value.purchasePrice, 'El costo de compra')
  const profitPercentage = numberField(value.profitPercentage, 'El porcentaje de ganancia')
  if (profitPercentage > 1000) throw new ApiError(400, 'El porcentaje de ganancia no puede superar 1000%.')
  const salePrice = Math.round((purchasePrice * (1 + profitPercentage / 100) + Number.EPSILON) * 100) / 100
  return { code, normalizedCode: code.toLocaleLowerCase('es').trim(), name, brand, quantity, purchasePrice, profitPercentage, salePrice }
}
function identifiers(request: ApiRequest): { businessId: string; productId: string | null } {
  const url = new URL(request.url ?? '/', 'http://localhost')
  return { businessId: requiredString(url.searchParams.get('businessId'), 'El negocio es obligatorio.'), productId: url.searchParams.get('productId')?.trim() || null }
}

async function createProduct(request: ApiRequest, response: ServerResponse, businessId: string, actorUid: string): Promise<void> {
  const product = parseProduct(await readRequestBody(request))
  const { db } = getFirebaseAdmin()
  const business = db.collection('businesses').doc(businessId)
  const productReference = business.collection('products').doc()
  const codeReference = business.collection('productCodes').doc(codeKey(product.normalizedCode))
  const movementReference = business.collection('inventoryMovements').doc()
  await db.runTransaction(async (transaction) => {
    if ((await transaction.get(codeReference)).exists) throw new ApiError(409, `Ya existe un producto con el código ${product.code}.`)
    transaction.create(codeReference, { productId: productReference.id, normalizedCode: product.normalizedCode, createdAt: FieldValue.serverTimestamp() })
    transaction.create(productReference, { ...product, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: actorUid, updatedBy: actorUid })
    transaction.create(movementReference, { productId: productReference.id, code: product.code, type: 'initial_stock', previousQuantity: 0, newQuantity: product.quantity, difference: product.quantity, createdAt: FieldValue.serverTimestamp(), createdBy: actorUid })
  })
  json(response, { message: 'Producto creado correctamente.' }, 201)
}

async function updateProduct(request: ApiRequest, response: ServerResponse, businessId: string, productId: string, actorUid: string): Promise<void> {
  const product = parseProduct(await readRequestBody(request))
  const { db } = getFirebaseAdmin()
  const business = db.collection('businesses').doc(businessId)
  const productReference = business.collection('products').doc(productId)
  const newCodeReference = business.collection('productCodes').doc(codeKey(product.normalizedCode))
  await db.runTransaction(async (transaction) => {
    const [existing, codeReservation] = await Promise.all([transaction.get(productReference), transaction.get(newCodeReference)])
    if (!existing.exists || existing.data()?.status === 'deleted') throw new ApiError(404, 'El producto ya no existe.')
    if (codeReservation.exists && codeReservation.data()?.productId !== productId) throw new ApiError(409, `Ya existe un producto con el código ${product.code}.`)
    const previousCode = String(existing.data()?.code ?? '')
    const previousNormalizedCode = String(existing.data()?.normalizedCode ?? previousCode.toLocaleLowerCase('es').trim())
    const previousQuantity = Number(existing.data()?.quantity ?? 0)
    if (!codeReservation.exists) transaction.create(newCodeReference, { productId, normalizedCode: product.normalizedCode, createdAt: FieldValue.serverTimestamp() })
    if (previousNormalizedCode !== product.normalizedCode) transaction.delete(business.collection('productCodes').doc(codeKey(previousNormalizedCode)))
    transaction.update(productReference, { ...product, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid })
    if (previousQuantity !== product.quantity) {
      transaction.create(business.collection('inventoryMovements').doc(), { productId, code: product.code, type: 'manual_adjustment', previousQuantity, newQuantity: product.quantity, difference: product.quantity - previousQuantity, createdAt: FieldValue.serverTimestamp(), createdBy: actorUid })
    }
  })
  json(response, { message: 'Producto actualizado correctamente.' })
}

async function deleteProduct(response: ServerResponse, businessId: string, productId: string, actorUid: string): Promise<void> {
  const { db } = getFirebaseAdmin()
  const business = db.collection('businesses').doc(businessId)
  const productReference = business.collection('products').doc(productId)
  await db.runTransaction(async (transaction) => {
    const product = await transaction.get(productReference)
    if (!product.exists || product.data()?.status === 'deleted') throw new ApiError(404, 'El producto ya no existe.')
    const code = String(product.data()?.code ?? '')
    const normalizedCode = String(product.data()?.normalizedCode ?? code.toLocaleLowerCase('es').trim())
    const quantity = Number(product.data()?.quantity ?? 0)
    transaction.delete(business.collection('productCodes').doc(codeKey(normalizedCode)))
    transaction.update(productReference, { status: 'deleted', quantity: 0, deletedAt: FieldValue.serverTimestamp(), deletedBy: actorUid, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid })
    transaction.create(business.collection('inventoryMovements').doc(), { productId, code, type: 'product_deleted', previousQuantity: quantity, newQuantity: 0, difference: -quantity, createdAt: FieldValue.serverTimestamp(), createdBy: actorUid })
  })
  json(response, { message: 'Producto eliminado correctamente.' })
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const ids = identifiers(request)
    if (request.method === 'POST') { const access = await verifyBusinessAccess(request, ids.businessId, ['owner', 'admin', 'warehouse']); return await createProduct(request, response, ids.businessId, access.token.uid) }
    if (request.method === 'PATCH' && ids.productId) { const access = await verifyBusinessAccess(request, ids.businessId, ['owner', 'admin', 'warehouse']); return await updateProduct(request, response, ids.businessId, ids.productId, access.token.uid) }
    if (request.method === 'DELETE' && ids.productId) { const access = await verifyBusinessAccess(request, ids.businessId, ['owner', 'admin']); return await deleteProduct(response, ids.businessId, ids.productId, access.token.uid) }
    response.statusCode = 405; response.setHeader('Allow', 'POST, PATCH, DELETE'); response.end()
  } catch (error) { handleAdminApiError(response, error) }
}

import { FieldValue } from 'firebase-admin/firestore'
import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, isRecord, json, readRequestBody, requiredString } from '../_lib/adminApi.js'
import { verifyBusinessAccess } from '../_lib/businessAccess.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

type ProductInput = { code: string; normalizedCode: string; name: string; brand: string; quantity: number; unitValue: number }
const MAX_IMPORT_ROWS = 200

function codeKey(code: string): string { return Buffer.from(code, 'utf8').toString('base64url') }
function parseNumber(value: unknown, field: string, row: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ApiError(400, `${field} no es válido en la fila ${row}.`)
  return value
}
function parseProducts(value: unknown): ProductInput[] {
  if (!isRecord(value) || !Array.isArray(value.products) || value.products.length === 0) throw new ApiError(400, 'No hay productos para importar.')
  if (value.products.length > MAX_IMPORT_ROWS) throw new ApiError(400, `Puedes importar máximo ${MAX_IMPORT_ROWS} productos por archivo.`)
  const seen = new Set<string>()
  return value.products.map((item, index) => {
    if (!isRecord(item)) throw new ApiError(400, `La fila ${index + 2} no es válida.`)
    const code = requiredString(item.code, `El código es obligatorio en la fila ${index + 2}.`)
    const normalizedCode = code.toLocaleLowerCase('es').trim()
    if (seen.has(normalizedCode)) throw new ApiError(409, `El código ${code} está duplicado dentro del archivo.`)
    seen.add(normalizedCode)
    const name = requiredString(item.name, `El nombre es obligatorio en la fila ${index + 2}.`)
    const brand = requiredString(item.brand, `La marca es obligatoria en la fila ${index + 2}.`)
    if (code.length > 120 || name.length > 200 || brand.length > 120) throw new ApiError(400, `Hay texto demasiado largo en la fila ${index + 2}.`)
    const quantity = parseNumber(item.quantity, 'La cantidad', index + 2)
    if (!Number.isInteger(quantity)) throw new ApiError(400, `La cantidad debe ser entera en la fila ${index + 2}.`)
    return { code, normalizedCode, name, brand, quantity, unitValue: parseNumber(item.unitValue, 'El valor', index + 2) }
  })
}

async function listProducts(businessId: string, response: ServerResponse): Promise<void> {
  const { db } = getFirebaseAdmin()
  const snapshot = await db.collection('businesses').doc(businessId).collection('products').get()
  const products = snapshot.docs.map((document) => { const data = document.data(); return { id: document.id, code: data.code, name: data.name, brand: data.brand, quantity: data.quantity, unitValue: data.unitValue, createdAt: data.createdAt?.toDate?.().toISOString() ?? null, updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null } }).sort((a, b) => a.name.localeCompare(b.name, 'es'))
  json(response, { products })
}

async function importProducts(request: ApiRequest, response: ServerResponse, businessId: string, actorUid: string): Promise<void> {
  const products = parseProducts(await readRequestBody(request))
  const { db } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc(businessId)
  await db.runTransaction(async (transaction) => {
    const codeReferences = products.map((product) => businessReference.collection('productCodes').doc(codeKey(product.normalizedCode)))
    const reservations = await Promise.all(codeReferences.map((reference) => transaction.get(reference)))
    const duplicates = reservations.flatMap((document, index) => document.exists ? [products[index].code] : [])
    if (duplicates.length) throw new ApiError(409, `Ya existen estos códigos en el inventario: ${duplicates.slice(0, 10).join(', ')}${duplicates.length > 10 ? '…' : ''}`)
    products.forEach((product, index) => {
      const productReference = businessReference.collection('products').doc()
      transaction.create(codeReferences[index], { productId: productReference.id, normalizedCode: product.normalizedCode, createdAt: FieldValue.serverTimestamp() })
      transaction.create(productReference, { code: product.code, normalizedCode: product.normalizedCode, name: product.name, brand: product.brand, quantity: product.quantity, unitValue: product.unitValue, status: 'active', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), createdBy: actorUid, updatedBy: actorUid })
    })
  })
  json(response, { message: `${products.length} productos importados correctamente.` }, 201)
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const businessId = requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('businessId'), 'El negocio es obligatorio.')
    if (request.method === 'GET') { await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'cashier', 'seller', 'warehouse', 'viewer']); return await listProducts(businessId, response) }
    if (request.method === 'POST') { const access = await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'warehouse']); return await importProducts(request, response, businessId, access.token.uid) }
    response.statusCode = 405; response.setHeader('Allow', 'GET, POST'); response.end()
  } catch (error) { handleAdminApiError(response, error) }
}

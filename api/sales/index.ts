import { FieldValue } from 'firebase-admin/firestore'
import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, isRecord, json, readRequestBody, requiredString } from '../_lib/adminApi.js'
import { verifyBusinessAccess } from '../_lib/businessAccess.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

const TAX_RATE = 0.15
const MAX_ITEMS = 50
type RequestedItem = { productId: string; quantity: number }
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
function optionalString(value: unknown, maxLength: number): string | null { if (value === null || value === undefined || value === '') return null; if (typeof value !== 'string') throw new ApiError(400, 'Uno de los datos enviados no es válido.'); const result = value.trim(); if (result.length > maxLength) throw new ApiError(400, 'Uno de los textos enviados es demasiado largo.'); return result || null }
function parseItems(value: unknown): RequestedItem[] { if (!Array.isArray(value) || !value.length) throw new ApiError(400, 'Agrega al menos un producto a la venta.'); if (value.length > MAX_ITEMS) throw new ApiError(400, `Una venta admite máximo ${MAX_ITEMS} productos.`); const seen = new Set<string>(); return value.map((item) => { if (!isRecord(item)) throw new ApiError(400, 'Uno de los productos no es válido.'); const productId = requiredString(item.productId, 'El producto es obligatorio.'); if (seen.has(productId)) throw new ApiError(409, 'Un producto está repetido en la venta.'); seen.add(productId); if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 999999) throw new ApiError(400, 'Las cantidades deben ser enteros mayores que cero.'); return { productId, quantity: item.quantity } }) }
function isoDate(value: unknown): string | null { return value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function' ? value.toDate().toISOString() : null }
function serialize(document: FirebaseFirestore.QueryDocumentSnapshot): Record<string, unknown> { const data = document.data(); return { id: document.id, ...data, createdAt: isoDate(data.createdAt) } }

async function listSales(businessId: string, response: ServerResponse): Promise<void> { const { db } = getFirebaseAdmin(); const snapshot = await db.collection('businesses').doc(businessId).collection('sales').orderBy('createdAt', 'desc').limit(500).get(); json(response, { sales: snapshot.docs.map(serialize) }) }

async function createSale(request: ApiRequest, response: ServerResponse, businessId: string, actorUid: string): Promise<void> {
  const body = await readRequestBody(request)
  if (!isRecord(body)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const customerName = requiredString(body.customerName, 'El nombre del cliente es obligatorio.')
  if (customerName.length > 160) throw new ApiError(400, 'El nombre del cliente es demasiado largo.')
  const customerEmail = optionalString(body.customerEmail, 200); const customerPhone = optionalString(body.customerPhone, 40); const notes = optionalString(body.notes, 1000); const sourceQuotationId = optionalString(body.sourceQuotationId, 200); const requestedItems = parseItems(body.items)
  const { db } = getFirebaseAdmin(); const businessReference = db.collection('businesses').doc(businessId); const saleReference = businessReference.collection('sales').doc(); const counterReference = businessReference.collection('counters').doc('sales'); let sale: Record<string, unknown> = {}
  await db.runTransaction(async (transaction) => {
    const productReferences = requestedItems.map((item) => businessReference.collection('products').doc(item.productId)); const quoteReference = sourceQuotationId ? businessReference.collection('quotations').doc(sourceQuotationId) : null
    const [counter, business, profile, quotation, ...products] = await Promise.all([transaction.get(counterReference), transaction.get(businessReference), transaction.get(db.collection('users').doc(actorUid)), quoteReference ? transaction.get(quoteReference) : Promise.resolve(null), ...productReferences.map((reference) => transaction.get(reference))])
    if (quotation && !quotation.exists) throw new ApiError(404, 'La cotización ya no existe.')
    if (quotation?.data()?.status === 'converted') throw new ApiError(409, 'Esta cotización ya fue convertida en venta.')
    const quotationData = quotation?.data()
    const quotationItems: unknown[] = quotationData && Array.isArray(quotationData.items) ? quotationData.items : []
    const quotedPrices = new Map<string, number>(quotationItems.filter(isRecord).map((item) => [String(item.productId ?? ''), Number(item.unitPrice ?? 0)]))
    const items = requestedItems.map((item, index) => { const product = products[index]; const data = product.data(); if (!product.exists || data?.status === 'deleted') throw new ApiError(409, 'Uno de los productos ya no está disponible.'); const stock = Number(data?.quantity ?? 0); if (!Number.isFinite(stock) || stock < item.quantity) throw new ApiError(409, `No hay existencias suficientes de ${String(data?.name ?? 'un producto')}. Disponible: ${stock}.`); const unitPrice = quotedPrices.has(item.productId) ? Number(quotedPrices.get(item.productId)) : Number(data?.salePrice ?? 0); if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new ApiError(409, `El producto ${String(data?.name ?? '')} no tiene un precio válido.`); return { productId: item.productId, code: String(data?.code ?? ''), name: String(data?.name ?? ''), brand: String(data?.brand ?? ''), quantity: item.quantity, unitPrice, total: roundMoney(item.quantity * unitPrice), previousQuantity: stock } })
    const sequence = Number(counter.data()?.value ?? 0) + 1; const subtotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0)); const tax = roundMoney(subtotal * TAX_RATE); const total = roundMoney(subtotal + tax)
    sale = { number: `FAC-${String(sequence).padStart(6, '0')}`, sourceQuotationId, sourceQuotationNumber: quotation ? String(quotation.data()?.number ?? '') : null, customerName, customerEmail, customerPhone, notes, status: 'completed', taxRate: TAX_RATE, subtotal, tax, total, currency: String(business.data()?.currency ?? 'USD'), items: items.map(({ previousQuantity: _previousQuantity, ...item }) => item), createdAt: FieldValue.serverTimestamp(), createdBy: actorUid, createdByName: String(profile.data()?.displayName ?? profile.data()?.name ?? 'Usuario') }
    transaction.set(counterReference, { value: sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); transaction.create(saleReference, sale)
    items.forEach((item, index) => { const newQuantity = item.previousQuantity - item.quantity; transaction.update(productReferences[index], { quantity: newQuantity, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid }); transaction.create(businessReference.collection('inventoryMovements').doc(), { productId: item.productId, code: item.code, name: item.name, type: 'sale', saleId: saleReference.id, previousQuantity: item.previousQuantity, newQuantity, difference: -item.quantity, purchasePrice: Number(products[index].data()?.purchasePrice ?? 0), salePrice: item.unitPrice, createdAt: FieldValue.serverTimestamp(), createdBy: actorUid }) })
    if (quoteReference) transaction.update(quoteReference, { status: 'converted', saleId: saleReference.id, convertedAt: FieldValue.serverTimestamp(), convertedBy: actorUid })
  })
  json(response, { message: 'Venta registrada correctamente.', sale: { id: saleReference.id, ...sale, createdAt: new Date().toISOString() } }, 201)
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> { try { const businessId = requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('businessId'), 'El negocio es obligatorio.'); if (request.method === 'GET') { await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'cashier', 'seller']); return await listSales(businessId, response) } if (request.method === 'POST') { const access = await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'cashier', 'seller']); return await createSale(request, response, businessId, access.token.uid) } response.statusCode = 405; response.setHeader('Allow', 'GET, POST'); response.end() } catch (error) { handleAdminApiError(response, error) } }

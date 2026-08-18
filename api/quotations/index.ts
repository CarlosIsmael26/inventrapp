import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'node:crypto'
import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, isRecord, json, readRequestBody, requiredString } from '../_lib/adminApi.js'
import { verifyBusinessAccess } from '../_lib/businessAccess.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

const TAX_RATE = 0.15
const MAX_ITEMS = 50

type RequestedItem = { productId: string; quantity: number }

function clientIdFor(name: string, email: string | null, phone: string | null): string { const identity = email ? `email:${email.toLowerCase()}` : phone ? `phone:${phone.replace(/\D/g, '')}` : `name:${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()}`; return createHash('sha256').update(identity).digest('hex').slice(0, 32) }
function clientData(name: string, email: string | null, phone: string | null, actorUid: string): Record<string, unknown> { return { name, normalizedName: name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(), email, normalizedEmail: email?.toLowerCase() ?? null, phone, normalizedPhone: phone?.replace(/\D/g, '') || null, status: 'active', source: 'quotation', lastQuotedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid } }

function roundMoney(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100 }
function optionalString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new ApiError(400, 'Uno de los datos enviados no es válido.')
  const result = value.trim()
  if (result.length > maxLength) throw new ApiError(400, 'Uno de los textos enviados es demasiado largo.')
  return result || null
}
function parseItems(value: unknown): RequestedItem[] {
  if (!Array.isArray(value) || !value.length) throw new ApiError(400, 'Agrega al menos un producto a la cotización.')
  if (value.length > MAX_ITEMS) throw new ApiError(400, `Una cotización admite máximo ${MAX_ITEMS} productos.`)
  const seen = new Set<string>()
  return value.map((item) => {
    if (!isRecord(item)) throw new ApiError(400, 'Uno de los productos no es válido.')
    const productId = requiredString(item.productId, 'El producto es obligatorio.')
    if (seen.has(productId)) throw new ApiError(409, 'Un producto está repetido en la cotización.')
    seen.add(productId)
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 999999) throw new ApiError(400, 'La cantidad de cada producto debe ser un entero mayor que cero.')
    return { productId, quantity: item.quantity }
  })
}
function isoDate(value: unknown): string | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return value.toDate().toISOString()
  return null
}
function serialize(document: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  const data = document.data() ?? {}
  return { id: document.id, ...data, validUntil: isoDate(data.validUntil), createdAt: isoDate(data.createdAt), convertedAt: isoDate(data.convertedAt) }
}

async function deleteQuotation(response: ServerResponse, businessId: string, quotationId: string): Promise<void> {
  const { db } = getFirebaseAdmin()
  const reference = db.collection('businesses').doc(businessId).collection('quotations').doc(quotationId)
  const quotation = await reference.get()
  if (!quotation.exists) throw new ApiError(404, 'La cotización ya no existe.')
  if (quotation.data()?.status === 'converted') throw new ApiError(409, 'No puedes eliminar una cotización que ya fue convertida en venta.')
  await reference.delete()
  json(response, { message: 'Cotización eliminada correctamente.' })
}

async function listQuotations(businessId: string, response: ServerResponse): Promise<void> {
  const { db } = getFirebaseAdmin()
  const snapshot = await db.collection('businesses').doc(businessId).collection('quotations').orderBy('createdAt', 'desc').limit(500).get()
  json(response, { quotations: snapshot.docs.map(serialize) })
}

async function createQuotation(request: ApiRequest, response: ServerResponse, businessId: string, actorUid: string): Promise<void> {
  const body = await readRequestBody(request)
  if (!isRecord(body)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const customerName = requiredString(body.customerName, 'El nombre del cliente es obligatorio.')
  if (customerName.length > 160) throw new ApiError(400, 'El nombre del cliente es demasiado largo.')
  const customerEmail = optionalString(body.customerEmail, 200)
  const customerPhone = optionalString(body.customerPhone, 40)
  const notes = optionalString(body.notes, 1000)
  const validUntilText = requiredString(body.validUntil, 'La fecha de validez es obligatoria.')
  const validUntil = new Date(`${validUntilText}T23:59:59`)
  if (Number.isNaN(validUntil.getTime()) || validUntil < new Date()) throw new ApiError(400, 'La fecha de validez no puede estar vencida.')
  const requestedItems = parseItems(body.items)
  const { db } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc(businessId)
  const quoteReference = businessReference.collection('quotations').doc()
  const clientReference = businessReference.collection('clients').doc(clientIdFor(customerName, customerEmail, customerPhone))
  const counterReference = businessReference.collection('counters').doc('quotations')
  let quotation: Record<string, unknown> = {}
  await db.runTransaction(async (transaction) => {
    const productReferences = requestedItems.map((item) => businessReference.collection('products').doc(item.productId))
    const [counter, client, ...products] = await Promise.all([transaction.get(counterReference), transaction.get(clientReference), ...productReferences.map((reference) => transaction.get(reference))])
    const items = requestedItems.map((item, index) => {
      const product = products[index]
      if (!product.exists || product.data()?.status === 'deleted') throw new ApiError(409, 'Uno de los productos ya no está disponible.')
      const data = product.data()
      const unitPrice = Number(data?.salePrice ?? 0)
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new ApiError(409, `El producto ${String(data?.name ?? '')} no tiene un precio de venta válido.`)
      return { productId: item.productId, code: String(data?.code ?? ''), name: String(data?.name ?? ''), brand: String(data?.brand ?? ''), quantity: item.quantity, unitPrice, total: roundMoney(item.quantity * unitPrice) }
    })
    const sequence = Number(counter.data()?.value ?? 0) + 1
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0))
    const tax = roundMoney(subtotal * TAX_RATE)
    const total = roundMoney(subtotal + tax)
    const profile = await transaction.get(db.collection('users').doc(actorUid))
    const business = await transaction.get(businessReference)
    quotation = { number: `COT-${String(sequence).padStart(6, '0')}`, customerName, customerEmail, customerPhone, notes, status: 'issued', taxRate: TAX_RATE, subtotal, tax, total, currency: String(business.data()?.currency ?? 'USD'), items, validUntil: Timestamp.fromDate(validUntil), createdAt: FieldValue.serverTimestamp(), createdBy: actorUid, createdByName: String(profile.data()?.displayName ?? profile.data()?.name ?? 'Usuario') }
    transaction.set(counterReference, { value: sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    transaction.create(quoteReference, quotation)
    transaction.set(clientReference, { ...clientData(customerName, customerEmail, customerPhone, actorUid), quoteCount: FieldValue.increment(1), ...(!client.exists ? { createdAt: FieldValue.serverTimestamp(), createdBy: actorUid } : {}) }, { merge: true })
  })
  json(response, { message: 'Cotización creada correctamente.', quotation: { id: quoteReference.id, ...quotation, validUntil: validUntil.toISOString(), createdAt: new Date().toISOString() } }, 201)
}

async function updateQuotation(request: ApiRequest, response: ServerResponse, businessId: string, quotationId: string, actorUid: string): Promise<void> {
  const body = await readRequestBody(request)
  if (!isRecord(body)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const customerName = requiredString(body.customerName, 'El nombre del cliente es obligatorio.')
  if (customerName.length > 160) throw new ApiError(400, 'El nombre del cliente es demasiado largo.')
  const customerEmail = optionalString(body.customerEmail, 200)
  const customerPhone = optionalString(body.customerPhone, 40)
  const notes = optionalString(body.notes, 1000)
  const validUntilText = requiredString(body.validUntil, 'La fecha de validez es obligatoria.')
  const validUntil = new Date(`${validUntilText}T23:59:59`)
  if (Number.isNaN(validUntil.getTime()) || validUntil < new Date()) throw new ApiError(400, 'La fecha de validez no puede estar vencida.')
  const requestedItems = parseItems(body.items)
  const { db } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc(businessId)
  const quoteReference = businessReference.collection('quotations').doc(quotationId)
  const nextClientReference = businessReference.collection('clients').doc(clientIdFor(customerName, customerEmail, customerPhone))
  await db.runTransaction(async (transaction) => {
    const productReferences = requestedItems.map((item) => businessReference.collection('products').doc(item.productId))
    const [quotation, nextClient, ...products] = await Promise.all([transaction.get(quoteReference), transaction.get(nextClientReference), ...productReferences.map((reference) => transaction.get(reference))])
    if (!quotation.exists) throw new ApiError(404, 'La cotización ya no existe.')
    if (quotation.data()?.status === 'converted') throw new ApiError(409, 'Una cotización convertida en venta ya no se puede modificar.')
    const items = requestedItems.map((item, index) => { const product = products[index]; const data = product.data(); if (!product.exists || data?.status === 'deleted') throw new ApiError(409, 'Uno de los productos ya no está disponible.'); const unitPrice = Number(data?.salePrice ?? 0); if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new ApiError(409, `El producto ${String(data?.name ?? '')} no tiene un precio de venta válido.`); return { productId: item.productId, code: String(data?.code ?? ''), name: String(data?.name ?? ''), brand: String(data?.brand ?? ''), quantity: item.quantity, unitPrice, total: roundMoney(item.quantity * unitPrice) } })
    const subtotal = roundMoney(items.reduce((sum, item) => sum + item.total, 0)); const tax = roundMoney(subtotal * TAX_RATE); const total = roundMoney(subtotal + tax)
    const updated = { customerName, customerEmail, customerPhone, notes, taxRate: TAX_RATE, subtotal, tax, total, items, validUntil: Timestamp.fromDate(validUntil), updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid }
    transaction.update(quoteReference, updated)
    const previousClientId = clientIdFor(String(quotation.data()?.customerName ?? ''), typeof quotation.data()?.customerEmail === 'string' ? quotation.data()?.customerEmail : null, typeof quotation.data()?.customerPhone === 'string' ? quotation.data()?.customerPhone : null)
    const nextClientId = clientIdFor(customerName, customerEmail, customerPhone)
    transaction.set(nextClientReference, { ...clientData(customerName, customerEmail, customerPhone, actorUid), ...(previousClientId !== nextClientId ? { quoteCount: FieldValue.increment(1) } : {}), ...(!nextClient.exists ? { createdAt: FieldValue.serverTimestamp(), createdBy: actorUid } : {}) }, { merge: true })
  })
  const current = await quoteReference.get()
  json(response, { message: 'Cotización actualizada correctamente.', quotation: serialize(current) })
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const businessId = requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('businessId'), 'El negocio es obligatorio.')
    if (request.method === 'GET') { await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'seller']); return await listQuotations(businessId, response) }
    if (request.method === 'POST') { const access = await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'seller']); return await createQuotation(request, response, businessId, access.token.uid) }
    if (request.method === 'PATCH') { const access = await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'seller']); const quotationId = requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('quotationId'), 'La cotización es obligatoria.'); return await updateQuotation(request, response, businessId, quotationId, access.token.uid) }
    if (request.method === 'DELETE') { await verifyBusinessAccess(request, businessId, ['owner', 'admin', 'seller']); const quotationId = requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('quotationId'), 'La cotización es obligatoria.'); return await deleteQuotation(response, businessId, quotationId) }
    response.statusCode = 405; response.setHeader('Allow', 'GET, POST, PATCH, DELETE'); response.end()
  } catch (error) { handleAdminApiError(response, error) }
}

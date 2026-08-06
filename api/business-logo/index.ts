import { randomUUID } from 'node:crypto'
import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, isRecord, json, readRequestBody, requiredString } from '../_lib/adminApi.js'
import { verifyBusinessAccess } from '../_lib/businessAccess.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'

const MAX_FILE_BYTES = 2 * 1024 * 1024
const allowedTypes = new Set(['image/png', 'image/jpeg'])

function businessIdFrom(request: ApiRequest): string {
  return requiredString(new URL(request.url ?? '/', 'http://localhost').searchParams.get('businessId'), 'El negocio es obligatorio.')
}

async function uploadLogo(request: ApiRequest, response: ServerResponse, businessId: string, actorUid: string): Promise<void> {
  const body = await readRequestBody(request)
  if (!isRecord(body)) throw new ApiError(400, 'Los datos enviados no son válidos.')
  const contentType = requiredString(body.contentType, 'El tipo de archivo es obligatorio.')
  if (!allowedTypes.has(contentType)) throw new ApiError(400, 'El logo debe ser una imagen PNG o JPG.')
  const base64 = requiredString(body.base64, 'No se recibió la imagen.')
  if (base64.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 8) throw new ApiError(413, 'El logo no puede superar 2 MB.')
  const bytes = Buffer.from(base64, 'base64')
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new ApiError(413, 'El logo no puede superar 2 MB.')
  const validSignature = contentType === 'image/png' ? bytes.subarray(0, 4).toString('hex') === '89504e47' : bytes.subarray(0, 2).toString('hex') === 'ffd8'
  if (!validSignature) throw new ApiError(400, 'El contenido del archivo no corresponde a una imagen válida.')
  const { db, storage } = getFirebaseAdmin()
  const bucket = storage.bucket()
  const path = `businesses/${businessId}/branding/logo`
  const token = randomUUID()
  await bucket.file(path).save(bytes, { resumable: false, contentType, metadata: { cacheControl: 'public,max-age=3600', metadata: { firebaseStorageDownloadTokens: token } } })
  const logoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  await db.collection('businesses').doc(businessId).update({ logoUrl, logoPath: path, logoUpdatedAt: new Date(), logoUpdatedBy: actorUid, updatedAt: new Date(), updatedBy: actorUid })
  json(response, { message: 'Logo actualizado correctamente.', logoUrl })
}

async function deleteLogo(response: ServerResponse, businessId: string, actorUid: string): Promise<void> {
  const { db, storage } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc(businessId)
  const business = await businessReference.get()
  const path = typeof business.data()?.logoPath === 'string' ? business.data()?.logoPath : `businesses/${businessId}/branding/logo`
  await storage.bucket().file(path).delete({ ignoreNotFound: true })
  await businessReference.update({ logoUrl: null, logoPath: null, logoUpdatedAt: new Date(), logoUpdatedBy: actorUid, updatedAt: new Date(), updatedBy: actorUid })
  json(response, { message: 'Logo eliminado correctamente.' })
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const businessId = businessIdFrom(request)
    if (request.method === 'POST') { const access = await verifyBusinessAccess(request, businessId, ['owner', 'admin']); return await uploadLogo(request, response, businessId, access.token.uid) }
    if (request.method === 'DELETE') { const access = await verifyBusinessAccess(request, businessId, ['owner', 'admin']); return await deleteLogo(response, businessId, access.token.uid) }
    response.statusCode = 405; response.setHeader('Allow', 'POST, DELETE'); response.end()
  } catch (error) { handleAdminApiError(response, error) }
}

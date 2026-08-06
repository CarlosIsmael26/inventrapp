import { FieldValue } from 'firebase-admin/firestore'
import type { ServerResponse } from 'node:http'

import { ApiError, type ApiRequest, handleAdminApiError, json, readRequestBody, verifySuperAdmin } from '../_lib/adminApi.js'
import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js'
import { parseBusinessInput } from './_businessModel.js'

async function listBusinesses(response: ServerResponse): Promise<void> {
  const { db } = getFirebaseAdmin()
  const snapshot = await db.collection('businesses').get()
  const documents = [...snapshot.docs].sort((a, b) =>
    (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0),
  )
  json(response, {
    businesses: documents.map((document) => {
      const data = document.data()
      return {
        id: document.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
      }
    }),
  })
}

async function createBusiness(request: ApiRequest, response: ServerResponse, adminUid: string) {
  const input = parseBusinessInput(await readRequestBody(request))
  const { db } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc()
  const slugReference = db.collection('businessSlugs').doc(input.slug)
  await db.runTransaction(async (transaction) => {
    if ((await transaction.get(slugReference)).exists) throw new ApiError(409, 'Ya existe un negocio con ese slug.')
    transaction.create(slugReference, { businessId: businessReference.id, createdAt: FieldValue.serverTimestamp() })
    transaction.create(businessReference, {
      ...input,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: adminUid,
      updatedBy: adminUid,
    })
  })
  json(response, { message: 'Negocio creado correctamente.', businessId: businessReference.id }, 201)
}

async function updateBusiness(request: ApiRequest, response: ServerResponse, adminUid: string) {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const businessId = url.searchParams.get('businessId')?.trim()
  if (!businessId) throw new ApiError(400, 'El negocio es obligatorio.')
  const input = parseBusinessInput(await readRequestBody(request))
  const { db } = getFirebaseAdmin()
  const businessReference = db.collection('businesses').doc(businessId)
  const newSlugReference = db.collection('businessSlugs').doc(input.slug)

  await db.runTransaction(async (transaction) => {
    const [business, slugReservation] = await Promise.all([
      transaction.get(businessReference),
      transaction.get(newSlugReference),
    ])
    if (!business.exists) throw new ApiError(404, 'El negocio ya no existe.')
    const oldSlug = String(business.data()?.slug ?? '')
    if (slugReservation.exists && slugReservation.data()?.businessId !== businessId) {
      throw new ApiError(409, 'Ya existe un negocio con ese slug.')
    }
    if (!slugReservation.exists) {
      transaction.create(newSlugReference, { businessId, createdAt: FieldValue.serverTimestamp() })
    }
    transaction.update(businessReference, {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminUid,
    })
    if (oldSlug && oldSlug !== input.slug) {
      transaction.delete(db.collection('businessSlugs').doc(oldSlug))
    }
  })
  json(response, { message: 'Negocio actualizado correctamente.' })
}

export default async function handler(request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const admin = await verifySuperAdmin(request)
    if (request.method === 'GET') {
      await listBusinesses(response)
      return
    }
    if (request.method === 'POST') {
      await createBusiness(request, response, admin.uid)
      return
    }
    if (request.method === 'PATCH') {
      await updateBusiness(request, response, admin.uid)
      return
    }
    response.statusCode = 405
    response.setHeader('Allow', 'GET, POST, PATCH')
    response.end()
  } catch (error) {
    handleAdminApiError(response, error)
  }
}

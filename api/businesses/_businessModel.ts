import { ApiError, isRecord, optionalString, requiredString } from '../_lib/adminApi.js'

export const BUSINESS_STATUSES = ['active', 'suspended'] as const
export type BusinessStatus = (typeof BUSINESS_STATUSES)[number]

export type BusinessInput = {
  name: string
  slug: string
  businessType: string
  legalName: string | null
  taxId: string | null
  email: string
  phone: string | null
  address: string | null
  country: string
  currency: string
  timezone: string
  status: BusinessStatus
  planId: string | null
  ownerUserId: string | null
}

export function generateSlug(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-|-$/g, '')
}

function isBusinessStatus(value: unknown): value is BusinessStatus {
  return typeof value === 'string' && BUSINESS_STATUSES.some((status) => status === value)
}

export function parseBusinessInput(value: unknown): BusinessInput {
  if (!isRecord(value)) throw new ApiError(400, 'La solicitud no es válida.')
  const name = requiredString(value.name, 'El nombre es obligatorio.')
  const slug = generateSlug(name)
  if (name.length > 140) throw new ApiError(400, 'El nombre no puede superar los 140 caracteres.')
  if (slug.length < 2) throw new ApiError(400, 'El nombre no permite generar un slug válido.')
  if (!isBusinessStatus(value.status)) throw new ApiError(400, 'El estado no es válido.')

  return {
    name,
    slug,
    businessType: requiredString(value.businessType, 'El tipo de negocio es obligatorio.'),
    legalName: optionalString(value.legalName),
    taxId: optionalString(value.taxId),
    email: requiredString(value.email, 'El correo es obligatorio.').toLowerCase(),
    phone: optionalString(value.phone),
    address: optionalString(value.address),
    country: requiredString(value.country, 'El país es obligatorio.'),
    currency: requiredString(value.currency, 'La moneda es obligatoria.').toUpperCase(),
    timezone: requiredString(value.timezone, 'La zona horaria es obligatoria.'),
    status: value.status,
    planId: optionalString(value.planId),
    ownerUserId: optionalString(value.ownerUserId),
  }
}

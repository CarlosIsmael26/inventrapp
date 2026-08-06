export type BusinessStatus = 'active' | 'suspended'

export type Business = {
  id: string
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
  createdAt: Date | null
  updatedAt: Date | null
}

export type BusinessInput = Omit<Business, 'id' | 'slug' | 'createdAt' | 'updatedAt'>

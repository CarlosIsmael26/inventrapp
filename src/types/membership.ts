export type BusinessRole = 'owner' | 'admin' | 'cashier' | 'seller' | 'warehouse' | 'viewer'
export type MembershipStatus = 'active' | 'inactive'

export type Membership = {
  id: string
  businessId: string
  userId: string
  role: BusinessRole
  status: MembershipStatus
  displayName: string
  email: string
  userStatus: 'active' | 'blocked'
  createdAt: Date | null
  updatedAt: Date | null
}

export type UserBusinessMembership = {
  id: string
  businessId: string
  role: BusinessRole
  business: {
    id: string
    name: string
    slug: string
    businessType: string
    currency: string
    timezone: string
  }
}

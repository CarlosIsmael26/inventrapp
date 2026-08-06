export type PlatformRole =
  | 'user'
  | 'support'
  | 'super_admin'

export type UserStatus =
  | 'active'
  | 'blocked'

export type PlatformUser = {
  uid: string
  displayName: string
  email: string
  platformRole: PlatformRole
  status: UserStatus
  businessName: string
  businessRole: string
  createdAt: Date | null
  updatedAt: Date | null
}
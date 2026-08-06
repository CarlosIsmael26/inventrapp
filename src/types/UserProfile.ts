export type PlatformRole = 'super_admin' | 'support' | 'user'
export type UserStatus = 'active' | 'blocked' | 'inactive'

export type UserProfile = {
  uid: string
  displayName: string
  email: string
  platformRole: PlatformRole
  status: UserStatus
  createdAt?: Date
  updatedAt?: Date
}
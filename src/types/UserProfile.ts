import type { PlatformRole, UserStatus } from './user'

export type UserProfile = {
  uid: string
  displayName: string
  email: string
  platformRole: PlatformRole
  status: UserStatus
  createdAt?: Date
  updatedAt?: Date
}

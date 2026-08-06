import { createContext } from 'react'
import type { UserBusinessMembership } from '../types/membership'

export type BusinessContextValue = {
  memberships: UserBusinessMembership[]
  currentMembership: UserBusinessMembership | null
  loading: boolean
  error: string | null
  selectBusiness: (membershipId: string) => void
  reload: () => Promise<void>
}

export const BusinessContext = createContext<BusinessContextValue | undefined>(undefined)

import { Navigate, Outlet } from 'react-router-dom'
import { useBusiness } from '../hooks/useBusiness'
import type { BusinessRole } from '../types/membership'

export function BusinessRoleRoute({ allowedRoles }: { allowedRoles: BusinessRole[] }) {
  const { currentMembership } = useBusiness()
  if (!currentMembership || !allowedRoles.includes(currentMembership.role)) return <Navigate to="/app" replace />
  return <Outlet />
}

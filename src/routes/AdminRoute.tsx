import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

export function AdminRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div>Cargando Inventra...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (
    !profile ||
    profile.platformRole !== 'super_admin' ||
    profile.status !== 'active'
  ) {
    return <Navigate to="/app" replace />
  }

  return <Outlet />
}
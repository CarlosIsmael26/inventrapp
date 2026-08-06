import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { SuperAdminLayout } from '../layouts/SuperAdminLayout'
import { LoginPage } from '../modules/auth/LoginPage'
import { BusinessDashboardPage } from '../modules/business/BusinessDashboardPage'
import { SuperAdminDashboardPage } from '../modules/superadmin/SuperAdminDashboardPage'
import { UsersPage } from '../modules/superadmin/UsersPage'
import { AdminRoute } from './AdminRoute'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboardPage />} />
            <Route path="usuarios" element={<UsersPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<BusinessDashboardPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BarChart3, CircleDollarSign, PackagePlus, Truck, Users, WalletCards } from 'lucide-react'

import { BusinessLayout } from '../components/layout/BusinessLayout'
import { SuperAdminLayout } from '../layouts/SuperAdminLayout'
import { LoginPage } from '../modules/auth/LoginPage'
import { BusinessDashboardPage } from '../modules/business/BusinessDashboardPage'
import { BusinessSettingsPage } from '../modules/business/BusinessSettingsPage'
import { InventoryPage } from '../modules/business/InventoryPage'
import { QuotationsPage } from '../modules/business/QuotationsPage'
import { QuoteEditorPage } from '../modules/business/quotations/QuoteEditorPage'
import { SalesPage } from '../modules/business/SalesPage'
import { BusinessTeamPage } from '../modules/business/BusinessTeamPage'
import { BusinessModulePlaceholder } from '../modules/business/shared/BusinessModulePlaceholder'
import { SuperAdminDashboardPage } from '../modules/superadmin/SuperAdminDashboardPage'
import { BusinessesPage } from '../modules/superadmin/BusinessesPage'
import { UsersPage } from '../modules/superadmin/UsersPage'
import { AdminRoute } from './AdminRoute'
import { BusinessRoleRoute } from './BusinessRoleRoute'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboardPage />} />
            <Route path="negocios" element={<BusinessesPage />} />
            <Route path="usuarios" element={<UsersPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<BusinessLayout />}>
            <Route index element={<BusinessDashboardPage />} />
            <Route element={<BusinessRoleRoute allowedRoles={['owner', 'admin', 'warehouse']} />}>
              <Route path="inventario" element={<InventoryPage />} />
              <Route path="compras" element={<BusinessModulePlaceholder title="Compras" description="Aquí registraremos órdenes, recepciones y costos de compra." icon={PackagePlus} />} />
              <Route path="proveedores" element={<BusinessModulePlaceholder title="Proveedores" description="Aquí gestionaremos los proveedores vinculados al negocio." icon={Truck} />} />
            </Route>
            <Route element={<BusinessRoleRoute allowedRoles={['owner', 'admin', 'cashier', 'seller']} />}>
              <Route path="pos" element={<SalesPage />} />
              <Route path="clientes" element={<BusinessModulePlaceholder title="Clientes" description="Aquí administraremos clientes y su historial de compras." icon={Users} />} />
            </Route>
            <Route element={<BusinessRoleRoute allowedRoles={['owner', 'admin', 'seller']} />}><Route path="cotizaciones" element={<QuotationsPage />} /><Route path="cotizaciones/nueva" element={<QuoteEditorPage />} /><Route path="cotizaciones/:quotationId/editar" element={<QuoteEditorPage />} /></Route>
            <Route element={<BusinessRoleRoute allowedRoles={['owner', 'admin', 'cashier']} />}><Route path="caja" element={<BusinessModulePlaceholder title="Caja" description="Aquí controlaremos aperturas, cierres y movimientos de efectivo." icon={WalletCards} />} /></Route>
            <Route element={<BusinessRoleRoute allowedRoles={['owner', 'admin']} />}>
              <Route path="creditos" element={<BusinessModulePlaceholder title="Créditos" description="Aquí controlaremos cuentas por cobrar y pagos pendientes." icon={CircleDollarSign} />} />
              <Route path="equipo" element={<BusinessTeamPage />} />
              <Route path="configuracion" element={<BusinessSettingsPage />} />
            </Route>
            <Route element={<BusinessRoleRoute allowedRoles={['owner', 'admin', 'viewer']} />}><Route path="reportes" element={<BusinessModulePlaceholder title="Reportes" description="Aquí consultaremos indicadores comerciales y operativos." icon={BarChart3} />} /></Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

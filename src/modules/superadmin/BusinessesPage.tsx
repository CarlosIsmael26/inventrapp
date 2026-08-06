import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

import { Button, ConfirmDialog, useToast } from '../../components/ui'
import { updateBusiness } from '../../services'
import type { Business } from '../../types/business'
import { BusinessDrawer, type BusinessDrawerMode } from './businesses/BusinessDrawer'
import { BusinessMembersDrawer } from './businesses/BusinessMembersDrawer'
import { BusinessStats } from './businesses/BusinessStats'
import { BusinessesTable } from './businesses/BusinessesTable'
import { useBusinesses, type BusinessStatusFilter } from './businesses/useBusinesses'

import './BusinessesPage.scss'

export function BusinessesPage() {
  const toast = useToast()
  const [drawer, setDrawer] = useState<{ mode: BusinessDrawerMode; business: Business | null } | null>(null)
  const [statusBusiness, setStatusBusiness] = useState<Business | null>(null)
  const [membersBusiness, setMembersBusiness] = useState<Business | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const {
    filteredBusinesses, loading, error, search, statusFilter,
    totalBusinesses, activeBusinesses, suspendedBusinesses, businessTypes,
    setSearch, setStatusFilter, reloadBusinesses,
  } = useBusinesses()

  async function toggleStatus() {
    if (!statusBusiness) return
    const nextStatus = statusBusiness.status === 'active' ? 'suspended' : 'active'
    try {
      setUpdatingStatus(true)
      const { id, slug: _slug, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = statusBusiness
      const message = await updateBusiness(id, { ...input, status: nextStatus })
      toast.success(nextStatus === 'active' ? 'Negocio reactivado' : 'Negocio suspendido', message)
      setStatusBusiness(null)
      await reloadBusinesses()
    } catch (requestError) {
      toast.error('No fue posible actualizar el negocio', requestError instanceof Error ? requestError.message : undefined)
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="businesses-page">
      <header className="businesses-page__header">
        <div><span>Administración</span><h2>Negocios</h2><p>Registra y controla los negocios que utilizan Inventra.</p></div>
        <Button type="button" icon={<Plus size={19} />} onClick={() => setDrawer({ mode: 'create', business: null })}>Crear negocio</Button>
      </header>

      <BusinessStats total={totalBusinesses} active={activeBusinesses} suspended={suspendedBusinesses} types={businessTypes} />

      <section className="businesses-panel">
        <div className="businesses-toolbar">
          <div className="businesses-search"><Search size={18} /><input type="search" placeholder="Buscar por nombre, slug o correo..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as BusinessStatusFilter)}>
            <option value="all">Todos los estados</option><option value="active">Activos</option><option value="suspended">Suspendidos</option>
          </select>
        </div>
        {error ? (
          <div className="businesses-error"><p>{error}</p><Button type="button" variant="secondary" onClick={() => void reloadBusinesses()}>Reintentar</Button></div>
        ) : (
          <BusinessesTable
            businesses={filteredBusinesses}
            loading={loading}
            onView={(business) => setDrawer({ mode: 'view', business })}
            onEdit={(business) => setDrawer({ mode: 'edit', business })}
            onToggleStatus={setStatusBusiness}
            onManageMembers={setMembersBusiness}
          />
        )}
      </section>

      <BusinessDrawer open={Boolean(drawer)} mode={drawer?.mode ?? 'create'} business={drawer?.business ?? null} onClose={() => setDrawer(null)} onSaved={() => void reloadBusinesses()} />
      <BusinessMembersDrawer business={membersBusiness} onClose={() => setMembersBusiness(null)} onChanged={() => void reloadBusinesses()} />
      {statusBusiness && (
        <ConfirmDialog
          open
          title={statusBusiness.status === 'active' ? 'Suspender negocio' : 'Reactivar negocio'}
          description={statusBusiness.status === 'active' ? `${statusBusiness.name} quedará suspendido. Sus datos se conservarán para reactivarlo posteriormente.` : `${statusBusiness.name} volverá a estar activo.`}
          confirmText={statusBusiness.status === 'active' ? 'Suspender' : 'Reactivar'}
          variant={statusBusiness.status === 'active' ? 'warning' : 'info'}
          loading={updatingStatus}
          onClose={() => setStatusBusiness(null)}
          onConfirm={() => void toggleStatus()}
        />
      )}
    </div>
  )
}

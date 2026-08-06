import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { DataTable, type DataTableColumn } from '../../components/data-table'
import { Badge, Button, ConfirmDialog, useToast } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useBusiness } from '../../hooks/useBusiness'
import { getBusinessTeam, updateBusinessTeamMember } from '../../services'
import type { BusinessTeamMember, TeamRole } from '../../types/businessTeam'
import { TeamUserDrawer } from './team/TeamUserDrawer'

import './BusinessTeamPage.scss'

const roleOptions = [{ value: 'admin', label: 'Administrador' }, { value: 'cashier', label: 'Cajero' }, { value: 'seller', label: 'Vendedor' }, { value: 'warehouse', label: 'Bodega' }, { value: 'viewer', label: 'Solo lectura' }]
const roleLabels: Record<string, string> = { owner: 'Propietario', ...Object.fromEntries(roleOptions.map((option) => [option.value, option.label])) }

export function BusinessTeamPage() {
  const toast = useToast(); const { user } = useAuth(); const { currentMembership } = useBusiness()
  const [members, setMembers] = useState<BusinessTeamMember[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [search, setSearch] = useState(''); const [drawerOpen, setDrawerOpen] = useState(false); const [pending, setPending] = useState<BusinessTeamMember | null>(null); const [saving, setSaving] = useState(false)
  const businessId = currentMembership?.businessId ?? ''
  const load = useCallback(async () => { if (!businessId) return; try { setLoading(true); setError(null); setMembers(await getBusinessTeam(businessId)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar el equipo.') } finally { setLoading(false) } }, [businessId])
  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => { const value = search.trim().toLowerCase(); return value ? members.filter((member) => member.displayName.toLowerCase().includes(value) || member.email.toLowerCase().includes(value)) : members }, [members, search])

  async function changeRole(member: BusinessTeamMember, role: string) {
    if (member.role === 'owner' || role === 'owner') return
    try { setSaving(true); const message = await updateBusinessTeamMember(businessId, member.userId, role as TeamRole, member.status); toast.success('Rol actualizado', message); await load() }
    catch (requestError) { toast.error('No fue posible actualizar el rol', requestError instanceof Error ? requestError.message : undefined) }
    finally { setSaving(false) }
  }
  async function toggleStatus() {
    if (!pending || pending.role === 'owner') return
    try { setSaving(true); const next = pending.status === 'active' ? 'inactive' : 'active'; const message = await updateBusinessTeamMember(businessId, pending.userId, pending.role, next); toast.success('Acceso actualizado', message); setPending(null); await load() }
    catch (requestError) { toast.error('No fue posible actualizar el acceso', requestError instanceof Error ? requestError.message : undefined) }
    finally { setSaving(false) }
  }
  const columns: DataTableColumn<BusinessTeamMember>[] = [
    { key: 'member', header: 'Usuario', render: (member) => <div className="team-member"><span>{member.displayName.charAt(0).toUpperCase()}</span><div><strong>{member.displayName}</strong><small>{member.email}</small></div></div> },
    { key: 'role', header: 'Rol', render: (member) => member.role === 'owner' ? <strong>{roleLabels.owner}</strong> : <select className="team-role-select" value={member.role} disabled={saving || member.userId === user?.uid || (currentMembership?.role === 'admin' && member.role === 'admin')} onChange={(event) => void changeRole(member, event.target.value)}>{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> },
    { key: 'status', header: 'Estado', render: (member) => <Badge variant={member.status === 'active' ? 'success' : 'danger'}>{member.status === 'active' ? 'Activo' : 'Inactivo'}</Badge> },
    { key: 'created', header: 'Creación', render: (member) => member.createdAt ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(member.createdAt) : 'Sin fecha' },
    { key: 'actions', header: '', align: 'right', render: (member) => member.role === 'owner' || member.userId === user?.uid || (currentMembership?.role === 'admin' && member.role === 'admin') ? null : <Button variant="secondary" onClick={() => setPending(member)}>{member.status === 'active' ? 'Desactivar' : 'Activar'}</Button> },
  ]

  return <div className="business-team-page"><header className="business-team-page__header"><div><span>Administración</span><h2>Equipo</h2><p>Crea usuarios y controla qué módulos pueden utilizar.</p></div><Button icon={<Plus size={18} />} onClick={() => setDrawerOpen(true)}>Crear usuario</Button></header><section className="business-team-panel"><div className="business-team-toolbar"><div><Search size={18} /><input type="search" value={search} placeholder="Buscar por nombre o correo..." onChange={(event) => setSearch(event.target.value)} /></div><span>{members.length} miembros</span></div>{error ? <div className="business-team-error"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>Reintentar</Button></div> : <DataTable columns={columns} data={filtered} getRowKey={(member) => member.id} loading={loading} emptyTitle="No hay miembros" emptyDescription="Crea el primer usuario para comenzar a formar tu equipo." />}</section><TeamUserDrawer open={drawerOpen} businessId={businessId} allowAdminRole={currentMembership?.role === 'owner'} onClose={() => setDrawerOpen(false)} onSaved={() => void load()} /><ConfirmDialog open={Boolean(pending)} title={pending?.status === 'active' ? 'Desactivar usuario' : 'Activar usuario'} description={`${pending?.displayName ?? 'El usuario'} ${pending?.status === 'active' ? 'perderá temporalmente el acceso al negocio.' : 'recuperará el acceso al negocio.'}`} confirmText={pending?.status === 'active' ? 'Desactivar' : 'Activar'} variant="warning" loading={saving} onClose={() => setPending(null)} onConfirm={() => void toggleStatus()} /></div>
}

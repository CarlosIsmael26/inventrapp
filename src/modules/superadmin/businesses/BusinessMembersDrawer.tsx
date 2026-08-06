import { PauseCircle, PlayCircle, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Drawer } from '../../../components/drawer'
import { SelectField } from '../../../components/forms'
import { Badge, Button, ConfirmDialog, EmptyState, Loader, useToast } from '../../../components/ui'
import { createMembership, deleteMembership, getBusinessMemberships, getPlatformUsers, updateMembership } from '../../../services'
import type { Business } from '../../../types/business'
import type { BusinessRole, Membership } from '../../../types/membership'
import type { PlatformUser } from '../../../types/user'

const roleOptions = [
  { value: 'owner', label: 'Propietario' }, { value: 'admin', label: 'Administrador' },
  { value: 'cashier', label: 'Cajero' }, { value: 'seller', label: 'Vendedor' },
  { value: 'warehouse', label: 'Bodega' }, { value: 'viewer', label: 'Solo lectura' },
]
type PendingAction = { membership: Membership; type: 'status' | 'delete' }

export function BusinessMembersDrawer({ business, onClose, onChanged }: { business: Business | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<BusinessRole>('owner')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)

  const load = useCallback(async () => {
    if (!business) return
    try {
      setLoading(true); setError(null)
      const [membershipData, userData] = await Promise.all([getBusinessMemberships(business.id), getPlatformUsers()])
      setMemberships(membershipData); setUsers(userData)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar los miembros.') }
    finally { setLoading(false) }
  }, [business])
  useEffect(() => { if (business) void load() }, [business, load])

  const availableUsers = useMemo(() => users.filter((user) => user.status === 'active' && user.platformRole !== 'super_admin' && !memberships.some((membership) => membership.userId === user.uid)), [memberships, users])
  useEffect(() => { setUserId((current) => availableUsers.some((user) => user.uid === current) ? current : (availableUsers[0]?.uid ?? '')) }, [availableUsers])

  async function addMember() {
    if (!business || !userId) return
    try { setSaving(true); const message = await createMembership(business.id, userId, role); toast.success('Usuario asignado', message); await load(); onChanged() }
    catch (requestError) { toast.error('No fue posible asignar el usuario', requestError instanceof Error ? requestError.message : undefined) }
    finally { setSaving(false) }
  }

  async function changeRole(membership: Membership, nextRole: string) {
    if (!business) return
    try { setSaving(true); const message = await updateMembership(business.id, membership.id, nextRole as BusinessRole, membership.status); toast.success('Rol actualizado', message); await load(); onChanged() }
    catch (requestError) { toast.error('No fue posible actualizar el rol', requestError instanceof Error ? requestError.message : undefined) }
    finally { setSaving(false) }
  }

  async function confirmAction() {
    if (!business || !pending) return
    try {
      setSaving(true)
      const message = pending.type === 'delete'
        ? await deleteMembership(business.id, pending.membership.id)
        : await updateMembership(business.id, pending.membership.id, pending.membership.role, pending.membership.status === 'active' ? 'inactive' : 'active')
      toast.success(pending.type === 'delete' ? 'Miembro retirado' : 'Estado actualizado', message)
      setPending(null); await load(); onChanged()
    } catch (requestError) { toast.error('No fue posible completar la acción', requestError instanceof Error ? requestError.message : undefined) }
    finally { setSaving(false) }
  }

  return (
    <>
      <Drawer open={Boolean(business)} title={`Equipo de ${business?.name ?? ''}`} description="Asigna usuarios y define qué función cumplen dentro del negocio." onClose={onClose}>
        {loading ? <div className="members-loading"><Loader label="Cargando equipo..." /></div> : error ? <div className="members-error"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>Reintentar</Button></div> : (
          <div className="members-content">
            <section className="members-add">
              <h3>Agregar miembro</h3>
              {availableUsers.length ? <>
                <SelectField id="member-user" label="Usuario" value={userId} options={availableUsers.map((user) => ({ value: user.uid, label: `${user.displayName} · ${user.email}` }))} onChange={setUserId} />
                <SelectField id="member-role" label="Rol en el negocio" value={role} options={roleOptions} onChange={(value) => setRole(value as BusinessRole)} />
                <Button icon={<UserPlus size={18} />} loading={saving} onClick={() => void addMember()}>Asignar al negocio</Button>
              </> : <p>Todos los usuarios activos disponibles ya están asignados.</p>}
            </section>
            <section className="members-list">
              <h3>Miembros ({memberships.length})</h3>
              {memberships.length === 0 ? <EmptyState title="Sin miembros asignados" description="Agrega al propietario o a un empleado para darle acceso a este negocio." /> : memberships.map((membership) => (
                <article className="member-card" key={membership.id}>
                  <div className="member-card__identity"><span>{membership.displayName.charAt(0).toUpperCase()}</span><div><strong>{membership.displayName}</strong><small>{membership.email}</small></div></div>
                  <div className="member-card__controls">
                    <SelectField id={`role-${membership.id}`} label="Rol" value={membership.role} options={roleOptions} disabled={saving || membership.status === 'inactive'} onChange={(value) => void changeRole(membership, value)} />
                    <Badge variant={membership.status === 'active' ? 'success' : 'danger'}>{membership.status === 'active' ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <div className="member-card__actions">
                    <Button variant="secondary" icon={membership.status === 'active' ? <PauseCircle size={16} /> : <PlayCircle size={16} />} onClick={() => setPending({ membership, type: 'status' })}>{membership.status === 'active' ? 'Desactivar' : 'Activar'}</Button>
                    <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setPending({ membership, type: 'delete' })}>Retirar</Button>
                  </div>
                </article>
              ))}
            </section>
          </div>
        )}
      </Drawer>
      <ConfirmDialog open={Boolean(pending)} title={pending?.type === 'delete' ? 'Retirar miembro' : pending?.membership.status === 'active' ? 'Desactivar acceso' : 'Reactivar acceso'} description={pending?.type === 'delete' ? `${pending?.membership.displayName} dejará de pertenecer a este negocio.` : `${pending?.membership.displayName} ${pending?.membership.status === 'active' ? 'perderá temporalmente' : 'recuperará'} el acceso al negocio.`} confirmText={pending?.type === 'delete' ? 'Retirar' : 'Confirmar'} variant={pending?.type === 'delete' ? 'danger' : 'warning'} loading={saving} onClose={() => setPending(null)} onConfirm={() => void confirmAction()} />
    </>
  )
}

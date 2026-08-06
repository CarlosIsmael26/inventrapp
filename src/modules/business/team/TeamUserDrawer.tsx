import { useEffect, useState, type FormEvent } from 'react'
import { Drawer } from '../../../components/drawer'
import { PasswordField, SelectField, TextField } from '../../../components/forms'
import { Button, useToast } from '../../../components/ui'
import { createBusinessTeamUser } from '../../../services'
import type { TeamRole } from '../../../types/businessTeam'

const roleOptions = [{ value: 'admin', label: 'Administrador' }, { value: 'cashier', label: 'Cajero' }, { value: 'seller', label: 'Vendedor' }, { value: 'warehouse', label: 'Bodega' }, { value: 'viewer', label: 'Solo lectura' }]
const initialForm = { displayName: '', email: '', temporaryPassword: '', role: 'seller' as TeamRole }

export function TeamUserDrawer({ open, businessId, allowAdminRole, onClose, onSaved }: { open: boolean; businessId: string; allowAdminRole: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const [form, setForm] = useState(initialForm); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) { setForm(initialForm); setError('') } }, [open])
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (!form.displayName.trim() || !form.email.trim()) return setError('Completa el nombre y el correo.')
    if (form.temporaryPassword.length < 6) return setError('La contraseña temporal debe tener al menos 6 caracteres.')
    try { setSaving(true); const message = await createBusinessTeamUser(businessId, { ...form, displayName: form.displayName.trim(), email: form.email.trim().toLowerCase() }); toast.success('Usuario creado', message); onSaved(); onClose() }
    catch (requestError) { const message = requestError instanceof Error ? requestError.message : 'No fue posible crear el usuario.'; setError(message); toast.error('Error al crear usuario', message) }
    finally { setSaving(false) }
  }
  return <Drawer open={open} title="Crear usuario del negocio" description="Crea una cuenta y asigna su función dentro de este negocio." onClose={onClose} footer={<><Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" form="team-user-form" loading={saving}>Crear usuario</Button></>}><form id="team-user-form" className="team-user-form" onSubmit={(event) => void submit(event)}><TextField id="team-name" label="Nombre completo" value={form.displayName} required disabled={saving} onChange={(displayName) => setForm((current) => ({ ...current, displayName }))} /><TextField id="team-email" type="email" label="Correo electrónico" value={form.email} required disabled={saving} onChange={(email) => setForm((current) => ({ ...current, email }))} /><PasswordField id="team-password" label="Contraseña temporal" value={form.temporaryPassword} helperText="El empleado la utilizará para su primer ingreso." required disabled={saving} onChange={(temporaryPassword) => setForm((current) => ({ ...current, temporaryPassword }))} /><SelectField id="team-role" label="Rol en el negocio" value={form.role} options={allowAdminRole ? roleOptions : roleOptions.filter((option) => option.value !== 'admin')} disabled={saving} onChange={(role) => setForm((current) => ({ ...current, role: role as TeamRole }))} />{error && <div className="form-error">{error}</div>}</form></Drawer>
}

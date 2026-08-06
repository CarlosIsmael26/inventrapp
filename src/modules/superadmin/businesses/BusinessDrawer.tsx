import { useEffect, useState, type FormEvent } from 'react'

import { Drawer } from '../../../components/drawer'
import { SelectField, TextField, type SelectOption } from '../../../components/forms'
import { Button, useToast } from '../../../components/ui'
import { createBusiness, updateBusiness } from '../../../services'
import type { Business, BusinessInput } from '../../../types/business'

export type BusinessDrawerMode = 'create' | 'edit' | 'view'

type Props = {
  open: boolean
  mode: BusinessDrawerMode
  business: Business | null
  onClose: () => void
  onSaved: () => void
}

const initialForm: BusinessInput = {
  name: '',
  businessType: 'stationery',
  legalName: null,
  taxId: null,
  email: '',
  phone: null,
  address: null,
  country: 'EC',
  currency: 'USD',
  timezone: 'America/Guayaquil',
  status: 'active',
  planId: null,
  ownerUserId: null,
}

const businessTypeOptions: SelectOption[] = [
  { value: 'stationery', label: 'Papelería' },
  { value: 'hardware_store', label: 'Ferretería' },
  { value: 'bookstore', label: 'Librería' },
  { value: 'retail_store', label: 'Tienda' },
  { value: 'distributor', label: 'Distribuidor' },
  { value: 'other', label: 'Otro' },
]

function generateSlug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-|-$/g, '')
}

export function BusinessDrawer({ open, mode, business, onClose, onSaved }: Props) {
  const toast = useToast()
  const [form, setForm] = useState<BusinessInput>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const readOnly = mode === 'view'

  useEffect(() => {
    if (!open) return
    setForm(
      business
        ? {
            name: business.name,
            businessType: business.businessType,
            legalName: business.legalName,
            taxId: business.taxId,
            email: business.email,
            phone: business.phone,
            address: business.address,
            country: business.country,
            currency: business.currency,
            timezone: business.timezone,
            status: business.status,
            planId: business.planId,
            ownerUserId: business.ownerUserId,
          }
        : initialForm,
    )
    setError('')
  }, [business, open])

  function update<K extends keyof BusinessInput>(field: K, value: BusinessInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    if (!name || !email) {
      setError('Nombre y correo son obligatorios.')
      return
    }

    try {
      setSaving(true)
      setError('')
      const input = { ...form, name, email }
      const message = business
        ? await updateBusiness(business.id, input)
        : await createBusiness(input)
      toast.success(business ? 'Negocio actualizado' : 'Negocio creado', message)
      onSaved()
      onClose()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No fue posible guardar el negocio.'
      setError(message)
      toast.error('Error al guardar negocio', message)
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'create' ? 'Crear negocio' : mode === 'edit' ? 'Editar negocio' : 'Detalle del negocio'

  return (
    <Drawer
      open={open}
      title={title}
      description={readOnly ? 'Información general registrada para este negocio.' : 'Configura los datos generales del negocio.'}
      onClose={onClose}
      footer={
        readOnly ? (
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
        ) : (
          <>
            <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="business-form" loading={saving}>Guardar negocio</Button>
          </>
        )
      }
    >
      <form id="business-form" className="business-form" onSubmit={handleSubmit}>
        <TextField id="business-name" label="Nombre comercial" value={form.name} required disabled={saving || readOnly} onChange={(value) => update('name', value)} />
        <TextField id="business-slug" label="Slug" value={business && readOnly ? business.slug : generateSlug(form.name)} helperText="Se genera automáticamente y debe ser único." disabled onChange={() => undefined} />
        <SelectField id="business-type" label="Tipo de negocio" value={form.businessType} options={businessTypeOptions} disabled={saving || readOnly} onChange={(value) => update('businessType', value)} />
        <TextField id="business-legal-name" label="Razón social" value={form.legalName ?? ''} disabled={saving || readOnly} onChange={(value) => update('legalName', value || null)} />
        <TextField id="business-tax-id" label="RUC / identificación fiscal" value={form.taxId ?? ''} disabled={saving || readOnly} onChange={(value) => update('taxId', value || null)} />
        <TextField id="business-email" type="email" label="Correo" value={form.email} required disabled={saving || readOnly} onChange={(value) => update('email', value)} />
        <TextField id="business-phone" type="tel" label="Teléfono" value={form.phone ?? ''} disabled={saving || readOnly} onChange={(value) => update('phone', value || null)} />
        <TextField id="business-address" label="Dirección" value={form.address ?? ''} disabled={saving || readOnly} onChange={(value) => update('address', value || null)} />
        <SelectField id="business-country" label="País" value={form.country} options={[{ value: 'EC', label: 'Ecuador' }]} disabled={saving || readOnly} onChange={(value) => update('country', value)} />
        <SelectField id="business-currency" label="Moneda" value={form.currency} options={[{ value: 'USD', label: 'USD — Dólar estadounidense' }]} disabled={saving || readOnly} onChange={(value) => update('currency', value)} />
        <SelectField id="business-timezone" label="Zona horaria" value={form.timezone} options={[{ value: 'America/Guayaquil', label: 'América/Guayaquil' }]} disabled={saving || readOnly} onChange={(value) => update('timezone', value)} />
        <SelectField id="business-status" label="Estado" value={form.status} options={[{ value: 'active', label: 'Activo' }, { value: 'suspended', label: 'Suspendido' }]} disabled={saving || readOnly} onChange={(value) => update('status', value as BusinessInput['status'])} />
        {error && <div className="form-error">{error}</div>}
      </form>
    </Drawer>
  )
}

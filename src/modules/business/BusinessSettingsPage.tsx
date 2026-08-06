import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import { Button, Card, ConfirmDialog, useToast } from '../../components/ui'
import { useBusiness } from '../../hooks/useBusiness'
import { deleteBusinessLogo, uploadBusinessLogo } from '../../services'

import './BusinessSettingsPage.scss'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const allowedTypes = new Set(['image/png', 'image/jpeg'])

export function BusinessSettingsPage() {
  const toast = useToast()
  const { currentMembership, reload } = useBusiness()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const business = currentMembership?.business
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    if (!allowedTypes.has(selected.type)) return toast.error('Formato no permitido', 'Selecciona una imagen PNG o JPG.')
    if (selected.size > MAX_LOGO_BYTES) return toast.error('Imagen demasiado grande', 'El logo no puede superar 2 MB.')
    if (preview) URL.revokeObjectURL(preview)
    setFile(selected); setPreview(URL.createObjectURL(selected))
  }
  async function save() {
    if (!business || !file) return
    try { setSaving(true); const message = await uploadBusinessLogo(business.id, file); toast.success('Logo actualizado', message); setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); await reload() }
    catch (error) { toast.error('No fue posible guardar el logo', error instanceof Error ? error.message : undefined) }
    finally { setSaving(false) }
  }
  async function remove() {
    if (!business) return
    try { setSaving(true); const message = await deleteBusinessLogo(business.id); toast.success('Logo eliminado', message); setConfirmDelete(false); await reload() }
    catch (error) { toast.error('No fue posible eliminar el logo', error instanceof Error ? error.message : undefined) }
    finally { setSaving(false) }
  }
  if (!business) return null
  const logo = preview ?? business.logoUrl
  return <div className="business-settings-page"><header className="business-settings-page__header"><div><span>Negocio</span><h2>Configuración</h2><p>Personaliza la identidad que verán tus clientes.</p></div></header><Card className="branding-card" title="Logo del negocio" description="Aparecerá en tu espacio de trabajo y en las cotizaciones PDF."><div className="branding-logo"><div className="branding-logo__preview">{logo ? <img src={logo} alt={`Logo de ${business.name}`} /> : <span>{business.name.charAt(0).toUpperCase()}</span>}</div><div><strong>{file?.name ?? business.name}</strong><p>Usa una imagen cuadrada PNG o JPG de máximo 2 MB. Recomendado: 600 × 600 px.</p><div className="branding-logo__actions"><input ref={input} type="file" accept="image/png,image/jpeg" onChange={chooseFile} /><Button variant="secondary" icon={<ImagePlus size={17} />} onClick={() => input.current?.click()}>{business.logoUrl ? 'Cambiar imagen' : 'Seleccionar imagen'}</Button>{file && <Button icon={<Upload size={17} />} loading={saving} onClick={() => void save()}>Guardar logo</Button>}{business.logoUrl && !file && <Button variant="danger" icon={<Trash2 size={17} />} onClick={() => setConfirmDelete(true)}>Quitar logo</Button>}</div></div></div></Card><ConfirmDialog open={confirmDelete} title="Quitar logo" description="El negocio volverá a mostrar su inicial y las próximas cotizaciones se generarán sin logo." confirmText="Quitar logo" variant="danger" loading={saving} onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} /></div>
}

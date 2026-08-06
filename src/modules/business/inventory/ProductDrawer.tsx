import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { Drawer } from '../../../components/drawer'
import { TextField } from '../../../components/forms'
import { Button, useToast } from '../../../components/ui'
import { createInventoryProduct, updateInventoryProduct } from '../../../services'
import type { InventoryProduct, ManualInventoryProductInput } from '../../../types/inventory'

type FormState = { code: string; name: string; brand: string; quantity: string; purchasePrice: string; profitPercentage: string }
const emptyForm: FormState = { code: '', name: '', brand: '', quantity: '0', purchasePrice: '0', profitPercentage: '20' }
function toForm(product: InventoryProduct): FormState { return { code: product.code, name: product.name, brand: product.brand, quantity: String(product.quantity), purchasePrice: String(product.purchasePrice), profitPercentage: String(product.profitPercentage) } }

export function ProductDrawer({ open, businessId, product, onClose, onSaved }: { open: boolean; businessId: string; product: InventoryProduct | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const [form, setForm] = useState<FormState>(emptyForm); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) { setForm(product ? toForm(product) : emptyForm); setError('') } }, [open, product])
  const calculatedSalePrice = useMemo(() => { const cost = Number(form.purchasePrice); const percentage = Number(form.profitPercentage); return Number.isFinite(cost) && Number.isFinite(percentage) ? Math.round((cost * (1 + percentage / 100) + Number.EPSILON) * 100) / 100 : 0 }, [form.profitPercentage, form.purchasePrice])
  function change(field: keyof FormState, value: string) { setForm((current) => ({ ...current, [field]: value })) }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    const input: ManualInventoryProductInput = { code: form.code.trim(), name: form.name.trim(), brand: form.brand.trim(), quantity: Number(form.quantity), purchasePrice: Number(form.purchasePrice), profitPercentage: Number(form.profitPercentage) }
    if (!input.code || !input.name || !input.brand) return setError('Completa el código, nombre y marca.')
    if (!Number.isInteger(input.quantity) || input.quantity < 0) return setError('La cantidad debe ser un entero mayor o igual a cero.')
    if (!Number.isFinite(input.purchasePrice) || input.purchasePrice < 0) return setError('El costo de compra no es válido.')
    if (!Number.isFinite(input.profitPercentage) || input.profitPercentage < 0 || input.profitPercentage > 1000) return setError('La ganancia debe estar entre 0% y 1000%.')
    try {
      setSaving(true)
      const message = product ? await updateInventoryProduct(businessId, product.id, input) : await createInventoryProduct(businessId, input)
      toast.success(product ? 'Producto actualizado' : 'Producto creado', message); onSaved(); onClose()
    } catch (requestError) { const message = requestError instanceof Error ? requestError.message : 'No fue posible guardar el producto.'; setError(message); toast.error('Error al guardar', message) }
    finally { setSaving(false) }
  }
  return <Drawer open={open} title={product ? 'Editar producto' : 'Crear producto'} description="Define existencias, costo y porcentaje de ganancia." onClose={onClose} footer={<><Button variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" form="product-form" loading={saving}>Guardar producto</Button></>}><form id="product-form" className="product-form" onSubmit={(event) => void submit(event)}><TextField id="product-code" label="Código" value={form.code} required disabled={saving} onChange={(value) => change('code', value)} /><TextField id="product-name" label="Nombre" value={form.name} required disabled={saving} onChange={(value) => change('name', value)} /><TextField id="product-brand" label="Marca" value={form.brand} required disabled={saving} onChange={(value) => change('brand', value)} /><TextField id="product-quantity" type="number" min={0} step={1} label="Cantidad actual" value={form.quantity} required disabled={saving} onChange={(value) => change('quantity', value)} /><TextField id="product-cost" type="number" min={0} step="any" label="Costo de compra" value={form.purchasePrice} required disabled={saving} onChange={(value) => change('purchasePrice', value)} /><TextField id="product-profit" type="number" min={0} step="any" label="Ganancia (%)" value={form.profitPercentage} helperText={`Precio de venta calculado: $${calculatedSalePrice.toFixed(2)}`} required disabled={saving} onChange={(value) => change('profitPercentage', value)} />{error && <div className="form-error">{error}</div>}</form></Drawer>
}

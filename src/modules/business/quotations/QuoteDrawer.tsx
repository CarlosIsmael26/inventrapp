import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { SelectField, TextField } from '../../../components/forms'
import { Drawer } from '../../../components/drawer'
import { Button, IconButton, useToast } from '../../../components/ui'
import { createQuotation } from '../../../services'
import type { InventoryProduct } from '../../../types/inventory'
import type { Quotation } from '../../../types/quotation'

type DraftItem = { productId: string; quantity: string }
type Props = { open: boolean; businessId: string; currency: string; products: InventoryProduct[]; onClose: () => void; onSaved: (quotation: Quotation) => void }

function futureDate(days: number): string { const value = new Date(); value.setDate(value.getDate() + days); return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` }

export function QuoteDrawer({ open, businessId, currency, products, onClose, onSaved }: Props) {
  const toast = useToast()
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [validUntil, setValidUntil] = useState(futureDate(15))
  const [notes, setNotes] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (open) { setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setValidUntil(futureDate(15)); setNotes(''); setSelectedProduct(''); setItems([]); setError(null) } }, [open])
  const formatMoney = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value)
  const selectedIds = new Set(items.map((item) => item.productId))
  const availableProducts = products.filter((product) => !selectedIds.has(product.id))
  const rows = useMemo(() => items.map((item) => ({ ...item, product: products.find((product) => product.id === item.productId) })).filter((item): item is DraftItem & { product: InventoryProduct } => Boolean(item.product)), [items, products])
  const subtotal = rows.reduce((sum, item) => sum + item.product.salePrice * (Number(item.quantity) || 0), 0)
  const tax = Math.round((subtotal * 0.15 + Number.EPSILON) * 100) / 100
  function addProduct() { if (!selectedProduct) return; setItems((current) => [...current, { productId: selectedProduct, quantity: '1' }]); setSelectedProduct('') }
  async function submit() {
    if (!customerName.trim()) return setError('Ingresa el nombre del cliente.')
    if (!items.length) return setError('Agrega al menos un producto.')
    if (items.some((item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0)) return setError('Todas las cantidades deben ser enteros mayores que cero.')
    try {
      setSaving(true); setError(null)
      const result = await createQuotation(businessId, { customerName, customerEmail, customerPhone, validUntil, notes, items: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })) })
      toast.success('Cotización creada', result.message); onSaved(result.quotation); onClose()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible crear la cotización.') }
    finally { setSaving(false) }
  }
  return <Drawer open={open} title="Nueva cotización" description="Los precios se toman del inventario y el IVA se calcula automáticamente al 15%." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={saving} onClick={() => void submit()}>Guardar cotización</Button></>}>
    <div className="quote-form">
      <section className="quote-form__section"><h3>Cliente</h3><TextField id="quote-customer" label="Nombre" value={customerName} required onChange={setCustomerName} /><div className="quote-form__grid"><TextField id="quote-email" label="Correo" type="email" value={customerEmail} onChange={setCustomerEmail} /><TextField id="quote-phone" label="WhatsApp" type="tel" value={customerPhone} onChange={setCustomerPhone} /></div><TextField id="quote-valid" label="Válida hasta" type="date" value={validUntil} required onChange={setValidUntil} /></section>
      <section className="quote-form__section"><h3>Productos</h3><div className="quote-add-product"><SelectField id="quote-product" label="Producto del inventario" value={selectedProduct} options={[{ value: '', label: availableProducts.length ? 'Selecciona un producto' : 'No hay más productos disponibles' }, ...availableProducts.map((product) => ({ value: product.id, label: `${product.code} · ${product.name} · ${formatMoney(product.salePrice)}` }))]} onChange={setSelectedProduct} /><Button type="button" variant="secondary" icon={<Plus size={17} />} disabled={!selectedProduct} onClick={addProduct}>Agregar</Button></div>{rows.map((item) => <div className="quote-item" key={item.productId}><div><strong>{item.product.name}</strong><small>{item.product.code} · {item.product.brand} · {formatMoney(item.product.salePrice)} c/u</small></div><input aria-label={`Cantidad de ${item.product.name}`} type="number" min="1" step="1" value={item.quantity} onChange={(event) => setItems((current) => current.map((candidate) => candidate.productId === item.productId ? { ...candidate, quantity: event.target.value } : candidate))} /><strong>{formatMoney(item.product.salePrice * (Number(item.quantity) || 0))}</strong><IconButton icon={<Trash2 size={16} />} label={`Quitar ${item.product.name}`} variant="danger" onClick={() => setItems((current) => current.filter((candidate) => candidate.productId !== item.productId))} /></div>)}</section>
      <section className="quote-form__section"><label className="quote-notes" htmlFor="quote-notes">Observaciones<textarea id="quote-notes" value={notes} maxLength={1000} rows={3} onChange={(event) => setNotes(event.target.value)} /></label><div className="quote-summary"><span>Subtotal <strong>{formatMoney(subtotal)}</strong></span><span>IVA 15% <strong>{formatMoney(tax)}</strong></span><span>Total <strong>{formatMoney(subtotal + tax)}</strong></span></div></section>
      {error && <p className="quote-form__error">{error}</p>}
    </div>
  </Drawer>
}

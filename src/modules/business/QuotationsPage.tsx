import { CalendarCheck, Download, FileText, Mail, MessageCircle, Plus, ReceiptText, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { DataTable, type DataTableColumn } from '../../components/data-table'
import { Badge, Button, Card, IconButton, useToast } from '../../components/ui'
import { useBusiness } from '../../hooks/useBusiness'
import { getInventoryProducts } from '../../services'
import type { InventoryProduct } from '../../types/inventory'
import type { Quotation } from '../../types/quotation'
import { QuoteDrawer } from './quotations/QuoteDrawer'
import { useQuotations } from './quotations/useQuotations'

import './QuotationsPage.scss'

export function QuotationsPage() {
  const toast = useToast()
  const { currentMembership } = useBusiness()
  const businessId = currentMembership?.businessId ?? ''
  const businessName = currentMembership?.business.name ?? 'Negocio'
  const currency = currentMembership?.business.currency ?? 'USD'
  const { quotations, loading, error, reload } = useQuotations(businessId)
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [preparingId, setPreparingId] = useState<string | null>(null)
  useEffect(() => { if (businessId) void getInventoryProducts(businessId).then(setProducts).catch(() => setProducts([])) }, [businessId])
  const formatMoney = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value)
  const filtered = useMemo(() => { const value = search.trim().toLowerCase(); return value ? quotations.filter((quote) => quote.number.toLowerCase().includes(value) || quote.customerName.toLowerCase().includes(value) || quote.customerEmail?.toLowerCase().includes(value)) : quotations }, [quotations, search])
  const active = quotations.filter((quote) => quote.validUntil >= new Date()).length
  const totalQuoted = quotations.reduce((sum, quote) => sum + quote.total, 0)

  async function pdfFor(quotation: Quotation) { const { createQuotationPdf } = await import('./quotations/quotationPdf'); return createQuotationPdf(quotation, businessName, currentMembership?.business.logoUrl) }
  async function download(quotation: Quotation) {
    try { setPreparingId(quotation.id); const pdf = await pdfFor(quotation); const { downloadPdf } = await import('./quotations/quotationPdf'); downloadPdf(pdf.blob, pdf.fileName); toast.success('PDF generado', `Se descargó ${pdf.fileName}.`) }
    catch (pdfError) { toast.error('No fue posible generar el PDF', pdfError instanceof Error ? pdfError.message : undefined) }
    finally { setPreparingId(null) }
  }
  async function shareNative(quotation: Quotation): Promise<boolean> {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
    const pdf = await pdfFor(quotation)
    const file = new File([pdf.blob], pdf.fileName, { type: 'application/pdf' })
    if (!navigator.canShare({ files: [file] })) return false
    await navigator.share({ title: `${quotation.number} - ${businessName}`, text: `Cotización ${quotation.number} por ${formatMoney(quotation.total)}.`, files: [file] })
    return true
  }
  async function shareWhatsApp(quotation: Quotation) {
    const fallbackWindow = typeof navigator.share === 'function' ? null : window.open('', '_blank')
    try {
      setPreparingId(quotation.id)
      if (await shareNative(quotation)) return
      const pdf = await pdfFor(quotation); const { downloadPdf } = await import('./quotations/quotationPdf'); downloadPdf(pdf.blob, pdf.fileName)
      const phone = quotation.customerPhone?.replace(/\D/g, '') ?? ''
      const text = `Hola ${quotation.customerName}, te comparto la cotización ${quotation.number} de ${businessName} por ${formatMoney(quotation.total)}. El PDF se descargó para adjuntarlo en este chat.`
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      if (fallbackWindow) fallbackWindow.location.href = url; else window.open(url, '_blank', 'noopener,noreferrer')
      toast.success('PDF preparado', 'Adjunta en WhatsApp el PDF que acaba de descargarse.')
    } catch (shareError) { fallbackWindow?.close(); if (shareError instanceof DOMException && shareError.name === 'AbortError') return; toast.error('No fue posible compartir', shareError instanceof Error ? shareError.message : undefined) }
    finally { setPreparingId(null) }
  }
  async function shareEmail(quotation: Quotation) {
    try {
      setPreparingId(quotation.id)
      if (await shareNative(quotation)) return
      const pdf = await pdfFor(quotation); const { downloadPdf } = await import('./quotations/quotationPdf'); downloadPdf(pdf.blob, pdf.fileName)
      const subject = `Cotización ${quotation.number} - ${businessName}`
      const body = `Hola ${quotation.customerName},\n\nAdjunto la cotización ${quotation.number} por ${formatMoney(quotation.total)}. El PDF ya fue descargado para que puedas adjuntarlo a este correo.\n\nSaludos,\n${businessName}`
      window.location.href = `mailto:${quotation.customerEmail ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      toast.success('Correo preparado', 'Adjunta el PDF descargado antes de enviar el mensaje.')
    } catch (shareError) { if (shareError instanceof DOMException && shareError.name === 'AbortError') return; toast.error('No fue posible compartir', shareError instanceof Error ? shareError.message : undefined) }
    finally { setPreparingId(null) }
  }

  const columns: DataTableColumn<Quotation>[] = [
    { key: 'number', header: 'Cotización', render: (quote) => <div className="quote-number"><strong>{quote.number}</strong><small>{quote.createdAt?.toLocaleDateString('es-EC') ?? 'Sin fecha'}</small></div> },
    { key: 'customer', header: 'Cliente', render: (quote) => <div className="quote-customer"><strong>{quote.customerName}</strong><small>{quote.customerEmail || quote.customerPhone || 'Sin contacto'}</small></div> },
    { key: 'items', header: 'Productos', align: 'right', render: (quote) => quote.items.length },
    { key: 'subtotal', header: 'Subtotal', align: 'right', render: (quote) => formatMoney(quote.subtotal) },
    { key: 'tax', header: 'IVA 15%', align: 'right', render: (quote) => formatMoney(quote.tax) },
    { key: 'total', header: 'Total', align: 'right', render: (quote) => <strong>{formatMoney(quote.total)}</strong> },
    { key: 'valid', header: 'Validez', render: (quote) => <Badge variant={quote.validUntil >= new Date() ? 'success' : 'warning'}>{quote.validUntil >= new Date() ? `Hasta ${quote.validUntil.toLocaleDateString('es-EC')}` : 'Vencida'}</Badge> },
    { key: 'actions', header: '', align: 'right', render: (quote) => <div className="quotation-actions"><IconButton icon={<Download size={16} />} label={`Descargar ${quote.number}`} disabled={preparingId === quote.id} onClick={() => void download(quote)} /><IconButton icon={<Mail size={16} />} label={`Enviar ${quote.number} por correo`} disabled={preparingId === quote.id} onClick={() => void shareEmail(quote)} /><IconButton icon={<MessageCircle size={16} />} label={`Enviar ${quote.number} por WhatsApp`} disabled={preparingId === quote.id} onClick={() => void shareWhatsApp(quote)} /></div> },
  ]
  return <div className="quotations-page"><header className="quotations-page__header"><div><span>Operación</span><h2>Cotizaciones</h2><p>Prepara propuestas con precios de venta e IVA del 15%.</p></div><Button icon={<Plus size={18} />} onClick={() => setDrawerOpen(true)}>Nueva cotización</Button></header><section className="quotation-stats"><Card><ReceiptText size={22} /><div><small>Cotizaciones</small><strong>{quotations.length}</strong></div></Card><Card><CalendarCheck size={22} /><div><small>Vigentes</small><strong>{active}</strong></div></Card><Card><FileText size={22} /><div><small>Valor cotizado</small><strong>{formatMoney(totalQuoted)}</strong></div></Card></section><section className="quotations-panel"><div className="quotations-toolbar"><div><Search size={18} /><input type="search" value={search} placeholder="Buscar por número, cliente o correo..." onChange={(event) => setSearch(event.target.value)} /></div><span>Los precios quedan guardados como fueron cotizados.</span></div>{error ? <div className="quotations-error"><p>{error}</p><Button variant="secondary" onClick={() => void reload()}>Reintentar</Button></div> : <DataTable columns={columns} data={filtered} getRowKey={(quote) => quote.id} loading={loading} emptyTitle="No hay cotizaciones" emptyDescription="Crea la primera cotización utilizando los productos del inventario." />}</section><QuoteDrawer open={drawerOpen} businessId={businessId} currency={currency} products={products} onClose={() => setDrawerOpen(false)} onSaved={() => void reload()} /></div>
}

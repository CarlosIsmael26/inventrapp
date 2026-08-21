import { Download, FileText, Gift, Plus, ReceiptText, Search, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-table'
import { Button, Card, IconButton, useToast } from '../../components/ui'
import { useBusiness } from '../../hooks/useBusiness'
import { getInventoryProducts, getQuotations } from '../../services'
import type { InventoryProduct } from '../../types/inventory'
import type { Quotation } from '../../types/quotation'
import type { Sale } from '../../types/sale'
import { SaleDrawer } from './sales/SaleDrawer'
import { useSales } from './sales/useSales'
import './QuotationsPage.scss'

export function SalesPage() {
  const toast = useToast(); const { currentMembership } = useBusiness(); const businessId = currentMembership?.businessId ?? ''; const businessName = currentMembership?.business.name ?? 'Negocio'; const currency = currentMembership?.business.currency ?? 'USD'; const [params, setParams] = useSearchParams(); const { sales, loading, error, reload } = useSales(businessId); const [products, setProducts] = useState<InventoryProduct[]>([]); const [quotations, setQuotations] = useState<Quotation[]>([]); const [drawerOpen, setDrawerOpen] = useState(false); const [quotation, setQuotation] = useState<Quotation | null>(null); const [search, setSearch] = useState(''); const [preparingId, setPreparingId] = useState<string | null>(null)
  useEffect(() => { if (!businessId) return; void Promise.all([getInventoryProducts(businessId), getQuotations(businessId)]).then(([inventory, quotes]) => { setProducts(inventory); setQuotations(quotes) }).catch(() => { setProducts([]); setQuotations([]) }) }, [businessId])
  useEffect(() => { const quotationId = params.get('quotationId'); if (!quotationId || !quotations.length) return; const selected = quotations.find((item) => item.id === quotationId && item.status !== 'converted'); if (selected) { setQuotation(selected); setDrawerOpen(true) } setParams({}, { replace: true }) }, [params, quotations, setParams])
  const formatMoney = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value); const filtered = useMemo(() => { const value = search.trim().toLowerCase(); return value ? sales.filter((sale) => sale.number.toLowerCase().includes(value) || sale.customerName.toLowerCase().includes(value) || sale.sourceQuotationNumber?.toLowerCase().includes(value)) : sales }, [sales, search]); const total = sales.reduce((sum, sale) => sum + sale.total, 0)
  async function download(sale: Sale) { try { setPreparingId(sale.id); const { createSalePdf, downloadSalePdf } = await import('./sales/salePdf'); const pdf = await createSalePdf(sale, businessName, currentMembership?.business.logoUrl); downloadSalePdf(pdf.blob, pdf.fileName); toast.success('PDF generado', `Se descargó ${pdf.fileName}.`) } catch (pdfError) { toast.error('No fue posible generar el PDF', pdfError instanceof Error ? pdfError.message : undefined) } finally { setPreparingId(null) } }
  async function downloadThankYou(sale: Sale) { try { setPreparingId(sale.id); const [{ createThankYouPdf }, { downloadSalePdf }] = await Promise.all([import('./sales/thankYouPdf'), import('./sales/salePdf')]); const pdf = await createThankYouPdf(sale, businessName, currentMembership?.business.logoUrl); downloadSalePdf(pdf.blob, pdf.fileName); toast.success('Agradecimiento generado', `Se descargó ${pdf.fileName}.`) } catch (pdfError) { toast.error('No fue posible generar el agradecimiento', pdfError instanceof Error ? pdfError.message : undefined) } finally { setPreparingId(null) } }
  async function saved(sale: Sale) {
    await reload()
    setProducts(await getInventoryProducts(businessId))
    try {
      const { createSalePdf, downloadSalePdf } = await import('./sales/salePdf')
      const invoice = await createSalePdf(sale, businessName, currentMembership?.business.logoUrl)
      downloadSalePdf(invoice.blob, invoice.fileName)
      if (sale.sourceQuotationId) {
        const { createThankYouPdf } = await import('./sales/thankYouPdf')
        const thankYou = await createThankYouPdf(sale, businessName, currentMembership?.business.logoUrl)
        downloadSalePdf(thankYou.blob, thankYou.fileName)
        toast.success('Venta completada', 'Se descargaron la factura y el documento de agradecimiento.')
      }
    } catch { toast.warning('Venta guardada', 'La venta se registró, pero uno de los PDF no pudo descargarse automáticamente.') }
  }
  const columns: DataTableColumn<Sale>[] = [{ key: 'number', header: 'Factura', render: (sale) => <div className="quote-number"><strong>{sale.number}</strong><small>{sale.createdAt?.toLocaleDateString('es-EC') ?? 'Sin fecha'}</small></div> }, { key: 'customer', header: 'Cliente', render: (sale) => <div className="quote-customer"><strong>{sale.customerName}</strong><small>{sale.sourceQuotationNumber ? `Desde ${sale.sourceQuotationNumber}` : sale.customerEmail || 'Venta directa'}</small></div> }, { key: 'items', header: 'Productos', align: 'right', render: (sale) => sale.items.length }, { key: 'subtotal', header: 'Subtotal', align: 'right', render: (sale) => formatMoney(sale.subtotal) }, { key: 'tax', header: 'IVA 15%', align: 'right', render: (sale) => formatMoney(sale.tax) }, { key: 'total', header: 'Total', align: 'right', render: (sale) => <strong>{formatMoney(sale.total)}</strong> }, { key: 'actions', header: '', align: 'right', render: (sale) => <div className="quotation-actions"><IconButton icon={<Download size={16} />} label={`Descargar factura ${sale.number}`} disabled={preparingId === sale.id} onClick={() => void download(sale)} /><IconButton icon={<Gift size={16} />} label={`Descargar agradecimiento de ${sale.number}`} disabled={preparingId === sale.id} onClick={() => void downloadThankYou(sale)} /></div> }]
  return <div className="quotations-page"><header className="quotations-page__header"><div><span>Operación</span><h2>Ventas y POS</h2><p>Registra ventas, descuenta existencias y genera facturas internas en PDF.</p></div><Button icon={<Plus size={18} />} onClick={() => { setQuotation(null); setDrawerOpen(true) }}>Nueva venta</Button></header><section className="quotation-stats"><Card><ReceiptText size={22} /><div><small>Ventas</small><strong>{sales.length}</strong></div></Card><Card><ShoppingCart size={22} /><div><small>Unidades vendidas</small><strong>{sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}</strong></div></Card><Card><FileText size={22} /><div><small>Total vendido</small><strong>{formatMoney(total)}</strong></div></Card></section><section className="quotations-panel"><div className="quotations-toolbar"><div><Search size={18} /><input type="search" value={search} placeholder="Buscar por factura, cotización o cliente..." onChange={(event) => setSearch(event.target.value)} /></div><span>Las ventas confirmadas descuentan inventario y quedan cerradas.</span></div>{error ? <div className="quotations-error"><p>{error}</p><Button variant="secondary" onClick={() => void reload()}>Reintentar</Button></div> : <DataTable columns={columns} data={filtered} getRowKey={(sale) => sale.id} loading={loading} emptyTitle="No hay ventas" emptyDescription="Registra una venta directa o convierte una cotización aprobada." />}</section><SaleDrawer open={drawerOpen} businessId={businessId} currency={currency} products={products} quotation={quotation} onClose={() => setDrawerOpen(false)} onSaved={(sale) => void saved(sale)} /></div>
}

import { AlertTriangle, Boxes, FileSpreadsheet, PackageCheck, Search, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'

import { DataTable, type DataTableColumn } from '../../components/data-table'
import { Badge, Button, Card, Loader, useToast } from '../../components/ui'
import { useBusiness } from '../../hooks/useBusiness'
import { getInventoryProducts, importInventoryProducts } from '../../services'
import type { InventoryImportPreview, InventoryProduct } from '../../types/inventory'

import './InventoryPage.scss'

export function InventoryPage() {
  const toast = useToast(); const { currentMembership } = useBusiness(); const fileInput = useRef<HTMLInputElement>(null)
  const [products, setProducts] = useState<InventoryProduct[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [search, setSearch] = useState(''); const [preview, setPreview] = useState<InventoryImportPreview | null>(null); const [reading, setReading] = useState(false); const [importing, setImporting] = useState(false)
  const businessId = currentMembership?.businessId ?? ''; const canImport = currentMembership ? ['owner', 'admin', 'warehouse'].includes(currentMembership.role) : false
  const load = useCallback(async () => { if (!businessId) return; try { setLoading(true); setError(null); setProducts(await getInventoryProducts(businessId)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar el inventario.') } finally { setLoading(false) } }, [businessId])
  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => { const value = search.trim().toLowerCase(); return value ? products.filter((product) => product.code.toLowerCase().includes(value) || product.name.toLowerCase().includes(value) || product.brand.toLowerCase().includes(value)) : products }, [products, search])
  const totalUnits = products.reduce((total, product) => total + product.quantity, 0); const totalValue = products.reduce((total, product) => total + product.quantity * product.unitValue, 0)

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    try {
      setReading(true); const { parseInventoryExcel } = await import('./inventory/parseInventoryExcel'); const result = await parseInventoryExcel(file)
      const savedCodes = new Set(products.map((product) => product.code.trim().toLocaleLowerCase('es')))
      const existingCodes = result.products.filter((product) => savedCodes.has(product.code.trim().toLocaleLowerCase('es'))).map((product) => product.code)
      setPreview({ ...result, existingCodes })
    } catch (readError) { toast.error('No fue posible leer el Excel', readError instanceof Error ? readError.message : 'Verifica que sea un archivo .xlsx válido.') }
    finally { setReading(false) }
  }
  async function confirmImport() {
    if (!preview || preview.errors.length || !preview.products.length) return
    try { setImporting(true); const message = await importInventoryProducts(businessId, preview.products); toast.success('Inventario importado', message); setPreview(null); await load() }
    catch (requestError) { toast.error('No fue posible importar', requestError instanceof Error ? requestError.message : undefined) }
    finally { setImporting(false) }
  }
  const columns: DataTableColumn<InventoryProduct>[] = [
    { key: 'code', header: 'Código', render: (product) => <code>{product.code}</code> },
    { key: 'name', header: 'Producto', render: (product) => <div className="inventory-product"><strong>{product.name}</strong><small>{product.brand}</small></div> },
    { key: 'quantity', header: 'Cantidad', align: 'right', render: (product) => <Badge variant={product.quantity <= 5 ? 'warning' : 'success'}>{product.quantity}</Badge> },
    { key: 'unitValue', header: 'Valor unitario', align: 'right', render: (product) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: currentMembership?.business.currency ?? 'USD' }).format(product.unitValue) },
    { key: 'total', header: 'Valor total', align: 'right', render: (product) => <strong>{new Intl.NumberFormat('es-EC', { style: 'currency', currency: currentMembership?.business.currency ?? 'USD' }).format(product.quantity * product.unitValue)}</strong> },
  ]

  return <div className="inventory-page"><header className="inventory-page__header"><div><span>Operación</span><h2>Inventario</h2><p>Controla productos, existencias y valor del inventario.</p></div>{canImport && <><input ref={fileInput} className="inventory-file-input" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void chooseFile(event)} /><Button icon={<Upload size={18} />} loading={reading} onClick={() => fileInput.current?.click()}>Cargar Excel</Button></>}</header><section className="inventory-stats"><Card><Boxes size={22} /><div><small>Productos</small><strong>{products.length}</strong></div></Card><Card><PackageCheck size={22} /><div><small>Unidades</small><strong>{totalUnits}</strong></div></Card><Card><FileSpreadsheet size={22} /><div><small>Valor estimado</small><strong>{new Intl.NumberFormat('es-EC', { style: 'currency', currency: currentMembership?.business.currency ?? 'USD' }).format(totalValue)}</strong></div></Card></section>{preview && <section className={`inventory-preview ${preview.errors.length ? 'inventory-preview--error' : ''}`}><div className="inventory-preview__header"><div><FileSpreadsheet size={23} /><div><h3>{preview.fileName}</h3><p>{preview.products.length} filas válidas: {preview.products.length - preview.existingCodes.length} nuevas y {preview.existingCodes.length} para sumar existencias.</p></div></div><button aria-label="Cerrar vista previa" onClick={() => setPreview(null)}>×</button></div>{preview.errors.length ? <div className="inventory-import-errors"><strong><AlertTriangle size={18} /> Corrige el archivo antes de importar</strong><ul>{preview.errors.slice(0, 12).map((item, index) => <li key={`${item.row}-${index}`}>{item.row ? `Fila ${item.row}: ` : ''}{item.message}</li>)}</ul>{preview.errors.length > 12 && <p>Hay {preview.errors.length - 12} errores adicionales.</p>}</div> : <div className="inventory-preview__ready"><p>{preview.existingCodes.length ? `Se sumará la cantidad a los códigos existentes: ${preview.existingCodes.slice(0, 8).join(', ')}${preview.existingCodes.length > 8 ? '…' : ''}.` : 'Todos los códigos son nuevos.'} La validación se repetirá en el servidor.</p><Button loading={importing} onClick={() => void confirmImport()}>Procesar {preview.products.length} productos</Button></div>}</section>}<section className="inventory-panel"><div className="inventory-toolbar"><div><Search size={18} /><input type="search" value={search} placeholder="Buscar por código, producto o marca..." onChange={(event) => setSearch(event.target.value)} /></div><span>Excel: código (texto), nombre, marca, cantidad y valor · máximo 200 filas</span></div>{error ? <div className="inventory-error"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>Reintentar</Button></div> : loading ? <div className="inventory-loading"><Loader label="Cargando inventario..." /></div> : <DataTable columns={columns} data={filtered} getRowKey={(product) => product.id} emptyTitle="Inventario vacío" emptyDescription="Carga un archivo Excel para agregar tus primeros productos." />}</section></div>
}

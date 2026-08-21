import writeExcelFile, { type Cell, type Row } from 'write-excel-file/browser'

import type { InventoryProduct } from '../../../types/inventory'
import type { Quotation } from '../../../types/quotation'

const PURPLE = '#6842E8'
const DARK = '#201A35'
const MUTED = '#746D85'
const BORDER = '#E4E0EC'

export type ProductShortage = { code: string; name: string; currentStock: number; purchaseQuantity: number; requestedByQuotation: Record<string, number> }

const titleCell = (value: string, columns: number): Cell => ({ value, type: String, columnSpan: columns, fontFamily: 'Arial', fontSize: 18, fontWeight: 'bold', textColor: DARK, height: 32 })
const subtitleCell = (value: string, columns: number): Cell => ({ value, type: String, columnSpan: columns, fontFamily: 'Arial', fontSize: 10, textColor: MUTED, height: 22 })
const headerCell = (value: string): Cell => ({ value, type: String, fontFamily: 'Arial', fontSize: 10, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: PURPLE, alignVertical: 'center', height: 25 })
const textCell = (value: string): Cell => ({ value, type: String, fontFamily: 'Arial', fontSize: 10, bottomBorderColor: BORDER, bottomBorderStyle: 'thin' })
const numberCell = (value: number): Cell => ({ value, type: Number, format: '#,##0', fontFamily: 'Arial', fontSize: 10, align: 'right', bottomBorderColor: BORDER, bottomBorderStyle: 'thin' })

function slug(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'negocio' }

export function calculateQuotationShortages(quotations: Quotation[], products: InventoryProduct[]): ProductShortage[] {
  const inventoryById = new Map(products.map((product) => [product.id, product]))
  const requiredByProduct = new Map<string, { code: string; name: string; quantity: number; requestedByQuotation: Record<string, number> }>()
  for (const quotation of quotations) {
    for (const item of quotation.items) {
      const current = requiredByProduct.get(item.productId)
      requiredByProduct.set(item.productId, {
        code: item.code,
        name: item.name,
        quantity: (current?.quantity ?? 0) + item.quantity,
        requestedByQuotation: {
          ...current?.requestedByQuotation,
          [quotation.id]: (current?.requestedByQuotation[quotation.id] ?? 0) + item.quantity,
        },
      })
    }
  }
  return Array.from(requiredByProduct.entries()).map(([productId, required]) => {
    const currentStock = Math.max(0, inventoryById.get(productId)?.quantity ?? 0)
    return { code: required.code, name: required.name, currentStock, purchaseQuantity: Math.max(required.quantity - currentStock, 0), requestedByQuotation: required.requestedByQuotation }
  }).filter((product) => product.purchaseQuantity > 0).sort((first, second) => first.name.localeCompare(second.name, 'es'))
}

export async function exportQuotationShortages(quotations: Quotation[], products: InventoryProduct[], businessName: string): Promise<number> {
  const shortages = calculateQuotationShortages(quotations, products)
  if (!shortages.length) return 0
  const columnCount = quotations.length + 4
  const emptyTitleCells = Array(columnCount - 1).fill(null)
  const rows: Row[] = [
    [titleCell(`Productos faltantes — ${businessName}`, columnCount), ...emptyTitleCells],
    [subtitleCell(`Cotizaciones: ${quotations.map((quotation) => quotation.number).join(', ')}`, columnCount), ...emptyTitleCells],
    [subtitleCell(`Generado el ${new Date().toLocaleString('es-EC')}`, columnCount), ...emptyTitleCells],
    Array(columnCount).fill(null),
    ['Código', 'Producto', ...quotations.map((quotation) => quotation.number), 'Stock actual', 'Cantidad por comprar'].map(headerCell),
    ...shortages.map((product): Row => [textCell(product.code), textCell(product.name), ...quotations.map((quotation) => numberCell(product.requestedByQuotation[quotation.id] ?? 0)), numberCell(product.currentStock), numberCell(product.purchaseQuantity)]),
  ]
  const columns = [{ width: 18 }, { width: 38 }, ...quotations.map(() => ({ width: 18 })), { width: 16 }, { width: 22 }]
  await writeExcelFile([{ data: rows, sheet: 'Productos faltantes', columns, stickyRowsCount: 5, showGridLines: false, orientation: 'landscape' }]).toFile(`faltantes-cotizaciones-${slug(businessName)}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  return shortages.length
}

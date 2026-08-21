import ExcelJS from 'exceljs'

import type { InventoryProduct } from '../../../types/inventory'
import type { Quotation } from '../../../types/quotation'
import { addBusinessHeader, downloadWorkbook, styleDataRows, styleHeaderRow } from '../reports/excelBranding'

export type ProductShortage = { code: string; name: string; currentStock: number; purchaseQuantity: number; requestedByQuotation: Record<string, number> }

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

export async function exportQuotationShortages(quotations: Quotation[], products: InventoryProduct[], businessName: string, logoUrl?: string | null): Promise<number> {
  const shortages = calculateQuotationShortages(quotations, products)
  if (!shortages.length) return 0
  const columnCount = quotations.length + 4
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Inventra'
  const sheet = workbook.addWorksheet('Productos faltantes', { views: [{ state: 'frozen', ySplit: 5, showGridLines: false }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 } })
  addBusinessHeader(workbook, sheet, { title: `Productos faltantes — ${businessName}`, subtitle: `Cotizaciones: ${quotations.map((quotation) => quotation.number).join(', ')}`, columnCount, logoUrl })
  sheet.addRow([])
  sheet.addRow(['Código', 'Producto', ...quotations.map((quotation) => quotation.number), 'Stock actual', 'Cantidad por comprar'])
  for (const product of shortages) sheet.addRow([product.code, product.name, ...quotations.map((quotation) => product.requestedByQuotation[quotation.id] ?? 0), product.currentStock, product.purchaseQuantity])
  sheet.columns = [{ width: 18 }, { width: 38 }, ...quotations.map(() => ({ width: 18 })), { width: 16 }, { width: 22 }]
  for (let column = 3; column <= columnCount; column += 1) sheet.getColumn(column).numFmt = '#,##0'
  styleHeaderRow(sheet, 5)
  styleDataRows(sheet, 6)
  await downloadWorkbook(workbook, `faltantes-cotizaciones-${slug(businessName)}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  return shortages.length
}

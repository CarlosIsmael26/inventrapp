import ExcelJS, { type Worksheet } from 'exceljs'

import type { InventoryAudit } from '../../../types/inventory'
import { addBusinessHeader, downloadWorkbook, styleDataRows, styleHeaderRow } from '../reports/excelBranding'

const LIGHT_PURPLE = 'F0EBFF'

function slug(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'negocio' }
function formatSummaryRow(sheet: Worksheet, rowNumber: number): void { sheet.getRow(rowNumber).eachCell((cell) => { cell.font = { name: 'Arial', size: 10, bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${LIGHT_PURPLE}` } } }) }

export async function exportInventoryAudit(audit: InventoryAudit, logoUrl?: string | null): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Inventra'
  const inventory = workbook.addWorksheet('Inventario actual', { views: [{ state: 'frozen', ySplit: 7, showGridLines: false }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 } })
  const movements = workbook.addWorksheet('Movimientos', { views: [{ state: 'frozen', ySplit: 5, showGridLines: false }], pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 } })
  const totalUnits = audit.products.reduce((sum, product) => sum + product.quantity, 0)
  const purchaseValue = audit.products.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0)
  const saleValue = audit.products.reduce((sum, product) => sum + product.quantity * product.salePrice, 0)
  const currencyFormat = '"$"#,##0.00'

  addBusinessHeader(workbook, inventory, { title: `Auditoría de inventario — ${audit.business.name}`, subtitle: `Moneda: ${audit.business.currency}`, columnCount: 10, logoUrl })
  inventory.addRow([])
  inventory.addRow(['Productos', audit.products.length, 'Unidades', totalUnits, 'Inversión', purchaseValue, 'Venta potencial', saleValue, '', ''])
  inventory.addRow([])
  inventory.addRow(['Código', 'Producto', 'Marca', 'Cantidad', 'Costo compra', 'Ganancia %', 'Precio venta', 'Costo total', 'Venta total', 'Última actualización'])
  for (const product of audit.products) inventory.addRow([product.code, product.name, product.brand, product.quantity, product.purchasePrice, product.profitPercentage / 100, product.salePrice, product.quantity * product.purchasePrice, product.quantity * product.salePrice, product.updatedAt])
  inventory.columns = [{ width: 16 }, { width: 28 }, { width: 20 }, { width: 12 }, { width: 16 }, { width: 13 }, { width: 16 }, { width: 16 }, { width: 17 }, { width: 22 }]
  inventory.getColumn(4).numFmt = '#,##0'
  inventory.getColumn(5).numFmt = currencyFormat
  inventory.getColumn(6).numFmt = '0.00%'
  inventory.getColumn(7).numFmt = currencyFormat
  inventory.getColumn(8).numFmt = currencyFormat
  inventory.getColumn(9).numFmt = currencyFormat
  inventory.getColumn(10).numFmt = 'dd/mm/yyyy hh:mm'
  formatSummaryRow(inventory, 5)
  styleHeaderRow(inventory, 7)
  styleDataRows(inventory, 8)

  const movementLabels: Record<string, string> = { initial_stock: 'Creación manual', manual_adjustment: 'Ajuste manual', product_deleted: 'Producto eliminado', excel_import: 'Carga por Excel', sale: 'Venta' }
  addBusinessHeader(workbook, movements, { title: `Movimientos de inventario — ${audit.business.name}`, subtitle: `Historial disponible: ${audit.movements.length} movimientos${audit.movementLimitReached ? ' (límite alcanzado)' : ''}`, columnCount: 11, logoUrl })
  movements.addRow([])
  movements.addRow(['Fecha', 'Tipo', 'Código', 'Producto', 'Cantidad anterior', 'Cantidad nueva', 'Diferencia', 'Costo', 'Precio venta', 'Responsable', 'Correo'])
  for (const movement of audit.movements) movements.addRow([movement.createdAt, movementLabels[movement.type] ?? movement.type, movement.code, movement.productName, movement.previousQuantity, movement.newQuantity, movement.difference, movement.purchasePrice, movement.salePrice, movement.actorName, movement.actorEmail])
  if (!audit.movements.length) movements.addRow(['Todavía no existen movimientos registrados.'])
  movements.columns = [{ width: 22 }, { width: 20 }, { width: 16 }, { width: 28 }, { width: 18 }, { width: 17 }, { width: 13 }, { width: 15 }, { width: 15 }, { width: 24 }, { width: 30 }]
  movements.getColumn(1).numFmt = 'dd/mm/yyyy hh:mm'
  for (let column = 5; column <= 7; column += 1) movements.getColumn(column).numFmt = '#,##0'
  movements.getColumn(8).numFmt = currencyFormat
  movements.getColumn(9).numFmt = currencyFormat
  styleHeaderRow(movements, 5)
  styleDataRows(movements, 6)
  await downloadWorkbook(workbook, `auditoria-inventario-${slug(audit.business.name)}-${audit.generatedAt.toISOString().slice(0, 10)}.xlsx`)
}

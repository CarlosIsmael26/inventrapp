import writeExcelFile, { type Cell, type Row } from 'write-excel-file/browser'

import type { InventoryAudit } from '../../../types/inventory'

const PURPLE = '#6842E8'
const LIGHT_PURPLE = '#F0EBFF'
const DARK = '#201A35'
const MUTED = '#746D85'
const BORDER = '#E4E0EC'

const titleCell = (value: string, columns: number): Cell => ({ value, type: String, columnSpan: columns, fontFamily: 'Arial', fontSize: 18, fontWeight: 'bold', textColor: DARK, height: 32 })
const subtitleCell = (value: string, columns: number): Cell => ({ value, type: String, columnSpan: columns, fontFamily: 'Arial', fontSize: 10, textColor: MUTED, height: 22 })
const headerCell = (value: string): Cell => ({ value, type: String, fontFamily: 'Arial', fontSize: 10, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: PURPLE, alignVertical: 'center', height: 25 })
const textCell = (value: string): Cell => ({ value, type: String, fontFamily: 'Arial', fontSize: 10, bottomBorderColor: BORDER, bottomBorderStyle: 'thin' })
const numberCell = (value: number, format = '#,##0'): Cell => ({ value, type: Number, format, fontFamily: 'Arial', fontSize: 10, align: 'right', bottomBorderColor: BORDER, bottomBorderStyle: 'thin' })
const dateCell = (value: Date | null): Cell => value ? ({ value, type: Date, format: 'dd/mm/yyyy hh:mm', fontFamily: 'Arial', fontSize: 10, bottomBorderColor: BORDER, bottomBorderStyle: 'thin' }) : textCell('Sin fecha')

function blankRow(columns: number): Row { return Array.from({ length: columns }, () => null) }
function slug(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'negocio' }

export async function exportInventoryAudit(audit: InventoryAudit): Promise<void> {
  const inventoryColumns = 10
  const movementColumns = 11
  const totalUnits = audit.products.reduce((sum, product) => sum + product.quantity, 0)
  const purchaseValue = audit.products.reduce((sum, product) => sum + product.quantity * product.purchasePrice, 0)
  const saleValue = audit.products.reduce((sum, product) => sum + product.quantity * product.salePrice, 0)
  const currencyFormat = '"$"#,##0.00'
  const inventoryRows: Row[] = [
    [titleCell(`Auditoría de inventario — ${audit.business.name}`, inventoryColumns), ...Array(inventoryColumns - 1).fill(null)],
    [subtitleCell(`Generado el ${audit.generatedAt.toLocaleString('es-EC')} · Moneda: ${audit.business.currency}`, inventoryColumns), ...Array(inventoryColumns - 1).fill(null)],
    blankRow(inventoryColumns),
    [{ value: 'Productos', type: String, fontWeight: 'bold', backgroundColor: LIGHT_PURPLE }, numberCell(audit.products.length), { value: 'Unidades', type: String, fontWeight: 'bold', backgroundColor: LIGHT_PURPLE }, numberCell(totalUnits), { value: 'Inversión', type: String, fontWeight: 'bold', backgroundColor: LIGHT_PURPLE }, numberCell(purchaseValue, currencyFormat), { value: 'Venta potencial', type: String, fontWeight: 'bold', backgroundColor: LIGHT_PURPLE }, numberCell(saleValue, currencyFormat), null, null],
    blankRow(inventoryColumns),
    ['Código', 'Producto', 'Marca', 'Cantidad', 'Costo compra', 'Ganancia %', 'Precio venta', 'Costo total', 'Venta total', 'Última actualización'].map(headerCell),
    ...audit.products.map((product): Row => [textCell(product.code), textCell(product.name), textCell(product.brand), numberCell(product.quantity), numberCell(product.purchasePrice, currencyFormat), numberCell(product.profitPercentage, '0.00"%"'), numberCell(product.salePrice, currencyFormat), numberCell(product.quantity * product.purchasePrice, currencyFormat), numberCell(product.quantity * product.salePrice, currencyFormat), dateCell(product.updatedAt)]),
  ]
  const movementLabels: Record<string, string> = { initial_stock: 'Creación manual', manual_adjustment: 'Ajuste manual', product_deleted: 'Producto eliminado', excel_import: 'Carga por Excel', sale: 'Venta' }
  const movementRows: Row[] = [
    [titleCell(`Movimientos de inventario — ${audit.business.name}`, movementColumns), ...Array(movementColumns - 1).fill(null)],
    [subtitleCell(`Historial disponible: ${audit.movements.length} movimientos${audit.movementLimitReached ? ' (límite alcanzado)' : ''}`, movementColumns), ...Array(movementColumns - 1).fill(null)],
    blankRow(movementColumns),
    ['Fecha', 'Tipo', 'Código', 'Producto', 'Cantidad anterior', 'Cantidad nueva', 'Diferencia', 'Costo', 'Precio venta', 'Responsable', 'Correo'].map(headerCell),
    ...audit.movements.map((movement): Row => [dateCell(movement.createdAt), textCell(movementLabels[movement.type] ?? movement.type), textCell(movement.code), textCell(movement.productName), numberCell(movement.previousQuantity), numberCell(movement.newQuantity), numberCell(movement.difference, '+#,##0;-#,##0;0'), numberCell(movement.purchasePrice, currencyFormat), numberCell(movement.salePrice, currencyFormat), textCell(movement.actorName), textCell(movement.actorEmail)]),
  ]
  if (!audit.movements.length) movementRows.push([subtitleCell('Todavía no existen movimientos registrados. La hoja de inventario contiene la fotografía actual.', movementColumns), ...Array(movementColumns - 1).fill(null)])
  await writeExcelFile([
    { data: inventoryRows, sheet: 'Inventario actual', columns: [{ width: 16 }, { width: 28 }, { width: 20 }, { width: 12 }, { width: 16 }, { width: 13 }, { width: 16 }, { width: 16 }, { width: 17 }, { width: 22 }], stickyRowsCount: 6, showGridLines: false, orientation: 'landscape' },
    { data: movementRows, sheet: 'Movimientos', columns: [{ width: 22 }, { width: 20 }, { width: 16 }, { width: 28 }, { width: 18 }, { width: 17 }, { width: 13 }, { width: 15 }, { width: 15 }, { width: 24 }, { width: 30 }], stickyRowsCount: 4, showGridLines: false, orientation: 'landscape' },
  ]).toFile(`auditoria-inventario-${slug(audit.business.name)}-${audit.generatedAt.toISOString().slice(0, 10)}.xlsx`)
}

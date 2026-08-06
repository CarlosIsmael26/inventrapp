import { readSheet, type CellValue } from 'read-excel-file/browser'
import type { InventoryImportError, InventoryImportPreview, InventoryProductInput } from '../../../types/inventory'

const requiredHeaders = ['codigo', 'nombre', 'marca', 'cantidad', 'valor'] as const
type ExcelCell = CellValue<number> | null | undefined
function normalizeHeader(value: ExcelCell): string { return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() }
function textValue(value: ExcelCell): string { return value === null || value === undefined ? '' : String(value).trim() }
function numberValue(value: ExcelCell): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') { const normalized = value.trim().replace(/\s/g, '').replace(',', '.'); const parsed = Number(normalized); return Number.isFinite(parsed) ? parsed : null }
  return null
}

export async function parseInventoryExcel(file: File): Promise<InventoryImportPreview> {
  const rows = await readSheet(file)
  if (!rows.length) return { fileName: file.name, products: [], errors: [{ row: 1, message: 'El archivo está vacío.' }], duplicateCodes: [], existingCodes: [] }
  const headers = rows[0].map(normalizeHeader)
  const indexes = Object.fromEntries(requiredHeaders.map((header) => [header, headers.indexOf(header)])) as Record<typeof requiredHeaders[number], number>
  const missing = requiredHeaders.filter((header) => indexes[header] < 0)
  if (missing.length) return { fileName: file.name, products: [], errors: [{ row: 1, message: `Faltan columnas obligatorias: ${missing.join(', ')}.` }], duplicateCodes: [], existingCodes: [] }
  const products: InventoryProductInput[] = []; const errors: InventoryImportError[] = []; const codeRows = new Map<string, number[]>();
  rows.slice(1).forEach((row, position) => {
    const rowNumber = position + 2
    if (row.every((cell) => cell === null || String(cell).trim() === '')) return
    const code = textValue(row[indexes.codigo]); const name = textValue(row[indexes.nombre]); const brand = textValue(row[indexes.marca]); const quantity = numberValue(row[indexes.cantidad]); const unitValue = numberValue(row[indexes.valor])
    if (!code) errors.push({ row: rowNumber, message: 'El código es obligatorio.' })
    if (!name) errors.push({ row: rowNumber, code, message: 'El nombre es obligatorio.' })
    if (!brand) errors.push({ row: rowNumber, code, message: 'La marca es obligatoria.' })
    if (quantity === null || quantity < 0 || !Number.isInteger(quantity)) errors.push({ row: rowNumber, code, message: 'La cantidad debe ser un número entero mayor o igual a cero.' })
    if (unitValue === null || unitValue < 0) errors.push({ row: rowNumber, code, message: 'El valor debe ser un número mayor o igual a cero.' })
    const normalizedCode = code.toLocaleLowerCase('es'); if (code) codeRows.set(normalizedCode, [...(codeRows.get(normalizedCode) ?? []), rowNumber])
    if (code && name && brand && quantity !== null && quantity >= 0 && Number.isInteger(quantity) && unitValue !== null && unitValue >= 0) products.push({ code, name, brand, quantity, unitValue })
  })
  const duplicateCodes = [...codeRows.entries()].filter(([, positions]) => positions.length > 1).map(([code, positions]) => `${code} (filas ${positions.join(', ')})`)
  duplicateCodes.forEach((duplicate) => errors.push({ row: 0, code: duplicate, message: `Código duplicado: ${duplicate}.` }))
  if (!products.length && !errors.length) errors.push({ row: 2, message: 'El archivo no contiene productos.' })
  return { fileName: file.name, products, errors, duplicateCodes, existingCodes: [] }
}

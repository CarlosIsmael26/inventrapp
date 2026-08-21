import ExcelJS, { type Worksheet } from 'exceljs'

const PURPLE = '6842E8'
const DARK = '201A35'
const MUTED = '746D85'
const BORDER = 'E4E0EC'

export function addBusinessHeader(workbook: ExcelJS.Workbook, sheet: Worksheet, options: { title: string; subtitle: string; columnCount: number; logoUrl?: string | null }): void {
  const { title, subtitle, columnCount, logoUrl } = options
  const titleStartColumn = logoUrl ? 3 : 1
  sheet.mergeCells(1, titleStartColumn, 1, columnCount)
  sheet.mergeCells(2, titleStartColumn, 2, columnCount)
  sheet.mergeCells(3, titleStartColumn, 3, columnCount)
  sheet.getCell(1, titleStartColumn).value = title
  sheet.getCell(1, titleStartColumn).font = { name: 'Arial', size: 18, bold: true, color: { argb: `FF${DARK}` } }
  sheet.getCell(2, titleStartColumn).value = subtitle
  sheet.getCell(2, titleStartColumn).font = { name: 'Arial', size: 10, color: { argb: `FF${MUTED}` } }
  sheet.getCell(3, titleStartColumn).value = `Generado el ${new Date().toLocaleString('es-EC')}`
  sheet.getCell(3, titleStartColumn).font = { name: 'Arial', size: 10, color: { argb: `FF${MUTED}` } }
  sheet.getRow(1).height = 25
  sheet.getRow(2).height = 18
  sheet.getRow(3).height = 18
  const match = logoUrl?.match(/^data:image\/(png|jpe?g);base64,/i)
  if (logoUrl && match) {
    const imageId = workbook.addImage({ base64: logoUrl, extension: match[1].toLowerCase() === 'png' ? 'png' : 'jpeg' })
    sheet.addImage(imageId, { tl: { col: 0.12, row: 0.12 }, ext: { width: 58, height: 58 } })
    sheet.getColumn(1).width = Math.max(sheet.getColumn(1).width ?? 0, 12)
  }
}

export function styleHeaderRow(sheet: Worksheet, rowNumber: number): void {
  const row = sheet.getRow(rowNumber)
  row.height = 24
  row.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${PURPLE}` } }
    cell.alignment = { vertical: 'middle' }
  })
}

export function styleDataRows(sheet: Worksheet, startRow: number): void {
  for (let rowNumber = startRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    sheet.getRow(rowNumber).eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: `FF${DARK}` } }
      cell.border = { bottom: { style: 'thin', color: { argb: `FF${BORDER}` } } }
      cell.alignment = { vertical: 'middle' }
    })
  }
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

import type { Quotation } from '../../../types/quotation'

function money(value: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(value)
}
function safeFilePart(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cliente'
}

export function createQuotationPdf(quotation: Quotation, businessName: string): { blob: Blob; fileName: string } {
  const document = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  const pageHeight = document.internal.pageSize.getHeight()
  document.setFillColor(103, 68, 228)
  document.rect(0, 0, pageWidth, 34, 'F')
  document.setTextColor(255, 255, 255)
  document.setFont('helvetica', 'bold')
  document.setFontSize(18)
  document.text(businessName, 15, 15)
  document.setFontSize(10)
  document.setFont('helvetica', 'normal')
  document.text('Cotización comercial', 15, 23)
  document.setFont('helvetica', 'bold')
  document.setFontSize(15)
  document.text(quotation.number, pageWidth - 15, 17, { align: 'right' })

  document.setTextColor(36, 30, 49)
  document.setFontSize(10)
  document.setFont('helvetica', 'bold')
  document.text('Cliente', 15, 47)
  document.setFont('helvetica', 'normal')
  document.text(quotation.customerName, 15, 54)
  if (quotation.customerEmail) document.text(quotation.customerEmail, 15, 60)
  if (quotation.customerPhone) document.text(quotation.customerPhone, 15, quotation.customerEmail ? 66 : 60)
  document.setFont('helvetica', 'bold')
  document.text('Emisión', pageWidth - 62, 47)
  document.setFont('helvetica', 'normal')
  document.text((quotation.createdAt ?? new Date()).toLocaleDateString('es-EC'), pageWidth - 15, 47, { align: 'right' })
  document.setFont('helvetica', 'bold')
  document.text('Válida hasta', pageWidth - 62, 54)
  document.setFont('helvetica', 'normal')
  document.text(quotation.validUntil.toLocaleDateString('es-EC'), pageWidth - 15, 54, { align: 'right' })

  autoTable(document, {
    startY: 74,
    head: [['Código', 'Producto', 'Marca', 'Cantidad', 'Valor unitario', 'Valor total']],
    body: quotation.items.map((item) => [item.code, item.name, item.brand, item.quantity, money(item.unitPrice, quotation.currency), money(item.total, quotation.currency)]),
    theme: 'plain',
    tableWidth: pageWidth - 30,
    margin: { top: 24, left: 15, right: 15, bottom: 30 },
    styles: { font: 'helvetica', fontSize: 9, textColor: [58, 51, 70], cellPadding: 3.2, lineColor: [232, 228, 240], lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: [103, 68, 228], textColor: [255, 255, 255], fontStyle: 'bold', lineWidth: 0 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        document.setFont('helvetica', 'bold')
        document.setFontSize(9)
        document.setTextColor(103, 68, 228)
        document.text(businessName, 15, 12)
        document.text(quotation.number, pageWidth - 15, 12, { align: 'right' })
      }
      document.setFontSize(8)
      document.setTextColor(130, 123, 142)
      document.text(`Generada por Inventra · Página ${document.getNumberOfPages()}`, 15, pageHeight - 12)
    },
  })
  const tableEnd = (document as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80
  let totalsY = tableEnd + 9
  if (totalsY > pageHeight - 62) { document.addPage(); totalsY = 28 }
  const labelX = pageWidth - 72
  const valueX = pageWidth - 15
  document.setFontSize(10)
  document.setTextColor(86, 78, 99)
  document.text('Subtotal', labelX, totalsY)
  document.text(money(quotation.subtotal, quotation.currency), valueX, totalsY, { align: 'right' })
  document.text(`IVA ${(quotation.taxRate * 100).toFixed(0)}%`, labelX, totalsY + 8)
  document.text(money(quotation.tax, quotation.currency), valueX, totalsY + 8, { align: 'right' })
  document.setDrawColor(213, 207, 228)
  document.line(labelX, totalsY + 13, valueX, totalsY + 13)
  document.setFont('helvetica', 'bold')
  document.setTextColor(36, 30, 49)
  document.setFontSize(13)
  document.text('TOTAL', labelX, totalsY + 22)
  document.text(money(quotation.total, quotation.currency), valueX, totalsY + 22, { align: 'right' })
  if (quotation.notes) {
    document.setFont('helvetica', 'bold')
    document.setFontSize(9)
    document.text('Observaciones', 15, totalsY + 9)
    document.setFont('helvetica', 'normal')
    document.setTextColor(96, 89, 108)
    document.text(document.splitTextToSize(quotation.notes, 105), 15, totalsY + 15)
  }
  const fileName = `${quotation.number.toLowerCase()}-${safeFilePart(quotation.customerName)}.pdf`
  return { blob: document.output('blob'), fileName }
}

export function downloadPdf(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

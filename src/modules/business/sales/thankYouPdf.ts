import { jsPDF } from 'jspdf'

import type { Sale } from '../../../types/sale'

const safeFilePart = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cliente'

async function drawLogo(document: jsPDF, logoUrl?: string | null): Promise<boolean> {
  if (!logoUrl) return false
  try {
    const response = await fetch(logoUrl)
    if (!response.ok) return false
    const contentType = response.headers.get('content-type') ?? ''
    const bytes = new Uint8Array(await response.arrayBuffer())
    const properties = document.getImageProperties(bytes)
    const ratio = Math.min(38 / properties.width, 38 / properties.height)
    const width = properties.width * ratio
    const height = properties.height * ratio
    document.addImage(bytes, contentType.includes('png') ? 'PNG' : 'JPEG', 105 - width / 2, 28 + (38 - height) / 2, width, height)
    return true
  } catch { return false }
}

export async function createThankYouPdf(sale: Sale, businessName: string, logoUrl?: string | null): Promise<{ blob: Blob; fileName: string }> {
  const document = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = document.internal.pageSize.getWidth()
  const pageHeight = document.internal.pageSize.getHeight()
  document.setFillColor(103, 68, 228)
  document.rect(0, 0, pageWidth, 18, 'F')
  document.setFillColor(248, 246, 255)
  document.roundedRect(68, 24, 74, 48, 7, 7, 'F')
  const hasLogo = await drawLogo(document, logoUrl)
  if (!hasLogo) {
    document.setTextColor(103, 68, 228)
    document.setFont('helvetica', 'bold')
    document.setFontSize(28)
    document.text(businessName.charAt(0).toUpperCase(), pageWidth / 2, 55, { align: 'center' })
  }
  document.setTextColor(36, 30, 49)
  document.setFont('helvetica', 'bold')
  document.setFontSize(25)
  document.text('¡Gracias por tu compra!', pageWidth / 2, 94, { align: 'center' })
  document.setFontSize(14)
  document.setTextColor(103, 68, 228)
  document.text(sale.customerName, pageWidth / 2, 107, { align: 'center' })
  document.setDrawColor(221, 216, 235)
  document.line(46, 117, pageWidth - 46, 117)
  document.setFont('helvetica', 'normal')
  document.setTextColor(89, 80, 104)
  document.setFontSize(12)
  const message = `Gracias por elegir ${businessName}. Valoramos mucho tu confianza y esperamos que tu experiencia haya sido excelente. Estamos a tu disposición para ayudarte nuevamente cuando lo necesites.`
  document.text(document.splitTextToSize(message, 138), pageWidth / 2, 133, { align: 'center' })
  document.setFillColor(248, 246, 255)
  document.roundedRect(40, 169, pageWidth - 80, 42, 6, 6, 'F')
  document.setFont('helvetica', 'bold')
  document.setFontSize(10)
  document.setTextColor(103, 68, 228)
  document.text('REFERENCIA DE COMPRA', pageWidth / 2, 182, { align: 'center' })
  document.setTextColor(36, 30, 49)
  document.setFontSize(13)
  document.text(sale.number, pageWidth / 2, 194, { align: 'center' })
  if (sale.sourceQuotationNumber) {
    document.setFont('helvetica', 'normal')
    document.setFontSize(9)
    document.setTextColor(116, 107, 132)
    document.text(`Cotización de origen: ${sale.sourceQuotationNumber}`, pageWidth / 2, 203, { align: 'center' })
  }
  document.setTextColor(36, 30, 49)
  document.setFont('helvetica', 'bold')
  document.setFontSize(15)
  document.text('Esperamos verte pronto', pageWidth / 2, 235, { align: 'center' })
  document.setFont('helvetica', 'normal')
  document.setFontSize(11)
  document.setTextColor(89, 80, 104)
  document.text(businessName, pageWidth / 2, 246, { align: 'center' })
  document.setFontSize(8)
  document.setTextColor(145, 137, 157)
  document.text('Documento de cortesía generado por Inventra', pageWidth / 2, pageHeight - 14, { align: 'center' })
  return { blob: document.output('blob'), fileName: `gracias-${sale.number.toLowerCase()}-${safeFilePart(sale.customerName)}.pdf` }
}

import { auth } from '../config/firebase'

type ApiResult = { message?: string; logoUrl?: string }

async function request(businessId: string, method: 'POST' | 'DELETE', body?: unknown): Promise<ApiResult> {
  const user = auth.currentUser
  if (!user) throw new Error('Tu sesión ha expirado.')
  const response = await fetch(`/api/business-logo?businessId=${encodeURIComponent(businessId)}`, { method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const text = await response.text()
  let result: ApiResult = {}
  if (text) { try { result = JSON.parse(text) as ApiResult } catch { throw new Error(`El servidor devolvió una respuesta inválida (${response.status}).`) } }
  if (!response.ok) throw new Error(result.message ?? 'No fue posible actualizar el logo.')
  return result
}

const MAX_DIMENSION = 600
const MAX_OPTIMIZED_BYTES = 300 * 1024

async function optimizeLogo(file: File): Promise<{ base64: string; contentType: string }> {
  const image = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No fue posible procesar la imagen.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()

  const contentType = 'image/jpeg'
  let quality = 0.88
  let blob: Blob | null = null
  do {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, contentType, quality))
    quality -= 0.1
  } while (blob && blob.size > MAX_OPTIMIZED_BYTES && quality >= 0.38)
  if (!blob || blob.size > MAX_OPTIMIZED_BYTES) throw new Error('No fue posible reducir el logo a menos de 300 KB.')

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No fue posible leer la imagen.'))
    reader.onerror = () => reject(new Error('No fue posible leer la imagen.'))
    reader.readAsDataURL(blob)
  })
  return { contentType, base64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
}

export async function uploadBusinessLogo(businessId: string, file: File): Promise<string> {
  const result = await request(businessId, 'POST', await optimizeLogo(file))
  return result.message ?? 'Logo actualizado correctamente.'
}
export async function deleteBusinessLogo(businessId: string): Promise<string> { return (await request(businessId, 'DELETE')).message ?? 'Logo eliminado correctamente.' }

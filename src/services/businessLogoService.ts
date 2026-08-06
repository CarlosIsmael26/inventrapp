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

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No fue posible leer la imagen.'))
    reader.onerror = () => reject(new Error('No fue posible leer la imagen.'))
    reader.readAsDataURL(file)
  })
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

export async function uploadBusinessLogo(businessId: string, file: File): Promise<string> {
  const result = await request(businessId, 'POST', { contentType: file.type, base64: await fileToBase64(file) })
  return result.message ?? 'Logo actualizado correctamente.'
}
export async function deleteBusinessLogo(businessId: string): Promise<string> { return (await request(businessId, 'DELETE')).message ?? 'Logo eliminado correctamente.' }

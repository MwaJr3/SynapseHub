import type { SessionInfo } from './types'
let csrf = ''
export const API = '/api/v1'
export class ApiError extends Error {
  code: string
  status: number
  fields?: { field: string; message: string }[]
  constructor(message: string, code: string, status: number, fields?: { field: string; message: string }[]) {
    super(message)
    this.code = code
    this.status = status
    this.fields = fields
  }
}
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && options.body) headers.set('Content-Type', 'application/json')
  if (csrf) headers.set('X-CSRF-Token', csrf)
  let response: Response
  try {
    response = await fetch(API + path, { ...options, headers, credentials: 'same-origin' })
  } catch {
    throw new ApiError(
      'The server could not be reached. Check your connection and try again.',
      'connection_failed',
      0,
    )
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = data.error || data.detail || {}
    throw new ApiError(
      error.message || `The request failed (${response.status}). Please try again.`,
      error.code || 'request_failed',
      response.status,
      error.fields,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
export const post = <T>(path: string, body: unknown = {}) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
export function setSessionToken(data: SessionInfo) {
  csrf = data.csrf_token
  return data
}
export async function getSession() {
  return setSessionToken(await request<SessionInfo>('/session'))
}
export async function downloadExport(id: string, format: 'markdown' | 'docx' | 'json', title: string) {
  const response = await fetch(`${API}/analyses/${encodeURIComponent(id)}/export?format=${format}`, {
    credentials: 'same-origin',
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error?.message || 'Export failed. Please try again.')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 70) || 'learning-guide'}.${format === 'markdown' ? 'md' : format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const input = document.createElement('textarea')
  input.value = text
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  const success = document.execCommand('copy')
  input.remove()
  if (!success) throw new Error('Clipboard access was blocked. Please use a document export instead.')
}
export async function copyGuide(id: string) {
  const response = await fetch(`${API}/analyses/${encodeURIComponent(id)}/export?format=markdown`, {
    credentials: 'same-origin',
  })
  if (!response.ok) throw new Error('The guide could not be copied. Please retry or download an export.')
  await copyText(await response.text())
}

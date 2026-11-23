import { isRecord } from '../types'
export type Profile = { id: string; hasKey: boolean; provider?: string; model?: string; follow: boolean; mode: 'reader' | 'diagnostic'; error?: string }
export async function profileRequest(server: string, path: string, body?: unknown, signal?: AbortSignal) {
  const url = new URL(server)
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash) throw new Error('계정 설정은 로컬 서버에서 사용할 수 있어요.')
  const response = await fetch(`${url.href.replace(/\/$/, '')}/v1/reader/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000), cache: 'no-store' })
  if (response.status === 204) return null
  const data: unknown = await response.json()
  if (!response.ok) throw new Error(isRecord(data) && typeof data.detail === 'string' ? data.detail : '계정 설정에 연결하지 못했어요.')
  return data
}
export function asProfile(data: unknown): Profile {
  if (!isRecord(data) || typeof data.id !== 'string' || typeof data.hasKey !== 'boolean' || typeof data.follow !== 'boolean' || !['reader','diagnostic'].includes(String(data.mode))) throw new Error('계정 응답을 확인하지 못했어요.')
  return data as Profile
}

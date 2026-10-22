import { isAnalysisResponse, isRecord, type AnalyzeDocument } from '../types'

export function createApiAnalyzer(baseUrl: string): AnalyzeDocument {
  return async (snapshot, signal) => {
    if (!baseUrl.trim())
      throw new Error('분석 서버가 아직 연결되지 않았습니다.')
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
      signal,
    })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(
        isRecord(body) && typeof body.error === 'string'
          ? body.error
          : '분석 요청을 처리하지 못했습니다. 다시 시도해 주세요.',
      )
    }
    if (!isAnalysisResponse(body))
      throw new Error('분석 결과의 형식이 올바르지 않습니다.')
    return body
  }
}

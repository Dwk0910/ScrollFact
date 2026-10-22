import {
  isAnalysisJob,
  isAnalysisResponse,
  type AnalyzeDocument,
  type AnalysisResponse,
  type DocumentSnapshot,
  type AnalysisProgress,
  type AnalysisJob,
  isRecord,
  MAX_HTML_BYTES,
  MAX_UPLOAD_BYTES,
} from '../types'

export function waitForPoll(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}

async function readBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      isRecord(body) && typeof body.detail === 'string'
        ? body.detail
        : response.status === 413
          ? '이 페이지는 분석할 수 있는 크기를 초과했습니다.'
          : '분석 서버에 연결하지 못했습니다. 다시 시도해 주세요.',
    )
  }
  return body
}

async function readJob(response: Response): Promise<AnalysisJob> {
  const body = await readBody(response)
  if (!isAnalysisJob(body))
    throw new Error('분석 작업의 응답 형식이 올바르지 않습니다.')
  return body
}

export function createApiAnalyzer(baseUrl: string): AnalyzeDocument {
  return createJobRunner<AnalysisResponse>(baseUrl, 'analysis', isAnalysisResponse)
}

export function createDiagnosticAnalyzer(baseUrl: string) {
  return createJobRunner<DiagnosticResult>(baseUrl, 'diagnostic', isDiagnosticResult)
}

export interface DiagnosticResult {
  schemaVersion: '1.0'
  kind: 'diagnostic'
  analysisId: string
  snapshotId: string
  document: { url: string; title: string }
  htmlBytes: number
  passages: { id: string; selector: string; text: string }[]
  sources: { url: string; title: string; textCharacters: number; failure?: string }[]
}

function isDiagnosticResult(value: unknown): value is DiagnosticResult {
  return isRecord(value) && value.schemaVersion === '1.0' && value.kind === 'diagnostic'
    && typeof value.analysisId === 'string' && typeof value.snapshotId === 'string'
    && isRecord(value.document) && typeof value.document.url === 'string' && typeof value.document.title === 'string'
    && Number.isSafeInteger(value.htmlBytes) && Number(value.htmlBytes) > 0
    && Array.isArray(value.passages) && value.passages.every((p: unknown) => isRecord(p)
      && typeof p.id === 'string' && typeof p.selector === 'string' && typeof p.text === 'string')
    && Array.isArray(value.sources) && value.sources.every((s: unknown) => isRecord(s)
      && typeof s.url === 'string' && typeof s.title === 'string'
      && Number.isSafeInteger(s.textCharacters) && Number(s.textCharacters) >= 0
      && (s.failure === undefined || typeof s.failure === 'string'))
}

function createJobRunner<T extends { analysisId: string; snapshotId: string; document: { url: string } }>(
  baseUrl: string,
  mode: 'analysis' | 'diagnostic',
  validate: (value: unknown) => value is T,
): (snapshot: DocumentSnapshot, signal: AbortSignal, onProgress?: (progress: AnalysisProgress) => void) => Promise<T> {
  return async (snapshot, signal, onProgress) => {
    if (!baseUrl.trim())
      throw new Error('분석 서버가 아직 연결되지 않았습니다.')
    const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/analyses`
    let jobId: string | undefined
    let terminal = false
    const request = (url: string, init: RequestInit = {}) =>
      fetch(url, {
        ...init,
        signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
        cache: 'no-store',
      })

    try {
      signal.throwIfAborted()
      onProgress?.({ phase: 'compressing' })
      const html = new Blob([snapshot.html], {
        type: 'text/html;charset=utf-8',
      })
      if (html.size > MAX_HTML_BYTES)
        throw new Error(
          '페이지 HTML이 20 MiB를 초과해 분석할 수 없습니다. 원문을 잘라 보내지는 않습니다.',
        )
      const compressed = await new Response(
        html.stream().pipeThrough(new CompressionStream('gzip'), { signal }),
      ).blob()
      signal.throwIfAborted()
      if (compressed.size > MAX_UPLOAD_BYTES)
        throw new Error('압축한 페이지가 5 MiB를 초과해 분석할 수 없습니다.')

      const payload = new FormData()
      payload.append(
        'metadata',
        new Blob(
          [
            JSON.stringify({
              snapshotId: snapshot.snapshotId,
              url: snapshot.url,
              title: snapshot.title,
              htmlBytes: html.size,
              encoding: 'gzip',
              mode,
            }),
          ],
          { type: 'application/json' },
        ),
        'metadata.json',
      )
      payload.append('document', compressed, 'document.html.gz')
      onProgress?.({
        phase: 'uploading',
        originalBytes: html.size,
        uploadedBytes: compressed.size,
      })
      const accepted = await request(endpoint, {
        method: 'POST',
        body: payload,
        headers: { 'Idempotency-Key': snapshot.snapshotId },
      })
      if (accepted.ok && accepted.status !== 202)
        throw new Error('서버가 비동기 분석 접수 형식을 지원하지 않습니다.')
      let job = await readJob(accepted)
      if (job.snapshotId !== snapshot.snapshotId)
        throw new Error('다른 페이지의 분석 작업이 도착했습니다.')
      jobId = job.analysisId
      for (;;) {
        signal.throwIfAborted()
        if (job.snapshotId !== snapshot.snapshotId || job.analysisId !== jobId)
          throw new Error('다른 페이지의 분석 작업이 도착했습니다.')
        if (job.status === 'completed') {
          terminal = true
          const result = await readBody(
            await request(`${endpoint}/${encodeURIComponent(jobId)}/result`),
          )
          if (!validate(result))
            throw new Error('분석 결과의 형식이 올바르지 않습니다.')
          if (
            result.analysisId !== jobId ||
            result.snapshotId !== snapshot.snapshotId ||
            result.document.url !== snapshot.url
          )
            throw new Error('다른 페이지의 분석 결과가 도착했습니다.')
          return result
        }
        if (job.status === 'failed') {
          terminal = true
          throw new Error(job.error)
        }
        onProgress?.({
          phase: job.phase,
          sources: job.sources,
          originalBytes: html.size,
          uploadedBytes: compressed.size,
        })
        await waitForPoll(2000, signal)
        job = await readJob(
          await request(`${endpoint}/${encodeURIComponent(jobId)}`),
        )
      }
    } finally {
      // Best effort, independent of the aborted polling request. Server TTL is the fallback.
      if (jobId && !terminal) {
        void fetch(`${endpoint}/${encodeURIComponent(jobId)}`, {
          method: 'DELETE',
          keepalive: true,
          signal: AbortSignal.timeout(5000),
        }).catch(() => undefined)
      }
    }
  }
}

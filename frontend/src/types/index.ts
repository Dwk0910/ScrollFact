export const MessageType = {
  togglePanel: 'SF_TOGGLE_PANEL',
  getContext: 'SF_GET_CONTEXT',
  captureDocument: 'SF_CAPTURE_DOCUMENT',
  watchSections: 'SF_WATCH_SECTIONS',
  stopWatching: 'SF_STOP_WATCHING',
  scrollToSection: 'SF_SCROLL_TO_SECTION',
  activeSectionChanged: 'SF_ACTIVE_SECTION_CHANGED',
  documentChanged: 'SF_DOCUMENT_CHANGED',
} as const

export type TrustStatus = 'high' | 'good' | 'caution' | 'low' | 'danger'
export type AnalysisStatus = 'ready' | 'loading' | 'done' | 'error'

export interface DocumentSnapshot {
  snapshotId: string
  url: string
  title: string
  html: string
}

export interface TrustAssessment {
  score: number
  status: TrustStatus
  summary: string
}

export interface SourceLink {
  title: string
  publisher: string
  url: string
}

export interface SectionAnalysis extends TrustAssessment {
  id: string
  selector: string
  title: string
  excerpt: string
  reasons: { title: string; detail: string }[]
  sources: SourceLink[]
}

export interface AnalysisResponse {
  schemaVersion: '1.0'
  analysisId: string
  snapshotId: string
  document: { url: string; title: string }
  overview: TrustAssessment
  sections: SectionAnalysis[]
}

export type AnalyzeDocument = (
  snapshot: DocumentSnapshot,
  signal: AbortSignal,
  onProgress?: (progress: AnalysisProgress) => void,
) => Promise<AnalysisResponse>

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isAssessment(value: unknown): value is TrustAssessment {
  return (
    isRecord(value) &&
    Number.isInteger(value.score) &&
    Number(value.score) >= 0 &&
    Number(value.score) <= 100 &&
    ['high', 'good', 'caution', 'low', 'danger'].includes(
      String(value.status),
    ) &&
    nonempty(value.summary)
  )
}

export function isDocumentSnapshot(value: unknown): value is DocumentSnapshot {
  return (
    isRecord(value) &&
    nonempty(value.snapshotId) &&
    isHttpUrl(value.url) &&
    typeof value.title === 'string' &&
    nonempty(value.html)
  )
}

export function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '1.0' ||
    !nonempty(value.analysisId) ||
    !nonempty(value.snapshotId) ||
    !isRecord(value.document) ||
    !isHttpUrl(value.document.url) ||
    !nonempty(value.document.title) ||
    !isAssessment(value.overview) ||
    !Array.isArray(value.sections)
  )
    return false
  const ids = new Set<string>()
  return value.sections.every((section: unknown) => {
    if (
      !isRecord(section) ||
      !isAssessment(section) ||
      !nonempty(section.id) ||
      ids.has(section.id) ||
      !nonempty(section.selector) ||
      !nonempty(section.title) ||
      !nonempty(section.excerpt) ||
      !Array.isArray(section.reasons) ||
      !Array.isArray(section.sources)
    )
      return false
    ids.add(section.id)
    return (
      section.reasons.every(
        (reason: unknown) =>
          isRecord(reason) && nonempty(reason.title) && nonempty(reason.detail),
      ) &&
      section.sources.every(
        (source: unknown) =>
          isRecord(source) &&
          nonempty(source.title) &&
          nonempty(source.publisher) &&
          isHttpUrl(source.url),
      )
    )
  })
}

export const MAX_HTML_BYTES = 20 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export type ServerPhase =
  'queued' | 'extracting' | 'checking_sources' | 'summarizing'
export type AnalysisPhase =
  'capturing' | 'compressing' | 'uploading' | ServerPhase
export interface SourceProgress {
  completed: number
  total: number | null
  failed: number
}
export interface AnalysisProgress {
  phase: AnalysisPhase
  sources?: SourceProgress
  originalBytes?: number
  uploadedBytes?: number
}
type JobIdentity = { analysisId: string; snapshotId: string }
export type AnalysisJob = JobIdentity &
  (
    | {
        status: 'queued' | 'running'
        phase: ServerPhase
        sources?: SourceProgress
      }
    | { status: 'completed'; result: AnalysisResponse }
    | { status: 'failed'; error: string }
    | { status: 'cancelled' }
  )

export function isAnalysisJob(value: unknown): value is AnalysisJob {
  if (
    !isRecord(value) ||
    !nonempty(value.analysisId) ||
    !nonempty(value.snapshotId)
  )
    return false
  if (value.status === 'completed')
    return (
      isAnalysisResponse(value.result) &&
      value.result.analysisId === value.analysisId &&
      value.result.snapshotId === value.snapshotId
    )
  if (value.status === 'failed') return nonempty(value.error)
  if (value.status === 'cancelled') return true
  if (value.status !== 'queued' && value.status !== 'running') return false
  if (
    !['queued', 'extracting', 'checking_sources', 'summarizing'].includes(
      String(value.phase),
    )
  )
    return false
  if ((value.status === 'queued') !== (value.phase === 'queued')) return false
  if (value.sources === undefined) return true
  const sources = value.sources
  return (
    isRecord(sources) &&
    Number.isSafeInteger(sources.completed) &&
    Number(sources.completed) >= 0 &&
    Number.isSafeInteger(sources.failed) &&
    Number(sources.failed) >= 0 &&
    Number(sources.failed) <= Number(sources.completed) &&
    (sources.total === null ||
      (Number.isSafeInteger(sources.total) &&
        Number(sources.total) >= Number(sources.completed)))
  )
}

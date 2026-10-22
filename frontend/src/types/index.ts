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

export const MessageType = {
  requestParse: 'REQUEST_PARSE',
  getCurrent: 'GET_CURRENT',
  activeParagraphChanged: 'ACTIVE_PARAGRAPH_CHANGED',
  togglePanel: 'TOGGLE_PANEL',
  getPageHtml: 'GET_PAGE_HTML',
} as const

export type CredibilityStatus = 'aligned' | 'insufficient' | 'caution'

export type AnalysisStatus = 'ready' | 'loading' | 'done' | 'error'

export interface SourceLink {
  label: string
  url: string
}

export interface StanceSummary {
  summary: readonly string[]
  sources: readonly SourceLink[]
}

export interface GlossaryTerm {
  word: string
  explanation: string
}

export interface ParagraphAnalysis {
  trustScore: number
  keyClaim: string
  credibility: CredibilityStatus
  credibilityLabel: string
  stanceA: StanceSummary
  stanceB: StanceSummary
  terms: readonly GlossaryTerm[]
}

export interface ParsedParagraph {
  id: string
  index: number
  text: string
}

export interface ActiveParagraphPayload {
  paragraphId: string
  index: number
  text: string
  url: string
  title: string
  total: number
}

export interface ParseResultPayload {
  url: string
  title: string
  paragraphs: ParsedParagraph[]
  active: ActiveParagraphPayload | null
}

export interface ActiveParagraphMessage {
  type: typeof MessageType.activeParagraphChanged
  payload: ActiveParagraphPayload
}

export interface ParseSuccessResponse {
  ok: true
  payload: ParseResultPayload
}

export interface CurrentSuccessResponse {
  ok: true
  payload: ActiveParagraphPayload | null
  paragraphs?: ParsedParagraph[]
}

export interface PageHtmlPayload {
  url: string
  title: string
  html: string
}

export interface PageHtmlSuccessResponse {
  ok: true
  payload: PageHtmlPayload
}

export interface ErrorResponse {
  ok: false
  error: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isActiveParagraphPayload(value: unknown): value is ActiveParagraphPayload {
  if (!isRecord(value)) return false
  return (
    typeof value.paragraphId === 'string' &&
    typeof value.index === 'number' &&
    typeof value.text === 'string' &&
    typeof value.url === 'string' &&
    typeof value.title === 'string' &&
    typeof value.total === 'number'
  )
}

export function isActiveParagraphMessage(value: unknown): value is ActiveParagraphMessage {
  return (
    isRecord(value) &&
    value.type === MessageType.activeParagraphChanged &&
    isActiveParagraphPayload(value.payload)
  )
}

export function isErrorResponse(value: unknown): value is ErrorResponse {
  return isRecord(value) && value.ok === false && typeof value.error === 'string'
}

export function isParseSuccessResponse(value: unknown): value is ParseSuccessResponse {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.payload)) return false
  const payload = value.payload
  return (
    typeof payload.url === 'string' &&
    typeof payload.title === 'string' &&
    Array.isArray(payload.paragraphs) &&
    (payload.active === null || isActiveParagraphPayload(payload.active))
  )
}

export function isCurrentSuccessResponse(value: unknown): value is CurrentSuccessResponse {
  if (!isRecord(value) || value.ok !== true) return false
  return value.payload === null || isActiveParagraphPayload(value.payload)
}

export function isPageHtmlSuccessResponse(value: unknown): value is PageHtmlSuccessResponse {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.payload)) return false
  const payload = value.payload
  return (
    typeof payload.url === 'string' && typeof payload.title === 'string' && typeof payload.html === 'string'
  )
}

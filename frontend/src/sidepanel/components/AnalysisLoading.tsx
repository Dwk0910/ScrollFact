import { useEffect, useRef, useState } from 'react'
import { Check, Clock3, LoaderCircle, ScanLine } from 'lucide-react'
import type { AnalysisPhase, AnalysisProgress } from '../../types'

const steps = [
  {
    title: '페이지 준비',
    description: '원문을 압축해 안전하게 전달하고 있어요.',
  },
  {
    title: '분석 순서 대기',
    description: '서버가 분석을 시작할 때까지 기다리고 있어요.',
  },
  {
    title: '본문과 주장 살펴보기',
    description: '페이지를 문단으로 나누고 출처 링크를 찾고 있어요.',
  },
  {
    title: '출처 하나씩 확인하기',
    description: '연결된 참고 자료의 본문을 수집하고 있어요.',
  },
  {
    title: '신뢰도와 근거 정리',
    description: '문단별 판단과 페이지 전체의 신뢰도를 정리하고 있어요.',
  },
]
const stepForPhase: Record<AnalysisPhase, number> = {
  capturing: 0,
  compressing: 0,
  uploading: 0,
  queued: 1,
  extracting: 2,
  checking_sources: 3,
  summarizing: 4,
}
const preparationLabels = {
  capturing: '현재 페이지를 가져오고 있어요.',
  compressing: '전송량을 줄이기 위해 원문을 압축하고 있어요.',
  uploading: '압축한 페이지를 분석 서버로 전달하고 있어요.',
}

export function AnalysisLoading({
  progress,
  onCancel,
  diagnostic = false,
}: {
  progress: AnalysisProgress
  onCancel: () => void
  diagnostic?: boolean
}) {
  const [elapsed, setElapsed] = useState(0)
  const screenRef = useRef<HTMLElement>(null)
  const active = stepForPhase[progress.phase]
  const sources = progress.sources
  const description =
    progress.phase in preparationLabels
      ? preparationLabels[progress.phase as keyof typeof preparationLabels]
      : steps[active].description
  useEffect(() => {
    screenRef.current?.focus()
    const started = Date.now()
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [])

  return (
    <main
      className="analysis-loading"
      ref={screenRef}
      tabIndex={-1}
      aria-labelledby="loading-title"
    >
      <div className="loading-topline">
        <span className="eyebrow">READING THE CONTEXT</span>
        <span className="elapsed-time" aria-label={`경과 시간 ${elapsed}초`}>
          <Clock3 size={12} aria-hidden="true" />
          {String(Math.floor(elapsed / 60)).padStart(2, '0')}:
          {String(elapsed % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="analysis-illustration" aria-hidden="true">
        <div className="analysis-paper">
          <ScanLine size={25} />
          <i />
          <i />
          <i />
          <div className="analysis-scan" />
        </div>
        <span className="analysis-seal">
          <LoaderCircle size={20} className="spin" />
        </span>
      </div>
      <h1 id="loading-title">
        근거를 하나씩,
        <br />
        살펴보고 있어요.
      </h1>
      <p className="loading-intro">
        페이지 전체와 연결된 출처를 확인합니다.
        <br />
        내용과 출처가 많으면 시간이 더 걸릴 수 있어요.
      </p>
      <div
        className="analysis-live-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="live-dot" />
        <span>{description}</span>
      </div>
      <ol className="analysis-steps" aria-label="분석 단계">
        {(diagnostic ? steps.slice(0, 4) : steps).map((step, index) => (
          <li
            key={step.title}
            className={
              index === active
                ? 'is-current'
                : index < active
                  ? 'is-complete'
                  : ''
            }
            aria-current={index === active ? 'step' : undefined}
          >
            <span className="step-mark" aria-hidden="true">
              {index < active ? (
                <Check size={13} />
              ) : index === active ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                String(index + 1).padStart(2, '0')
              )}
            </span>
            <span>{step.title}</span>
            <small>
              {index < active ? '완료' : index === active ? '진행 중' : '대기'}
            </small>
          </li>
        ))}
      </ol>
      {sources && (
        <div
          className="source-progress"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>출처 처리 현황</span>
          <strong>
            {sources.completed}
            <small>
              {sources.total === null ? '개 처리' : ` / ${sources.total}개`}
            </small>
          </strong>
          <p>
            {sources.total === null
              ? '확인할 출처를 더 찾고 있어요.'
              : '중복된 출처는 한 번만 확인합니다.'}
            {sources.failed > 0 &&
              ` ${sources.failed}개는 확인하지 못했습니다.`}
          </p>
        </div>
      )}
      {elapsed >= 30 && (
        <p className="long-analysis-note">
          출처를 확인하는 데 시간이 걸리고 있습니다. 분석이 끝나면 결과 화면으로
          자동 이동합니다.
        </p>
      )}
      <div className="analysis-loading-footer">
        <button className="cancel-analysis" onClick={onCancel}>
          분석 중단
        </button>
        <p>이 창을 유지하면 완료된 결과를 바로 볼 수 있어요.</p>
      </div>
    </main>
  )
}

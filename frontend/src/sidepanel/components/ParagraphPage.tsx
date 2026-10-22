import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Check,
  TriangleAlert,
} from 'lucide-react'
import type { SectionAnalysis } from '../../types'
import { trustLabels, trustTone } from '../trust'
import { TrustGauge } from './TrustGauge'

interface Props {
  section: SectionAnalysis
  index: number
  total: number
  inExtension: boolean
  onJumpToSource: () => void
  onNext: () => void
}

export function ParagraphPage({
  section,
  index,
  total,
  inExtension,
  onJumpToSource,
  onNext,
}: Props) {
  const tone = trustTone(section.status)
  const StatusIcon = tone === 'green' ? Check : TriangleAlert
  return (
    <article
      className={`analysis-page paragraph-page tone-${tone}`}
      aria-label={`문단 ${index + 1}: ${section.title}`}
    >
      <div className="page-inner">
        <div className="paragraph-topline">
          <span className="eyebrow">
            PASSAGE {String(index + 1).padStart(2, '0')}
          </span>
          <span className="muted">
            {index + 1} / {total}
          </span>
        </div>
        <div className="paragraph-heading">
          <div>
            <span className="status-badge">
              <StatusIcon size={13} aria-hidden="true" />
              {trustLabels[section.status]}
            </span>
            <h2>{section.title}</h2>
          </div>
          <TrustGauge score={section.score} status={section.status} compact />
        </div>
        <p className="paragraph-summary">{section.summary}</p>
        <blockquote className="excerpt">
          <span>원문 발췌</span>
          <p>{section.excerpt}</p>
        </blockquote>
        <section className="reasons" aria-label="판단 이유">
          <h3>
            <span className="small-rule" />
            이렇게 판단했어요
          </h3>
          {section.reasons.length ? (
            section.reasons.map((reason, i) => (
              <div className="reason" key={`${section.id}-reason-${i}`}>
                <span className="reason-index">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h4>{reason.title}</h4>
                  <p>{reason.detail}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-detail">제공된 판단 이유가 없습니다.</p>
          )}
        </section>
        <section className="sources" aria-label="참고 출처">
          <h3>
            <BookOpen size={15} aria-hidden="true" />
            참고한 출처 <span>{section.sources.length}</span>
          </h3>
          {section.sources.length ? (
            section.sources.map((source, i) => (
              <a
                className="source-link"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                key={`${section.id}-source-${i}`}
              >
                <span>
                  <small>{source.publisher}</small>
                  <strong>{source.title}</strong>
                </span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            ))
          ) : (
            <p className="empty-detail">
              제공된 출처가 없습니다. 근거를 확인하며 읽어 주세요.
            </p>
          )}
        </section>
        {inExtension && (
          <button className="text-button source-jump" onClick={onJumpToSource}>
            원문에서 이 문단 보기 <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        )}
        <button className="page-next" onClick={onNext}>
          <span>
            {index === total - 1
              ? '전체 분석으로 돌아가기'
              : '다음 문단 이어서 보기'}
          </span>
          <ArrowDown
            className={index === total - 1 ? 'rotate-up' : ''}
            size={17}
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
  )
}

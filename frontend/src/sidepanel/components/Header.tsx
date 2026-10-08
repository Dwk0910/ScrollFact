import { LoaderCircle, ScrollText } from 'lucide-react'
import type { AnalysisStatus } from '../../types'

interface HeaderProps {
  status: AnalysisStatus
  onAnalyze: () => void
  onGoogleLogin: () => void
  googleLoading: boolean
}

const badgeLabel: Record<AnalysisStatus, string> = {
  ready: 'Analysis Ready',
  loading: '분석 중',
  done: '분석 완료',
  error: '분석 실패',
}

const badgeClass: Record<AnalysisStatus, string> = {
  ready: 'bg-white/15 text-paper ring-white/25',
  loading: 'bg-amber-100 text-amber-950 ring-amber-200',
  done: 'bg-emerald-100 text-emerald-950 ring-emerald-200',
  error: 'bg-rose-100 text-rose-950 ring-rose-200',
}

export function Header({ status, onAnalyze, onGoogleLogin, googleLoading }: HeaderProps) {
  const isLoading = status === 'loading'

  return (
    <header className="bg-pine px-4 pt-4 pb-4 text-paper">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <ScrollText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">ScrollFact</p>
            <p className="text-xs text-paper/70">스크롤팩트</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${badgeClass[status]}`}
        >
          {badgeLabel[status]}
        </span>
      </div>

      <button
        type="button"
        onClick={onAnalyze}
        disabled={isLoading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm font-semibold text-pine transition hover:bg-white disabled:cursor-wait disabled:opacity-80"
      >
        {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        {isLoading ? '분석 중...' : '이 페이지 맥락/신뢰도 분석'}
      </button>
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={googleLoading}
        className="mt-2 flex w-full items-center justify-center rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-paper ring-1 ring-white/20 transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-80"
      >
        Google로 로그인
      </button>
    </header>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { createApiAnalyzer } from '../api/analyze'
import type { AnalysisResponse, AnalyzeDocument } from '../types'
import { SidePanel } from './SidePanel'

// 개발용 예상 백엔드 응답은 이 루트 파일 한 곳에서만 관리합니다.
// 콘솔에서 window.SCROLLFACT_MOCK_RESPONSE를 수정하고 '다시 분석'을 눌러 확인할 수 있습니다.
declare global {
  interface Window {
    SCROLLFACT_MOCK_RESPONSE: AnalysisResponse
  }
}

window.SCROLLFACT_MOCK_RESPONSE = {
  schemaVersion: '1.0',
  analysisId: 'demo-energy-2026',
  snapshotId: 'replaced-with-captured-snapshot-id',
  document: {
    url: 'https://example.com/energy-transition',
    title: '에너지 전환, 숫자 너머의 이야기',
  },
  overview: {
    score: 78,
    status: 'good',
    summary:
      '재생에너지 확대라는 큰 흐름은 근거가 충분합니다. 다만 발전 비중의 집계 기준과 전기요금에 대한 인과관계는 구분해서 읽어야 합니다.',
  },
  sections: [
    {
      id: 'energy-growth',
      selector: '#sf-demo-p1',
      title: '재생에너지는 꾸준히 늘고 있다',
      score: 92,
      status: 'high',
      excerpt:
        '재생에너지 발전량은 최근 몇 년간 꾸준히 증가했다. 태양광과 풍력이 증가분의 중심이며, 전력 생산에서 차지하는 역할도 커지고 있다.',
      summary:
        '발전량이 증가하는 방향은 일관됩니다. 같은 기간과 같은 집계 기준을 비교한 주장입니다.',
      reasons: [
        {
          title: '서로 다른 자료에서 같은 흐름',
          detail:
            '연간 발전량과 에너지원별 추이가 함께 제시되어, 단일 시점만으로 증가를 주장하지 않습니다.',
        },
        {
          title: '주장의 범위가 근거와 일치',
          detail:
            '설비용량과 발전량을 구분하고, 비교 기간을 명시한 점이 신뢰도를 높입니다.',
        },
      ],
      sources: [
        {
          title: '에너지원별 연간 발전량 추이',
          publisher: '샘플 자료 · 전력 통계',
          url: 'https://example.com/sources/generation',
        },
        {
          title: '재생에너지 발전 현황',
          publisher: '샘플 자료 · 에너지 보고서',
          url: 'https://example.com/sources/renewables',
        },
      ],
    },
    {
      id: 'share-definition',
      selector: '#sf-demo-p2',
      title: '같은 비율, 다른 집계 기준',
      score: 61,
      status: 'caution',
      excerpt:
        '재생에너지는 이미 전력의 상당 부분을 담당한다. 설치된 발전 설비의 비중을 보면 에너지 전환이 빠르게 진행되고 있음을 알 수 있다.',
      summary:
        '발전 설비의 비중을 실제 전력 생산 비중처럼 읽으면 확대 정도를 과대평가할 수 있습니다.',
      reasons: [
        {
          title: '설비용량과 실제 생산량의 혼용',
          detail:
            '설비용량은 최대 출력이고 발전량은 실제 생산한 전력입니다. 서로 다른 지표를 같은 비율로 비교할 수 없습니다.',
        },
        {
          title: '비교 기준이 더 필요',
          detail:
            '어느 해의 수치인지, 수력을 포함했는지 명확한 설명이 필요합니다.',
        },
      ],
      sources: [
        {
          title: '설비용량과 발전량의 차이',
          publisher: '샘플 자료 · 지표 해설',
          url: 'https://example.com/sources/capacity',
        },
      ],
    },
    {
      id: 'price-claim',
      selector: '#sf-demo-p3',
      title: '전기요금 상승의 원인은 하나일까',
      score: 28,
      status: 'danger',
      excerpt:
        '전기요금이 오른 것은 전적으로 재생에너지 확대 때문이다. 재생에너지를 줄이면 전기요금 문제도 곧바로 해결할 수 있다.',
      summary:
        '여러 요인이 작용하는 가격 변화를 하나의 원인으로 단정합니다. 제시된 근거만으로는 인과관계를 뒷받침하기 어렵습니다.',
      reasons: [
        {
          title: '상관관계를 인과관계로 단정',
          detail:
            '같은 시기에 두 변화가 일어났다는 사실만으로 한쪽이 다른 쪽의 원인이라고 할 수 없습니다.',
        },
        {
          title: '주요 변수가 빠져 있음',
          detail:
            '연료 가격, 환율, 요금 정책 등 다른 설명을 배제할 근거가 제시되지 않았습니다.',
        },
      ],
      sources: [
        {
          title: '전기요금의 비용 구성',
          publisher: '샘플 자료 · 요금 구조',
          url: 'https://example.com/sources/pricing',
        },
      ],
    },
    {
      id: 'balanced-transition',
      selector: '#sf-demo-p4',
      title: '전환의 속도만큼 중요한 조건',
      score: 85,
      status: 'good',
      excerpt:
        '안정적인 에너지 전환을 위해서는 발전 설비뿐 아니라 전력망과 저장 장치에 대한 투자가 함께 필요하다. 비용과 안정성을 함께 고려하는 접근이 중요하다.',
      summary:
        '발전원 확대와 계통 투자를 함께 고려하는 설명입니다. 단정적인 결론 대신 필요한 조건을 제시합니다.',
      reasons: [
        {
          title: '장점과 제약을 함께 설명',
          detail:
            '발전량 증가와 함께 변동성 및 전력망의 수용 능력을 언급해 설명의 균형을 유지합니다.',
        },
        {
          title: '조건을 명시한 결론',
          detail:
            '투자와 운영 방식에 따라 결과가 달라질 수 있다는 조건을 포함합니다.',
        },
      ],
      sources: [
        {
          title: '전력망과 에너지 저장의 역할',
          publisher: '샘플 자료 · 계통 보고서',
          url: 'https://example.com/sources/grid',
        },
      ],
    },
  ],
}

const demo = import.meta.env.VITE_ANALYSIS_MODE !== 'api'
const analyzeDocument: AnalyzeDocument = demo
  ? async (snapshot, signal) => {
      await new Promise<void>((resolve, reject) => {
        const finish = () => {
          signal.removeEventListener('abort', abort)
          resolve()
        }
        const timer = window.setTimeout(finish, 850)
        const abort = () => {
          window.clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        if (signal.aborted) abort()
        else signal.addEventListener('abort', abort, { once: true })
      })
      // 요청 식별자만 맞춥니다. 본문/점수/요약/selector를 프론트에서 생성하지 않습니다.
      const sample = structuredClone(window.SCROLLFACT_MOCK_RESPONSE)
      return {
        ...sample,
        snapshotId: snapshot.snapshotId,
        document: { ...sample.document, url: snapshot.url },
      }
    }
  : createApiAnalyzer(import.meta.env.VITE_API_BASE_URL ?? '')

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root was not found')
createRoot(root).render(
  <StrictMode>
    <SidePanel analyzeDocument={analyzeDocument} demo={demo} />
  </StrictMode>,
)

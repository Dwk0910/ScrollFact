import type { ParagraphAnalysis } from '../types'

export const mockAnalyses: readonly ParagraphAnalysis[] = [
  {
    trustScore: 86,
    keyClaim: '2024년 국내 재생에너지 발전 비중이 처음 10%를 넘어섰다는 문단의 핵심 수치다.',
    credibility: 'aligned',
    credibilityLabel: '원문 맥락 일치',
    stanceA: {
      summary: [
        '연간 발전량 통계와 문단의 10% 서술이 같은 기준을 쓴다.',
        '태양광 비중 확대가 증가분의 대부분을 설명한다.',
        '수력은 제외한 신재생 합계로 읽어도 방향이 같다.',
      ],
      sources: [
        { label: '모의 출처 · 전력통계 연보', url: 'https://example.com/scrollfact/power-yearbook' },
        { label: '모의 출처 · 에너지 백서 요약', url: 'https://example.com/scrollfact/energy-brief' },
      ],
    },
    stanceB: {
      summary: [
        '설비용량 기준 비중과 실제 발전량을 섞으면 수치가 커진다.',
        '출력 제한이 걸린 시간은 합계에서 빠질 수 있다.',
        '같은 해 통계도 잠정치와 확정치의 차이가 있다.',
      ],
      sources: [
        { label: '모의 출처 · 설비와 발전량 구분', url: 'https://example.com/scrollfact/capacity-vs-output' },
        { label: '모의 출처 · 잠정치 개정 기록', url: 'https://example.com/scrollfact/revision-note' },
      ],
    },
    terms: [
      { word: '발전 비중', explanation: '실제로 생산한 전력량 가운데 재생에너지가 차지하는 비율이다.' },
      { word: '설비용량', explanation: '발전기가 낼 수 있는 최대 출력이며, 실제 발전량과는 다르다.' },
      { word: '잠정치', explanation: '나중에 확정 통계로 고쳐질 수 있는 임시 집계다.' },
    ],
  },
  {
    trustScore: 73,
    keyClaim: '수도권 인구가 전체의 절반을 넘긴 상태가 10년째 유지됐다는 주장이다.',
    credibility: 'aligned',
    credibilityLabel: '원문 맥락 일치',
    stanceA: {
      summary: [
        '주민등록인구 기준으로 수도권 비중은 50%를 넘는다.',
        '서울은 줄고 경기가 늘어 합계가 유지된 흐름과 맞다.',
        '연말 기준 통계와 문단의 비교 시점도 어긋나지 않는다.',
      ],
      sources: [
        { label: '모의 출처 · 주민등록 인구 연보', url: 'https://example.com/scrollfact/population-yearbook' },
      ],
    },
    stanceB: {
      summary: [
        '생활인구나 주간 인구를 쓰면 절반이라는 경계가 달라진다.',
        '외국인 포함 여부에 따라 비중 소수점가 움직인다.',
        '행정구역 개편 전후를 한 시계열로 잇기 어렵다.',
      ],
      sources: [
        { label: '모의 출처 · 생활인구 설명', url: 'https://example.com/scrollfact/daytime-population' },
        { label: '모의 출처 · 집계 기준 비교', url: 'https://example.com/scrollfact/population-criteria' },
      ],
    },
    terms: [
      { word: '주민등록인구', explanation: '주민등록표에 주소를 둔 사람을 센 공식 인구다.' },
      { word: '생활인구', explanation: '밤에 사는 사람 대신, 낮에 그 지역에서 활동하는 사람을 센 인구다.' },
    ],
  },
  {
    trustScore: 55,
    keyClaim: '전기차 보조금이 줄면서 지난해 신규 등록이 40% 감소했다는 문장이다.',
    credibility: 'insufficient',
    credibilityLabel: '출처 미흡',
    stanceA: {
      summary: [
        '보조금 단가 인하와 등록 감소가 같은 해에 겹친 것은 사실이다.',
        '국내 등록 대수는 전년보다 줄었다는 방향 자체는 맞다.',
        '다만 문단은 감소 원인을 보조금 하나로 좁혀 말한다.',
      ],
      sources: [
        { label: '모의 출처 · 자동차 등록 현황', url: 'https://example.com/scrollfact/ev-registration' },
      ],
    },
    stanceB: {
      summary: [
        '40%는 특정 분기를 연간 수치처럼 옮긴 값에 가깝다.',
        '차종 혼합과 수입차 포함 범위가 원문과 다를 수 있다.',
        '충전 인프라와 금리 효과를 빼면 원인 설명이 부족하다.',
      ],
      sources: [
        { label: '모의 출처 · 분기·연간 집계 차이', url: 'https://example.com/scrollfact/ev-quarter' },
        { label: '모의 출처 · 수요 요인 메모', url: 'https://example.com/scrollfact/ev-demand' },
      ],
    },
    terms: [
      { word: '보조금 단가', explanation: '차 한 대에 지급하는 지원 금액이다.' },
      { word: '신규 등록', explanation: '그 기간에 처음으로 번호판을 받은 차량 수다.' },
    ],
  },
  {
    trustScore: 41,
    keyClaim: '국공립대 평균 등록금이 10년간 사실상 동결됐다는 요약은 범위가 넓다.',
    credibility: 'caution',
    credibilityLabel: '주의 필요',
    stanceA: {
      summary: [
        '국립대 학부 등록금은 물가와 달리 명목 금액이 거의 제자리다.',
        '대학알리미의 평균값도 큰 폭의 인상을 보여 주지 않는다.',
        '문단의 동결이라는 표현은 명목 등록금에 한정하면 통한다.',
      ],
      sources: [
        { label: '모의 출처 · 등록금 공시 평균', url: 'https://example.com/scrollfact/tuition-average' },
      ],
    },
    stanceB: {
      summary: [
        '사립대와 대학원, 의대 정원을 넣으면 평균이 올라간다.',
        '입학금 폐지 전후를 빼면 학생이 낸 총액은 다르게 보인다.',
        '실질 부담은 물가를 반영하면 동결이라고 보기 어렵다.',
      ],
      sources: [
        { label: '모의 출처 · 사립대 포함 평균', url: 'https://example.com/scrollfact/private-tuition' },
        { label: '모의 출처 · 실질 부담 환산', url: 'https://example.com/scrollfact/real-tuition' },
      ],
    },
    terms: [
      { word: '명목 등록금', explanation: '물가 변화를 빼지 않은, 고지서에 적힌 금액이다.' },
      { word: '실질 부담', explanation: '물가를 반영했을 때 학생이 실제로 느끼는 비용이다.' },
    ],
  },
  {
    trustScore: 27,
    keyClaim: '국내 미세먼지 고농도 일의 대부분이 국외 유입 때문이라는 단정은 근거가 약하다.',
    credibility: 'caution',
    credibilityLabel: '주의 필요',
    stanceA: {
      summary: [
        '서풍이 강한 날 국외 기여율이 높게 나온 사례는 있다.',
        '문단이 인용한 사례 연구의 수치 자체는 보도문과 같다.',
        '특정 사례를 연간 대부분으로 일반화해 서술하고 있다.',
      ],
      sources: [
        { label: '모의 출처 · 사례일 기여율', url: 'https://example.com/scrollfact/dust-episode' },
      ],
    },
    stanceB: {
      summary: [
        '연평균으로 보면 국내 배출 기여가 사례일보다 크다.',
        '측정소와 모델이 다르면 국외 비중 추정치가 크게 갈린다.',
        '대부분이라는 표현을 뒷받침하는 연간 통계는 비어 있다.',
      ],
      sources: [
        { label: '모의 출처 · 연평균 기여율', url: 'https://example.com/scrollfact/dust-annual' },
        { label: '모의 출처 · 모델 간 편차', url: 'https://example.com/scrollfact/dust-models' },
      ],
    },
    terms: [
      { word: '기여율', explanation: '미세먼지 농도 가운데 특정 원인 지역이 차지하는 비율이다.' },
      { word: '고농도 일', explanation: '먼지 농도가 기준을 넘은 날이며, 연평균과는 다른 집계다.' },
    ],
  },
]

export function getAnalysisForIndex(index: number): ParagraphAnalysis {
  const length = mockAnalyses.length
  const safeIndex = ((index % length) + length) % length
  return mockAnalyses[safeIndex] ?? mockAnalyses[0]
}

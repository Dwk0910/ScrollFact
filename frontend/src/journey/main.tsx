import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Journey } from './Journey'
import type { JourneyData } from './types'
import './journey.css'

// 데모 입력과 예상 백엔드 출력은 이 루트 한 곳에서만 관리합니다.
// 실제 AI 호출 없이 아래 예시와 정확히 일치하는 초안에만 준비된 설명을 보여줍니다.
declare global {
  interface Window { SCROLLFACT_JOURNEY_DEMO: JourneyData }
}
window.SCROLLFACT_JOURNEY_DEMO = {
  document: {
    title: '수업 중 휴대전화 보관,\n어떻게 운영하나요?',
    publisher: '가상 한빛고등학교 · 학생생활부',
    url: 'school.example/notices/phone-policy',
    date: '가상 공지 · 데모 자료',
  },
  passages: [
    {
      id: 'scope', title: '보관하는 시간은 수업 중입니다',
      text: '학생들은 수업 중 휴대전화를 교실 보관함에 보관합니다. 쉬는 시간과 점심시간에는 사용할 수 있습니다. 이번 운영은 학교에 머무는 모든 시간의 사용을 제한하는 규정이 아닙니다.',
      highlight: '수업 중',
      context: '이 공지는 수업 시간과 쉬는 시간을 구분합니다. 다른 곳에 전달할 때 이 범위를 함께 담으면 뜻이 달라지는 것을 줄일 수 있어요.',
      question: '수업 시간 외에도 보관해야 하는 상황이 있나요?',
    },
    {
      id: 'exceptions', title: '건강상 필요와 긴급 상황은 예외가 있습니다',
      text: '건강 관리에 기기를 사용해야 하는 학생은 담당 교사와 협의하여 예외를 신청할 수 있습니다. 긴급 연락이 필요한 경우에는 교사에게 알린 뒤 휴대전화를 사용할 수 있습니다.',
      highlight: '예외를 신청할 수 있습니다',
      context: '예외 조항은 있지만, 신청에 걸리는 시간이나 교사가 자리에 없을 때의 절차는 이 문단에 적혀 있지 않습니다.',
      question: '교사가 자리에 없을 때 긴급 연락은 어떻게 하나요?',
    },
    {
      id: 'purpose', title: '수업 집중을 위한 2주간의 시범 운영입니다',
      text: '이번 방안은 수업 중 알림과 촬영으로 인한 불편을 줄이기 위한 2주간의 시범 운영입니다. 보관함 관리 방식과 기기 분실·파손 시 처리 절차는 시범 운영 전에 별도 안내할 예정입니다.',
      highlight: '별도 안내할 예정',
      context: '운영 목적과 시범 기간은 명시되어 있어요. 분실·파손 처리 절차는 아직 이 공지에서 확인할 수 없습니다.',
      question: '분실이나 파손이 생기면 누가 어떻게 처리하나요?',
    },
    {
      id: 'feedback', title: '시범 운영 후 의견을 듣습니다',
      text: '시범 운영이 끝난 뒤 학생과 교사의 의견을 모아 운영 방식을 조정할 예정입니다. 불편했던 상황과 개선 제안은 학생회 의견함에 남길 수 있습니다.',
      highlight: '운영 방식을 조정할 예정',
      context: '의견을 받는 창구는 안내되어 있지만, 어떤 기준으로 조정할지는 적혀 있지 않아요. 찬반과 함께 구체적인 개선 조건을 제안할 수도 있습니다.',
      question: '어떤 의견이 운영 방식에 반영되는지 공개하나요?',
    },
  ],
  conversation: {
    author: '익명 학생 · 가상 게시글',
    title: '휴대전화 보관, 다들 어떻게 생각해?',
    text: '집중하자는 취지는 알겠는데, 급하게 가족한테 연락해야 하면 어떡하지? 공지를 읽어도 실제로 어떻게 되는 건지 궁금해.',
  },
  examples: [
    {
      id: 'scope', label: '① 범위가 달라진 전달', purpose: '공지 내용을 전달하며 우려 말하기',
      draft: '학교가 하루 종일 휴대폰을 못 쓰게 한대. 예외도 전혀 없다고 하니까 걱정돼. 긴급하게 가족에게 연락할 때는 어떻게 해야 할까?',
      points: [
        { phrase: '하루 종일', title: '전달한 범위가 원문보다 넓어요', sourceId: 'scope', explanation: '원문은 수업 중 보관을 안내하고, 쉬는 시간과 점심시간 사용을 허용합니다. 정책에 대한 의견과 별개로 적용 시간을 확인해 보세요.' },
        { phrase: '예외도 전혀 없다고', title: '함께 확인할 예외 조항이 있어요', sourceId: 'exceptions', explanation: '공지에는 건강상 필요와 긴급 연락에 관한 예외가 있습니다. 다만 구체적인 운영 절차까지 모두 설명하지는 않습니다.' },
        { phrase: '긴급하게 가족에게 연락', title: '우려는 그대로, 절차를 질문할 수 있어요', sourceId: 'exceptions', missing: true, explanation: '교사에게 알린 뒤 사용할 수 있다고 적혀 있지만, 교사가 없는 상황은 설명되지 않았습니다. 이 부분은 답을 단정하지 않고 질문으로 남길 수 있어요.' },
      ],
      alternatives: [
        { label: '우려를 유지하며 전달하기', text: '공지에는 수업 중 보관하고, 쉬는 시간에는 사용할 수 있다고 되어 있어. 긴급 연락 예외도 있지만, 교사가 자리에 없을 때 어떻게 연락할 수 있는지는 걱정돼. 구체적인 절차를 안내해 주면 좋겠어.' },
        { label: '확인 질문으로 이어가기', text: '긴급 연락은 교사에게 알린 뒤 가능하다고 읽었어. 그런데 교사가 자리에 없을 때는 어떻게 해야 할까? 예외 절차를 함께 확인해 보면 좋겠어.' },
      ],
    },
    {
      id: 'opinion', label: '② 사실을 알아도 반대할 때', purpose: '반대 의견을 설명하기',
      draft: '수업 중에만 보관하고 긴급 연락 예외가 있다는 건 읽었어. 그래도 매번 허락을 받아야 한다는 점이 불편해서 이 방식에는 반대해.',
      points: [
        { phrase: '수업 중에만 보관', title: '원문의 적용 범위와 연결돼요', sourceId: 'scope', explanation: '수업 시간에 보관한다는 설명을 원문에서 확인할 수 있어요. 원문 내용을 확인하는 것과 정책에 동의하는 것은 별개의 선택입니다.' },
        { phrase: '이 방식에는 반대해', title: '반대 의견을 바꿀 필요는 없어요', sourceId: 'exceptions', explanation: '절차가 불편하다는 본인의 판단을 표현하고 있어요. 원하는 개선 조건을 덧붙이면 상대가 무엇을 논의해야 하는지 더 구체적으로 알 수 있습니다.' },
      ],
      alternatives: [
        { label: '반대 이유를 구체적으로', text: '수업 중 보관과 긴급 연락 예외는 확인했어. 하지만 긴급한 상황에도 교사에게 먼저 알려야 한다는 절차가 불편해서 현재 방식에는 반대해. 교사가 없을 때도 바로 연락할 수 있는 절차가 필요하다고 생각해.' },
      ],
    },
    {
      id: 'unknown', label: '③ 자료에 답이 없을 때', purpose: '확인되지 않은 내용을 질문하기',
      draft: '보관함에서 휴대폰이 망가지면 학교가 전액 배상해 준대. 그러면 분실이나 파손은 걱정 안 해도 되겠지?',
      points: [
        { phrase: '학교가 전액 배상해 준대', title: '이 자료만으로 배상 여부를 알 수 없어요', sourceId: 'purpose', missing: true, explanation: '공지에는 처리 절차를 별도 안내할 예정이라고만 적혀 있습니다. 전액 배상 여부나 책임 주체를 이 문서에서 확인할 수 없어요.' },
        { phrase: '걱정 안 해도 되겠지', title: '확인할 조건을 남겨둘 수 있어요', sourceId: 'purpose', missing: true, explanation: '보관 방법과 분실·파손 절차를 확인한 뒤 판단할 수 있습니다. 자료에 없는 보장 내용을 만들어 채우지 않습니다.' },
      ],
      alternatives: [
        { label: '판단을 보류하고 질문하기', text: '공지에는 분실·파손 처리 절차를 따로 안내한다고 되어 있어. 보관 중 문제가 생기면 누가 어떻게 처리하는지, 배상 기준이 있는지 먼저 확인하고 싶어.' },
      ],
    },
  ],
}
createRoot(document.getElementById('root')!).render(
  <StrictMode><Journey data={window.SCROLLFACT_JOURNEY_DEMO} /></StrictMode>,
)

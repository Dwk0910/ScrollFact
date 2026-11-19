import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Footnotes } from './Footnotes'
import type { FootnotesDemo } from './types'
import './footnotes.css'

// 가상 페이지와 예상 분석 결과는 이 루트 파일에서만 관리합니다.
// 실제 AI 호출·외부 전송·SNS 연동 없이 스크롤 연결 경험을 검토하는 데모입니다.
declare global { interface Window { SCROLLFACT_FOOTNOTES_DEMO: FootnotesDemo } }
window.SCROLLFACT_FOOTNOTES_DEMO = {
  scenarios: [
    {
      id: 'weekend', tab: '동네 공지', category: 'WEEKEND LETTER', publisher: '느티나무 마켓', initials: 'n.',
      kicker: '이웃과 보내는 조금 다른 토요일', title: '가볍게 오세요.\n입장은 무료입니다.',
      lead: '작은 브랜드, 갓 내린 커피, 느린 음악. 이번 주말에는 가까운 곳에서 새로운 취향을 만나보세요.',
      visualTitle: 'A little\nweekend.', visualSub: 'NEIGHBORHOOD MARKET · VOL. 06',
      facts: [{ label: '언제', value: '토요일 13:00—18:00' }, { label: '어디서', value: '느티나무 문화창고' }, { label: '함께', value: '동네의 작은 브랜드 24팀' }],
      sourceId: 'admission', sourceTitle: '방문 전에 확인해 주세요',
      sourceQuote: '사전 신청자에 한해 입장료가 무료입니다. 미신청 방문객의 현장 입장료는 5,000원입니다.',
      sourceMore: '신청은 금요일 오후 6시에 마감합니다. 식음료와 판매 물품은 입장료에 포함되지 않습니다.',
      paragraphs: [
        { title: '서두르지 않아도 좋은 하루', body: '직접 만든 컵부터 오래 함께할 작은 소품까지. 물건을 만든 사람과 이야기를 나누고, 마음에 드는 자리에서 잠깐 쉬어가세요.' },
        { title: '가벼운 마음으로, 함께', body: '입구에서 안내 지도를 받아 자유롭게 둘러볼 수 있습니다. 개인 컵과 장바구니를 가져오셔도 좋아요. 반려동물은 야외 공간에서 함께할 수 있습니다.' },
      ],
      headlineNoteId: 'free-condition',
      notes: [{ id: 'free-condition', kind: 'condition', label: '무료 입장의 조건', sourceId: 'admission',
        quote: '사전 신청자에 한해 입장료가 무료입니다. 미신청 방문객의 현장 입장료는 5,000원입니다.',
        summary: '사전 신청자 무료 · 현장 입장 5,000원',
        detail: '같은 공지의 방문 안내에 적힌 조건이에요. “무료”가 적용되는 범위를 함께 확인할 수 있어요.' }],
      comments: [
        { id: 'coffee', author: 'slow.sunday', text: '커피 마시면서 구경하기 좋겠다 ☕', time: '12분 전' },
        { id: 'free-question', author: 'one.weekend', text: '그냥 가면 무료인 거죠?', time: '8분 전', noteId: 'free-condition' },
        { id: 'friend', author: 'after.five', text: '친구랑 토요일 오후에 가보려고요.', time: '3분 전' },
      ],
    },
    {
      id: 'library', tab: '뉴스 기사', category: 'LOCAL JOURNAL', publisher: '우리동네 저널', initials: 'j.',
      kicker: '생활 · 지역 소식', title: '시립도서관,\n다음 달 이용료 조정.',
      lead: '시립도서관이 다음 달부터 일부 시설의 이용 요금을 조정합니다. 운영 방식과 적용 대상을 살펴봤습니다.',
      visualTitle: 'Room for\neveryone.', visualSub: 'THE PUBLIC LIBRARY · OUR COMMON GROUND',
      facts: [{ label: '분야', value: '지역 · 공공시설' }, { label: '시행', value: '다음 달 1일부터' }, { label: '자료', value: '시립도서관 운영 안내' }],
      sourceId: 'scope', sourceTitle: '어떤 이용료가 달라지나요?',
      sourceQuote: '이번 조정은 외부 기관의 행사장 대관료에만 적용됩니다. 일반 시민의 도서 대출과 열람실 이용은 계속 무료입니다.',
      sourceMore: '기존 이용자의 회원 자격과 대출 권수는 바뀌지 않습니다. 대관 신청 절차는 도서관 안내 창구에서 확인할 수 있습니다.',
      paragraphs: [
        { title: '공간을 운영하는 비용', body: '도서관은 행사장 관리와 장비 유지에 필요한 비용을 반영했다고 설명했습니다. 기관이 행사 공간을 빌릴 때 적용되는 세부 요금표도 함께 공개했습니다.' },
        { title: '일상의 도서관은 계속됩니다', body: '주말 독서 모임과 어린이 책 읽기 프로그램은 기존 일정대로 운영됩니다. 자세한 프로그램 안내는 도서관 게시판에서 확인할 수 있습니다.' },
      ],
      headlineNoteId: 'fee-scope',
      notes: [{ id: 'fee-scope', kind: 'scope', label: '요금 조정의 적용 범위', sourceId: 'scope',
        quote: '이번 조정은 외부 기관의 행사장 대관료에만 적용됩니다. 일반 시민의 도서 대출과 열람실 이용은 계속 무료입니다.',
        summary: '기관 대관료만 조정 · 대출과 열람실은 무료',
        detail: '기사 본문에서 적용 대상을 구분하고 있어요. 제목과 이 조건을 연결해 읽을 수 있어요.' }],
      comments: [
        { id: 'reading', author: 'paper.days', text: '지난주에도 열람실 잘 이용했어요.', time: '20분 전' },
        { id: 'fee-question', author: 'book.walk', text: '이제 책 빌리는 데도 돈을 받는 건가요?', time: '11분 전', noteId: 'fee-scope' },
        { id: 'program', author: 'little.library', text: '주말 프로그램 소식도 궁금하네요.', time: '5분 전' },
      ],
    },
    {
      id: 'moss', tab: '커뮤니티', category: 'COMMUNITY POST', publisher: '모스 월드', initials: 'm.',
      kicker: '함께 만드는 세계 · 새 이웃 모집', title: '우리의 다음 세계,\n같이 만들어볼까요?',
      lead: '느긋하게 집을 짓고, 함께 모험할 이웃을 찾습니다. 처음 시작하는 분도 환영해요.',
      visualTitle: 'Build\nsomething good.', visualSub: 'MOSS WORLD · SEASON 04',
      facts: [{ label: '플레이', value: '생존 · 건축 · 함께하는 모험' }, { label: '분위기', value: '서로의 속도를 존중해요' }, { label: '참여', value: '프로필의 참여 안내 확인' }],
      sourceId: 'edition', sourceTitle: '접속 환경 안내',
      sourceQuote: 'Minecraft Java Edition 1.21.1 서버입니다.',
      sourceMore: '접속 주소는 참여 안내에서 확인해 주세요. 업데이트 일정과 서버 점검 소식도 같은 곳에 안내합니다.',
      paragraphs: [
        { title: '작은 집에서 시작해도 좋아요', body: '커다란 성을 지어도, 작은 텃밭을 가꿔도 괜찮아요. 서로의 건축물을 존중하며 천천히 마을을 넓혀갑니다.' },
        { title: '모험은 함께하면 더 즐거우니까', body: '혼자 찾기 어려웠던 장소에 같이 가고, 멋진 풍경을 발견하면 공유해 주세요. 주말에는 원하는 분들과 함께 탐험할 예정입니다.' },
      ],
      notes: [{ id: 'mobile-unknown', kind: 'unknown', label: '본문에서 확인할 수 있는 범위', sourceId: 'edition',
        quote: 'Minecraft Java Edition 1.21.1 서버입니다.',
        summary: 'Java Edition 서버 · 모바일 지원 여부는 미기재',
        detail: '이 글에는 모바일 교차 접속 지원 여부가 적혀 있지 않아요. 본문만으로 접속 가능·불가능을 단정할 수 없어요.' }],
      comments: [
        { id: 'build', author: 'stone.zip', text: '집 짓는 거 좋아하는데 분위기 좋네요 🌱', time: '18분 전' },
        { id: 'mobile', author: 'pixel.walk', text: '모바일로 되나요?', time: '7분 전', noteId: 'mobile-unknown' },
        { id: 'hello', author: 'green.block', text: '첫 마을에는 나무를 많이 심고 싶어요.', time: '2분 전' },
      ],
    },
  ],
}
createRoot(document.getElementById('root')!).render(<StrictMode><Footnotes data={window.SCROLLFACT_FOOTNOTES_DEMO}/></StrictMode>)

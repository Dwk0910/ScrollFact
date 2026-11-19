import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Feed } from './Feed'
import type { FeedData } from './context'
import './feed.css'

// 모든 가상 게시물 / 질문 패턴 / 예상 백엔드 응답은 루트 한 곳에서 관리합니다.
// 실제 AI, 인스타그램 연동, 외부 전송은 없습니다.
declare global { interface Window { SCROLLFACT_FEED_DEMO: FeedData } }
window.SCROLLFACT_FEED_DEMO = {
  focusPostId: 'moss',
  trails: [{
    id: 'mobile-context', postId: 'moss', sourceAuthor: 'moss.world', unknownQuestion: '이 서버도 모바일 접속을 지원하나요?', commentAuthor: 'pixel.walk', comment: '모바일로 되나요?',
    sourceQuote: 'Minecraft Java Edition 1.21.1 서버입니다.',
    steps: [
      { kind: 'question', label: '출발한 댓글', title: '이 질문은\n어디에서 시작됐을까요?', body: '짧은 댓글 한 줄. 그 말과 연결된 내용을 조금 더 따라가 봅니다.' },
      { kind: 'source', label: '게시물 원문', title: '설명에는\n이렇게 적혀 있어요.', body: '게시자가 적어둔 서버의 종류와 버전입니다. 먼저 원문에서 확인되는 내용부터 살펴봅니다.' },
      { kind: 'explanation', label: '추가 근거와 쉬운 설명', title: '같은 마인크래프트,\n다른 에디션.', body: 'Java Edition은 PC용이고, 모바일에서는 Bedrock Edition을 사용해요. 에디션 이름을 읽었다고 접속 조건까지 바로 알 수 있는 것은 아니에요.' },
      { kind: 'unknown', label: '아직 확인되지 않은 것', title: '설명은 있었지만,\n답은 아직 없었어요.', body: '이 게시물에는 모바일 교차 접속을 지원하는지 적혀 있지 않아요. 원문을 읽은 뒤에도 운영자에게 물어볼 수 있는 질문입니다.' },
    ],
    editions: [{ name: 'Java Edition', device: 'PC · Windows / macOS / Linux' }, { name: 'Bedrock Edition', device: '모바일 · Android / iOS 등' }],
    bridge: 'Geyser 같은 연결 도구를 서버에 설정하면 두 에디션 사이의 접속이 가능할 수도 있어요. 이 서버에 설정되어 있는지는 별도 확인이 필요합니다.',
    questionSuggestion: 'Java Edition 서버라고 되어 있는데, 모바일(Bedrock) 접속도 지원하나요?',
    replySuggestion: '설명에는 Java Edition 서버라고 되어 있어요. 다만 모바일 교차 접속을 지원하는지는 안내가 없어서 운영자에게 확인해 보면 좋겠어요.',
    links: [{ title: 'Minecraft 공식 에디션 안내', url: 'https://www.minecraft.net/en-us/article/java-or-bedrock-edition' }, { title: 'Geyser 교차 접속 안내', url: 'https://geysermc.org/' }],
  }],
  posts: [
    { id:'moss', account:'moss.world', name:'모스 월드', avatar:'M', kind:'game', label:'스폰서 · 가상 광고',
      title:'우리의 다음 세계는,\n함께 만드는 곳.', subtitle:'MOSS WORLD / SEASON 04',
      captions:['느긋하게 집도 짓고, 같이 모험할 이웃을 찾습니다. 🌲','Minecraft Java Edition 1.21.1 서버입니다.','초보자도 환영해요. 참여 안내는 프로필에서 확인하세요.'],
      tags:'#마인크래프트 #야생서버 #함께만드는세계', likes:248,
      comments:[{author:'stone.zip',text:'집 짓는 거 좋아하는데 분위기 좋네요 🌱'}], example:'모바일로 되나요?' },
    { id:'weekend', account:'weekend.club', name:'주말의 취향', avatar:'W', kind:'market', label:'추천 게시물 · 가상 행사',
      title:'가볍게 와요.\n좋아하는 것만 들고.', subtitle:'WEEKEND MARKET / VOL. 06',
      captions:['이번 토요일, 함께 만드는 작은 동네 마켓.','입장은 무료이며, 사전 신청 없이 현장에서 참여할 수 있습니다.','오후 1시부터 5시까지, 느티나무 공원에서 만나요.'],
      tags:'#주말마켓 #동네산책 #작은취향', likes:86,
      comments:[{author:'slow.sunday',text:'산책하다 들러야겠다!'}], example:'신청해야 하나요?' },
    { id:'light', account:'after.five', name:'다섯 시 이후', avatar:'a', kind:'photo', label:'추천 게시물 · 가상 사진',
      title:'잠깐,\n멈춰도 좋은 시간.', subtitle:'LITTLE MOMENTS / 17:42',
      captions:['걷다가 만난 빛. 오늘 하루는 어땠나요?'], tags:'#일상의기록 #오후의빛', likes:132,
      comments:[{author:'one.day',text:'색감이 정말 따뜻하네요.'}], example:'사진 너무 좋네요!' },
  ],
  reviewRules: [
    {
      id: 'mocking-reader',
      sentencePattern: '^(?:(?:뭐|아니)[,，]?\\s*)?(?:(?:너는?|넌|님은?|당신은?)\\s*)?눈(?:이|은)?\\s*없(?:냐|나|니|어요|습니까)[.!?。！？]*$',
      reason: '정보를 확인하는 대신 상대가 글을 읽을 능력이 없는 것처럼 비꼬는 표현으로 받아들여질 수 있어요.',
    },
    {
      id: 'direct-insult',
      sentencePattern: '^(?:너는?|넌|님은?|당신은?)\\s*(?:진짜\\s*)?(?:멍청(?:하네|하냐|하다)|바보(?:냐|네|다))[.!?。！？]*$',
      reason: '의견이나 내용을 비판하기보다 상대 자체를 낮춰 부르는 표현이 포함되어 있어요.',
    },
    {
      id: 'silencing',
      sentencePattern: '^(?:(?:모르면|그냥|걍|너는?|넌)\\s*)?닥쳐(?:라)?[.!?。！？]*$',
      reason: '상대에게 말을 멈추라고 강하게 요구해 대화가 비난으로 번질 수 있어요.',
    },
  ],
  reviewExamples: [
    { label: '비난 표현 예시', draft: '너는 눈이 없냐? 설명 좀 읽어라.', shouldReview: true },
    { label: '직접적인 모욕', draft: '너는 진짜 멍청하네.', shouldReview: true },
    { label: '대화를 막는 표현', draft: '모르면 닥쳐.', shouldReview: true },
    { label: '일반 질문', draft: '모바일로 되나요?', shouldReview: false },
    { label: '반대 의견', draft: '이 운영 방식에는 반대해요. 설명이 더 필요합니다.', shouldReview: false },
    { label: '강한 내용 비판', draft: '이 설명은 틀렸고 동의할 수 없습니다.', shouldReview: false },
    { label: '인용한 표현 비판', draft: '“너는 눈이 없냐?” 같은 말은 하지 맙시다.', shouldReview: false },
    { label: '감상', draft: '사진 너무 좋네요!', shouldReview: false },
  ],
  responses: [
    { id:'mobile', postId:'moss', topic:'모바일|휴대폰|핸드폰|폰으로|베드락|bedrock|아이폰|안드로이드', question:'되|가능|지원|접속|참여|할 수|인가|나요|[?？]',
      quote:'Minecraft Java Edition 1.21.1 서버입니다.', title:'모바일 접속은 한 가지 더 확인하면 돼요',
      summary:'설명에는 Java Edition 서버라고 적혀 있어요. 모바일 접속 지원 여부는 따로 확인이 필요해요.',
      explanation:'Java Edition은 PC용 에디션이에요. 모바일은 Bedrock Edition을 사용하지만, Geyser 같은 연결 도구를 설치한 Java 서버에는 접속할 수도 있어요.',
      uncertainty:'이 게시물에는 그런 연결 기능을 지원하는지 적혀 있지 않아요. 이 서버의 접속 가능 여부는 운영자에게 확인해야 해요.',
      suggestion:'Java Edition 서버라고 되어 있는데, 모바일(Bedrock) 접속도 지원하나요?',
      links:[{title:'Minecraft 에디션 안내',url:'https://www.minecraft.net/en-us/article/java-or-bedrock-edition'},{title:'Geyser의 교차 접속 안내',url:'https://geysermc.org/'}] },
    { id:'signup', postId:'weekend', topic:'신청|예약|접수', question:'해야|필요|어떻게|어디|되|나요|[?？]',
      quote:'입장은 무료이며, 사전 신청 없이 현장에서 참여할 수 있습니다.', title:'바로 방문해도 된다고 안내되어 있어요',
      summary:'게시물에 사전 신청 없이 현장에서 참여할 수 있다고 적혀 있어요.',
      explanation:'이 행사 안내에는 사전 신청이 필요 없다고 명시되어 있어요. 별도로 궁금한 점이 있다면 그대로 질문해도 괜찮아요.',
      suggestion:'사전 신청 없이 방문해도 된다고 읽었어요. 혹시 현장 인원 제한도 있나요?', links:[] },
    { id:'price', postId:'weekend', topic:'입장료|무료|유료|돈|얼마', question:'인가|나요|얼마|내야|[?？]',
      quote:'입장은 무료이며, 사전 신청 없이 현장에서 참여할 수 있습니다.', title:'입장은 무료라고 안내되어 있어요',
      summary:'게시물에 무료 입장이라고 적혀 있어요. 판매 물품의 가격에 대한 안내는 없어요.',
      explanation:'입장료와 물품 구매 비용은 서로 다른 정보예요. 무료 입장이 모든 물품이나 체험의 무료 제공을 뜻하지는 않아요.',
      suggestion:'입장은 무료라고 읽었어요. 별도로 비용이 드는 체험도 있나요?', links:[] },
  ],
}
createRoot(document.getElementById('root')!).render(<StrictMode><Feed data={window.SCROLLFACT_FEED_DEMO}/></StrictMode>)

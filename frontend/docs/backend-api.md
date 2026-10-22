# ScrollFact 백엔드 API

프로토타입 패널이 모의 데이터로 채우는 문단 분석만 다룹니다. 로그인, JWT, 하드웨어는 이 명세에 없습니다.

서버 주소, 인증 헤더, 분석 결과 저장 방식은 아직 없습니다.

## 프론트가 이미 하는 일

분석 버튼을 누르면 콘텐츠 스크립트가 페이지에서 문단을 뽑습니다. 각 문단은 `id`(`sf-p-0` 형태), `index`, `text`입니다. 프론트는 `text`를 600자로 자릅니다. 같이 있는 값은 페이지 `url`, `title`, 현재 화면 문단입니다.

아래는 백엔드가 만들 필요가 없습니다. 프론트가 문단 텍스트와 신뢰 점수로 계산합니다.

- 읽기 전 요약, 이전·현재·다음 문단: 각 문단의 첫 문장.
- 읽기 진행, 남은 문단 수, 신뢰도 분포: 문단 수와 `trustScore`. 높음은 71 이상, 보통은 40–70, 낮음은 39 이하.
- 출처 목록: 문단별 출처를 URL로 중복 제거.

스크롤이 바뀔 때마다 서버를 다시 호출하지 않습니다. 오른쪽 목록이 모든 문단의 점수와 핵심 주장을 한꺼번에 보여 주기 때문입니다. 분석 버튼을 눌렀을 때 한 번 호출합니다.

## POST /v1/analyses

요청 본문은 프론트가 이미 가진 파싱 결과입니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `url` | 문자열 | 분석한 페이지 주소 |
| `title` | 문자열 | 페이지 제목 |
| `paragraphs` | 배열 | 문단 목록. `index`는 0부터이고, 배열 순서와 같습니다. |
| `paragraphs[].id` | 문자열 | 프론트가 붙인 문단 ID. 예: `sf-p-0` |
| `paragraphs[].index` | 정수 | 0부터 시작하는 순서 |
| `paragraphs[].text` | 문자열 | 문단 본문. 프론트가 600자로 자릅니다. 빈 문자열이면 안 됩니다. |

성공은 `200`과 JSON입니다. 필드 이름은 프론트 `ParagraphAnalysis`와 같습니다. 지금 모의 분석 자리에 그대로 넣습니다.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `analyses` | 배열 | 요청 문단과 같은 개수, 같은 순서 |
| `analyses[].paragraphId` | 문자열 | 요청 `id`와 같습니다. |
| `analyses[].trustScore` | 정수 | 0–100 |
| `analyses[].keyClaim` | 문자열 | 핵심 주장 |
| `analyses[].credibility` | 문자열 | `aligned`, `insufficient`, `caution` 중 하나 |
| `analyses[].credibilityLabel` | 문자열 | 화면에 그대로 보이는 문구. 예: `원문 맥락 일치`, `출처 미흡`, `주의 필요` |
| `analyses[].stanceA` | 객체 | 현재 글 관점 |
| `analyses[].stanceB` | 객체 | 대립 시각 |
| `analyses[].stanceA.summary` | 문자열 3개 | 관점 요약. `stanceB.summary`도 3개입니다. |
| `analyses[].stanceA.sources` | 배열 | `{ "label", "url" }`. `stanceB.sources`도 같습니다. URL은 `http` 또는 `https` |
| `analyses[].terms` | 배열 | `{ "word", "explanation" }`. 없으면 빈 배열 |

`paragraphId`가 요청 `id`와 다르거나 개수가 다르면 프론트는 그 응답을 쓰지 않습니다. 점수는 문단 순서가 아니라 그 문단의 `id`와 `text`에 묶입니다.

## 오류

실패 본문은 JSON입니다.

```json
{ "error": "사용자에게 보여줄 한국어 문장" }
```

프론트는 `error` 문장을 기존 오류 칸에 그대로 넣습니다.

| 상태 | 조건 |
| --- | --- |
| `400` | 본문이 비었거나 `paragraphs`가 없거나 `text`가 빈 문단이 있음 |
| `422` | 분석은 시도했으나 표시할 결과가 없음 |
| `500` | 그 밖의 서버 오류. `error`는 내부 원인을 노출하지 않는 짧은 문장 |

## 예시

성공 응답은 모의 데이터 첫 문단을 줄인 것입니다. 점수 86, `aligned`, 요약 3줄입니다. 출처와 용어는 각각 하나씩만 적었습니다.

요청:

```json
{
  "url": "https://example.com/article",
  "title": "재생에너지 발전 비중",
  "paragraphs": [
    {
      "id": "sf-p-0",
      "index": 0,
      "text": "2024년 국내 재생에너지 발전 비중이 처음 10%를 넘어섰다."
    }
  ]
}
```

`200`:

```json
{
  "analyses": [
    {
      "paragraphId": "sf-p-0",
      "trustScore": 86,
      "keyClaim": "2024년 국내 재생에너지 발전 비중이 처음 10%를 넘어섰다는 문단의 핵심 수치다.",
      "credibility": "aligned",
      "credibilityLabel": "원문 맥락 일치",
      "stanceA": {
        "summary": [
          "연간 발전량 통계와 문단의 10% 서술이 같은 기준을 쓴다.",
          "태양광 비중 확대가 증가분의 대부분을 설명한다.",
          "수력은 제외한 신재생 합계로 읽어도 방향이 같다."
        ],
        "sources": [
          {
            "label": "모의 출처 · 전력통계 연보",
            "url": "https://example.com/scrollfact/power-yearbook"
          }
        ]
      },
      "stanceB": {
        "summary": [
          "설비용량 기준 비중과 실제 발전량을 섞으면 수치가 커진다.",
          "출력 제한이 걸린 시간은 합계에서 빠질 수 있다.",
          "같은 해 통계도 잠정치와 확정치의 차이가 있다."
        ],
        "sources": [
          {
            "label": "모의 출처 · 설비와 발전량 구분",
            "url": "https://example.com/scrollfact/capacity-vs-output"
          }
        ]
      },
      "terms": [
        {
          "word": "발전 비중",
          "explanation": "실제로 생산한 전력량 가운데 재생에너지가 차지하는 비율이다."
        }
      ]
    }
  ]
}
```

`400`:

```json
{ "error": "분석할 문단이 없습니다." }
```

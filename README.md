# Suddenly Universe

공부·독서·강의 기록을 모은 정적 사이트입니다. 메인(`/`)은 우주 그림이고, 각 탭이 궤도를 도는 행성입니다. Study 탭은 Google 문서 「📚 공부 아카이브」를 대주제별 웹 페이지로 옮긴 것으로, 대주제는 한 권의 책, 메모는 그 책의 장으로 보여 줍니다.

## 페이지

메인과 네 탭이 있습니다. 모든 페이지 맨 위에 고정된 탭바가 있고, 왼쪽 ‘Suddenly Universe’ 로고를 누르면 메인으로 돌아갑니다.

- **메인**: `/`. 어두운 우주 배경에 가운데 ‘Suddenly Universe’, 그 둘레 궤도에 탭마다 행성 하나
- **Study**: 공부 아카이브. Study 홈(`/study/`), 책장, 주제, 장, 지식 지도, 콘텐츠별 요약, 연표, 검색
- **독서기록**: `/reading/` 아래의 분류별 책장(책등이 꽂힌 책장), 진행률·완독 연월, 책 상세와 메모 마인드맵
- **PoRA 로봇 자율성**: `/pora/`. Principles of Robot Autonomy 교재 바로가기와 공부 진도 체크리스트
- **장쉐친 게임이론**: `/game-theory/`. Predictive History 채널 장쉐친의 Game Theory 강의 #1~#29 회차별 요약

현재 탭이 강조되고, 탭 아래의 하위 메뉴와 바닥 메뉴는 그 탭의 페이지만 보여 줍니다. 검색은 Study 탭에 있고 공부 아카이브 내용만 찾습니다.

| 주소 | 내용 |
| --- | --- |
| `/` | 메인. 행성마다 다른 색·크기·궤도로 천천히 돌고, 올리거나 포커스하면 궤도가 멈추고 그 행성이 커지며 짧은 설명이 뜸. 누르거나 Enter로 그 탭으로 이동. `prefers-reduced-motion`이면 궤도와 별이 멈춤. 좁거나 낮은 화면에서는 행성을 세로로 늘어놓고 설명을 늘 보여 줌 |
| `/study/` | Study 홈. 책장 히어로, 최근 장, 숫자 카드, 아카이브 통계(책별 장 수·읽기 상태·날짜별 추가·태그 구름). 예전에는 `/`에 있었음 |
| `/library/` | 전체 책장. 주제 탭과 장 표지 그리드, `?q=검색어` 필터 |
| `/topics/<id>/` | 책 소개와 목차, 이 책의 숫자, 예상 대비 실제 비교 |
| `/items/<id>/` | 장 읽기 화면. 오른쪽 ‘이 페이지에서’ 목차, 그림, 핵심 정리, 확인 퀴즈, 이전/다음 장 |
| `/map/` | 지식 지도. 옵시디언 그래프 뷰 스타일의 연결 그래프(대주제 허브 · 콘텐츠 · 태그). 대주제마다 사이트 대주제 색과 같은 색조를 채도 낮게 써서 허브는 진하게, 콘텐츠는 연하게, 태그는 회색. 올리거나 누르면 이웃만 강조, 드래그·줌·패닝·핀치, 두 번 누르면 페이지로. 아래에 태그 색인 |
| `/summaries/` | 콘텐츠별 요약. 콘텐츠마다 날짜·대주제·소주제·핵심 요약·출처 링크·태그·상태. 대주제별로 묶어 최신순, 대주제 필터와 검색(`?topic=`, `?q=`) |
| `/figures/`, `/numbers/` | 예전 숫자 모음 주소. `/summaries/`로 리다이렉트 |
| `/timeline/` | 연표. 날짜별 추가 그래프, 책×날짜 표, 날짜별 장 목록 |
| `/reading/` | 독서 기록 개요. 숫자 줄, 분류별 책장 미리보기(책등), 지금 읽는 책 표, 최근 기록 표 |
| `/reading/<분류>/` | 분류 책장. 책이 책등으로 꽂힌 책장(두께=쪽수, 색=표지에서 뽑은 색, 없으면 분류 색). 한 선반이 넘치면 아래 선반이 생김. 책등에 올리거나 포커스하면 표지·진행률(읽는 중)·완독 년월 툴팁, 누르면 책 상세. 아래에 책 목록 표 |
| `/pora/` | PoRA 교재 소개, 바로가기 카드(새 탭), 공부 진도 체크리스트. 체크 상태는 브라우저 localStorage(`pora:<id>`)에 저장하고 진행률 %를 보여 줌. 좁은 화면에서는 탭 이름이 `PoRA`로 줄어듦 |
| `/game-theory/` | 장쉐친 게임이론 시리즈 소개(채널·재생목록 링크), #번호 순 회차 카드(번호·제목·날짜·길이·핵심 개념·요약 첫 문장), 검색(`?q=`). 맨 위에 ‘사실 검증된 내용이 아님’ 고지. 좁은 화면에서는 탭 이름이 `게임이론`으로 줄어듦 |
| `/game-theory/<번호>/` | 회차 상세. YouTube 영상(누르면 재생)·링크, 날짜·길이, 요약, 핵심 포인트, 핵심 개념(누르면 목록에서 검색), 이전/다음 회차. 영상 설명만으로 요약한 회차는 따로 표시하고, 재업로드 영상이 있으면 그 링크도 보여 줌 |
| `/reading/books/<id>/` | 책 상세. 교보문고 기준 서지 정보(분류·출판사·출간일·쪽수·ISBN), 교보문고 링크, 메모 마인드맵, 쪽수 기록 |

https://suddenlyslowly.github.io/study-archive/

## 메인 행성 (탭 추가)

메인의 행성과 맨 위 탭바는 둘 다 [`data/planets.json`](data/planets.json)에서 만듭니다. 사이트 이름(`name`)과 메인 문구(`tagline`)도 여기 있습니다. 새 탭을 만들면 그 페이지를 `scripts/build.mjs`에서 만든 뒤 `planets`에 한 줄 더하면 메인 궤도와 탭바에 함께 나타납니다. 배열 순서가 탭 순서이자 키보드 이동 순서입니다.

| 필드 | 내용 | 예 (독서기록) |
| --- | --- | --- |
| `id` | 탭 id. 페이지의 `tab` 값과 같아야 탭이 강조됨 | `reading` |
| `label` | 행성·탭 이름 | `독서기록` |
| `short` | 좁은 화면 탭 이름. `label`의 앞이나 뒤 부분 | `독서기록` |
| `href` | 사이트 루트 기준 상대 폴더, `/`로 끝남 | `reading/` |
| `desc` | 올렸을 때 보이는 짧은 설명 | `분류별 책장에 꽂아 둔 책, 진행률과 완독한 달` |
| `color` | 행성 색. 채도 낮은 `#rrggbb` | `#cdb291` |
| `size` | 행성 지름(px, 860px 무대 기준) 24~80 | `50` |
| `orbit` | 궤도 지름 / 무대 크기, 0.4~0.96. 행성마다 다르게 | `0.62` |
| `angle` | 시작 각도(도), 0~360. 0이 12시 방향 | `70` |
| `period` | 한 바퀴 도는 초, 30~600 | `190` |
| `ring` | `true`면 고리를 두름 (선택) | |

- 빌드가 형식을 검사합니다. 필드가 비었거나 범위를 벗어나거나, `id`가 겹치거나, `href`가 가리키는 페이지가 만들어지지 않았으면 실패합니다.

## 내용 고치기

본문은 [`data/archive.json`](data/archive.json)에 있습니다. 항목을 고친 뒤 사이트를 다시 만듭니다.

```bash
node scripts/build.mjs
```

`dist/`가 결과물입니다. `node scripts/check-links.mjs`는 `dist/`의 모든 내부 링크(`href`·`src`)와 `#앵커`가 실제로 있는지 확인합니다. 배포 워크플로도 빌드 뒤에 이 검사를 돌립니다. 차트에 쓰는 숫자는 그 항목 `summary` 문장 안에 실제로 있는 값만 통과합니다. 빌드가 문장에 없는 숫자를 거부합니다. 퀴즈와 ‘예상 상회/하회’ 판정도 그 장의 문장과 숫자에서만 만듭니다.

경제 주제의 X 글은 글 주소가 있을 때만 그 주소로 연결하고, 나머지는 [매크로비욘드](https://x.com/sshleo84) 프로필로 연결합니다.

## 독서 기록

독서 기록은 [`data/reading.json`](data/reading.json)과 [`src/covers/`](src/covers)에서 만듭니다. 원본은 [SuddenlySlowly/reading-tracker](https://github.com/SuddenlySlowly/reading-tracker)의 `data.json`과 `covers/`이고, 이 레포로 복사해 둔 것입니다. 트래커에서 기록을 더한 뒤에는 두 곳을 다시 복사하고 빌드합니다.

책 정보는 **교보문고 상품 페이지 기준**으로 적습니다. 새 책을 더할 때도 아래 필드를 같은 형식으로 채웁니다.

| 필드 | 내용 | 예 (폭풍이 온다) |
| --- | --- | --- |
| `title` | 교보문고 표기 제목 | `폭풍이 온다` |
| `author` | 저자 | `오드 아르네 베스타` |
| `memo` | 옮긴이 등 덧붙일 말 | `최준영 옮김` |
| `category` | 책장 분류. `문학`·`비문학` 등 | `비문학` |
| `subcategory` | 교보문고 분류 경로 (`>`로 구분) | `국내도서 > 역사/문화` |
| `publisher` | 출판사 | `21세기북스` |
| `pages` | 교보문고 쪽수 | `328` |
| `totalPages` | 진행률 계산 쪽수. `pages`와 같은 값 | `328` |
| `pubDate` | 출간일 `YYYY-MM-DD` | `2026-05-11` |
| `isbn` | ISBN-13, 하이픈 없이 | `9791173579547` |
| `kyoboUrl` | 교보문고 상품 링크 | `https://product.kyobobook.co.kr/detail/S000219930248` |

- 빌드가 형식을 검사합니다. `pages`와 `totalPages`가 다르거나, 날짜가 `YYYY-MM-DD`가 아니거나, ISBN이 978/979로 시작하는 13자리가 아니거나, `kyoboUrl`이 `https://product.kyobobook.co.kr/detail/`로 시작하지 않으면 실패합니다.
- 분류 책장의 표지 밑에는 진행 상태, 저자, 출판사·출간일·쪽수, 교보문고 분류가 나옵니다. 표지를 누르면 `/reading/books/<id>/` 상세 페이지에서 ISBN, 읽기 시작일, 교보문고 링크, 쪽수 기록을 볼 수 있습니다.
- `category`가 없거나 비어 있으면 `미분류` 책장에 꽂힙니다. `문학`·`비문학` 책장은 책이 없어도 항상 보입니다.
- 읽는 중인 책의 진행률은 그 책의 가장 최근 쪽수 기록(`logs`의 `to`)을 `totalPages`로 나눈 값입니다.
- 완독한 책은 `endDate` 기준으로 ‘2026년 10월’처럼 표시합니다.
- `cover`는 `covers/파일명` 형식이고 `src/covers/`에 그 파일이 있어야 빌드가 통과합니다.
- `data/reading.json`은 Reading 봇이 관리합니다. 형식은 그대로 두고, 메모는 아래 `data/notes/`에 따로 둡니다.

### 디자인 기준

독서기록 탭부터 문서형 패널 레이아웃을 씁니다(앞으로 사이트 공통 기준). 절제된 중성 팔레트에 포인트 컬러 하나(`--rd-accent`), 1px 구분선, 촘촘한 그리드, 라벨(작은 대문자)·값이 한눈에 읽히는 패널. 왼쪽 사이드바에 책장·책 목록, 오른쪽에 머리말 → 숫자 줄 → 패널 순서입니다. 색 토큰은 `src/style.css`의 `body[data-tab="reading"]`에 있고 라이트/다크 모두 정의합니다.

### 책 메모 (`data/notes/<bookId>.json`)

책 상세의 ‘메모’는 마인드맵입니다. 가운데 노드가 책 제목이고, 1단계 가지마다 채도 낮은 색이 붙습니다.

- 조작: 노드를 누르고 <kbd>Tab</kbd> 자식, <kbd>Enter</kbd> 형제(방금 만든 노드에서 Enter면 이어서 형제 하나 더), 더블클릭·<kbd>F2</kbd> 편집(<kbd>Shift</kbd>+<kbd>Enter</kbd> 줄바꿈, <kbd>Esc</kbd> 취소), <kbd>Delete</kbd> 삭제, <kbd>Space</kbd>·노드 옆 동그라미 접기/펼치기, 화살표 이동, <kbd>Ctrl</kbd>+<kbd>Z</kbd>/<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> 되돌리기/다시 하기, <kbd>Esc</kbd> 선택 해제.
- 노드를 끌어 다른 노드 가운데에 놓으면 그 자식으로, 위·아래 가장자리에 놓으면 그 앞·뒤 형제로 옮깁니다. 빈 곳에 놓으면 그 자리(`dx`·`dy`)에 남고, ‘자동 정렬’이 손으로 옮긴 위치를 지웁니다.
- 빈 곳 끌기로 이동, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+휠·핀치로 확대, ‘맞춤’(<kbd>0</kbd>), ‘전체 화면’.
- 정적 사이트라 저장은 이렇게 합니다. 빌드가 `data/notes/<bookId>.json`을 페이지에 넣어 보여 주고, 브라우저에서 고친 내용은 localStorage(`notes:<bookId>`)에 자동 저장합니다. ‘JSON 내보내기’로 받은 `<bookId>.json`을 `data/notes/`에 커밋하면 사이트에 반영됩니다. ‘JSON 가져오기’는 파일에서 불러오고, ‘저장소 버전’은 브라우저 편집본을 지웁니다. 저장소 메모가 편집본을 시작한 뒤에 바뀌었으면 저장소 메모를 보여 주고 편집본은 알림 줄에서 불러올 수 있습니다.
- 파일이 없는 책은 제목 노드 하나로 시작합니다.

```json
{
  "version": 1,
  "bookId": "b1",
  "updatedAt": "2026-10-24T09:00:00.000Z",
  "root": {
    "id": "root",
    "text": "폭풍이 온다",
    "children": [
      { "id": "n1", "text": "핵심 질문", "color": 0, "children": [
        { "id": "n2", "text": "왜 지금인가", "children": [] }
      ] },
      { "id": "n3", "text": "더 읽을 책", "color": 1, "collapsed": true, "dx": -40, "dy": 12, "children": [] }
    ]
  }
}
```

| 필드 | 내용 |
| --- | --- |
| `version` | `1` |
| `bookId` | `reading.json`의 책 `id`. 파일 이름과 같아야 함 |
| `updatedAt` | 내보낸 시각(ISO 8601). 브라우저 편집본과 비교하는 데 씀 |
| `root` | 가운데 노드. `text`는 페이지에서 늘 책 제목으로 바꿔 보여 줌 |
| `id` | 노드 id. 영문·숫자·`_`·`-` 1~40자, 파일 안에서 겹치지 않음 |
| `text` | 노드 글. 줄바꿈 가능, 2000자 이하 |
| `children` | 자식 노드 배열 |
| `color` | 가지 색 번호 0~7 (1단계 가지에만 쓰임, 선택) |
| `collapsed` | `true`면 접힘 (선택) |
| `dx`, `dy` | 자동 배치에서 손으로 옮긴 거리(px, 선택) |

- 빌드가 형식을 검사합니다. 파일 이름이 `reading.json`에 없는 책이거나, `bookId`가 파일 이름과 다르거나, id가 겹치거나 형식에 맞지 않거나, `color`가 0~7이 아니면 실패합니다.

## PoRA 로봇 자율성

`/pora/` 페이지 내용은 [`data/pora.json`](data/pora.json)에 있습니다. 소개 문장(`intro`), 출처(`announcement`), 바로가기 카드(`links`: `icon`·`label`·`desc`·`url`), 체크리스트(`checklist`: `id`·`label`·`en`)를 고친 뒤 빌드합니다.

- 빌드가 형식을 검사합니다. 링크가 `https://`가 아니거나, 공개일이 `YYYY-MM-DD`가 아니거나, 체크리스트 `id`가 소문자·숫자·하이픈이 아니거나 겹치면 실패합니다.
- 체크 상태는 `id`로 저장하므로, 이미 쓰는 `id`를 바꾸면 그 항목의 체크가 풀립니다.

## 장쉐친 게임이론

`/game-theory/` 페이지들은 [`data/jiang-game-theory.json`](data/jiang-game-theory.json)에서 만듭니다. 회차(`episodes`)마다 `number`·`title`·`videoId`·`url`·`publishedDate`·`duration`·`summary`·`keyPoints`·`keyConcepts`·`summarySource`를 적고, 재업로드 영상이 있으면 `reuploadUrl`·`reuploadVideoId`를 더합니다.

- 빌드가 형식을 검사합니다. 번호가 1부터 빠짐없이 차례대로가 아니거나, 제목이 `Game Theory #<번호>: `로 시작하지 않거나, `url`이 `videoId`와 다르거나, 날짜가 `YYYY-MM-DD`·길이가 `m:ss`/`h:mm:ss`가 아니거나, `summarySource`가 `transcript`·`description`이 아니면 실패합니다.
- `summarySource`가 `description`인 회차는 ‘자막 없이 영상 설명만으로 요약함’으로 표시합니다.
- 요약은 강의 내용(장쉐친의 주장·예측)을 정리한 것이며 사실 검증된 내용이 아니라는 고지를 모든 게임이론 페이지 맨 위에 붙입니다.

## 배포

`main`에 푸시하면 GitHub Actions가 사이트를 만들어 GitHub Pages로 올립니다. Pages 설정은 **Build and deployment → Source: GitHub Actions** 입니다.

로컬에서 보려면 `dist/`를 정적 서버로 열면 됩니다.

```bash
python3 -m http.server 4173 --directory dist
```

링크는 모두 상대 경로라 `https://suddenlyslowly.github.io/study-archive/` 아래에서도, 로컬 루트에서도 그대로 동작합니다. `404.html`만 `/study-archive/` 절대 경로를 씁니다.

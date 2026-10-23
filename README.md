# 공부 아카이브

Google 문서 「📚 공부 아카이브」를 대주제별 웹 페이지로 옮긴 정적 사이트입니다. 대주제는 한 권의 책, 메모는 그 책의 장으로 보여 줍니다.

## 페이지

| 주소 | 내용 |
| --- | --- |
| `/` | 책장 히어로, 최근 장, 숫자 카드, 아카이브 통계(책별 장 수·읽기 상태·날짜별 추가·태그 구름) |
| `/library/` | 전체 책장. 주제 탭과 장 표지 그리드, `?q=검색어` 필터 |
| `/topics/<id>/` | 책 소개와 목차, 이 책의 숫자, 예상 대비 실제 비교 |
| `/items/<id>/` | 장 읽기 화면. 오른쪽 ‘이 페이지에서’ 목차, 그림, 핵심 정리, 확인 퀴즈, 이전/다음 장 |
| `/map/` | 지식 지도. 주제별 장 궤도 그림과 태그 색인 |
| `/figures/` | 숫자 모음. 실제·예상 점 그래프, 숫자 카드, 모든 수치 그림 |
| `/timeline/` | 연표. 날짜별 추가 그래프, 책×날짜 표, 날짜별 장 목록 |
| `/reading/` | 독서 기록. 분류별 책장(문학·비문학·…), 지금 읽는 책, 숫자 카드, 최근 기록 |
| `/reading/<분류>/` | 분류 책장. 책 표지 그림과 그 밑에 진행률(읽는 중) 또는 완독 년·월(완독) |

https://suddenlyslowly.github.io/study-archive/

## 내용 고치기

본문은 [`data/archive.json`](data/archive.json)에 있습니다. 항목을 고친 뒤 사이트를 다시 만듭니다.

```bash
node scripts/build.mjs
```

`dist/`가 결과물입니다. 차트에 쓰는 숫자는 그 항목 `summary` 문장 안에 실제로 있는 값만 통과합니다. 빌드가 문장에 없는 숫자를 거부합니다. 퀴즈와 ‘예상 상회/하회’ 판정도 그 장의 문장과 숫자에서만 만듭니다.

경제 주제의 X 글은 글 주소가 있을 때만 그 주소로 연결하고, 나머지는 [매크로비욘드](https://x.com/sshleo84) 프로필로 연결합니다.

## 독서 기록

독서 기록은 [`data/reading.json`](data/reading.json)과 [`src/covers/`](src/covers)에서 만듭니다. 원본은 [SuddenlySlowly/reading-tracker](https://github.com/SuddenlySlowly/reading-tracker)의 `data.json`과 `covers/`이고, 이 레포로 복사해 둔 것입니다. 트래커에서 기록을 더한 뒤에는 두 곳을 다시 복사하고 빌드합니다.

- 책마다 `category`(분류)를 적습니다. 없거나 비어 있으면 `미분류` 책장에 꽂힙니다. `문학`·`비문학` 책장은 책이 없어도 항상 보입니다.
- 읽는 중인 책의 진행률은 그 책의 가장 최근 쪽수 기록(`logs`의 `to`)을 `totalPages`로 나눈 값입니다.
- 완독한 책은 `endDate` 기준으로 ‘2026년 10월’처럼 표시합니다.
- `cover`는 `covers/파일명` 형식이고 `src/covers/`에 그 파일이 있어야 빌드가 통과합니다.

## 배포

`main`에 푸시하면 GitHub Actions가 사이트를 만들어 GitHub Pages로 올립니다. Pages 설정은 **Build and deployment → Source: GitHub Actions** 입니다.

로컬에서 보려면 `dist/`를 정적 서버로 열면 됩니다.

```bash
python3 -m http.server 4173 --directory dist
```

링크는 모두 상대 경로라 `https://suddenlyslowly.github.io/study-archive/` 아래에서도, 로컬 루트에서도 그대로 동작합니다. `404.html`만 `/study-archive/` 절대 경로를 씁니다.

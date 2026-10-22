# 공부 아카이브

Google 문서 「📚 공부 아카이브」를 대주제별 웹 페이지로 옮긴 정적 사이트입니다.

https://suddenlyslowly.github.io/study-archive/

## 내용 고치기

본문은 [`data/archive.json`](data/archive.json)에 있습니다. 항목을 고친 뒤 사이트를 다시 만듭니다.

```bash
node scripts/build.mjs
```

`dist/`가 결과물입니다. 차트에 쓰는 숫자는 그 항목 `summary` 문장 안에 실제로 있는 값만 통과합니다. 빌드가 문장에 없는 숫자를 거부합니다.

경제 주제의 X 글은 글 주소가 있을 때만 그 주소로 연결하고, 나머지는 [매크로비욘드](https://x.com/sshleo84) 프로필로 연결합니다.

## 배포

`main`에 푸시하면 GitHub Actions가 사이트를 만들어 GitHub Pages로 올립니다. Pages 설정은 **Build and deployment → Source: GitHub Actions** 입니다.

로컬에서 보려면 `dist/`를 정적 서버로 열면 됩니다.

```bash
python3 -m http.server 4173 --directory dist
```

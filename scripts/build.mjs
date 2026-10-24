import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "data/archive.json"), "utf8"));
validate(data);

const REPO = "https://github.com/SuddenlySlowly/study-archive";
const topicById = Object.fromEntries(data.topics.map((topic) => [topic.id, topic]));
const itemsByTopic = Object.fromEntries(data.topics.map((topic) => [topic.id, []]));
for (const item of data.items) itemsByTopic[item.topic].push(item);
const reading = JSON.parse(readFileSync(join(root, "data/reading.json"), "utf8"));
validateReading(reading);
const pora = JSON.parse(readFileSync(join(root, "data/pora.json"), "utf8"));
validatePora(pora);
const gt = JSON.parse(readFileSync(join(root, "data/jiang-game-theory.json"), "utf8"));
validateGameTheory(gt);
const GT = { tab: "장쉐친 게임이론", short: "게임이론", lecturer: "장쉐친", lecturerEn: "Jiang Xueqin", color: "#9a3f2c", colorDark: "#f2b4a3" };
const GT_NOTICE = "요약은 강의 내용(장쉐친의 주장·예측)을 정리한 것이며 사실 검증된 내용이 아닙니다.";
const SHELF_META = {
  문학: { id: "literature", en: "Literature", color: "#2f5f8f", colorDark: "#a3c8f0", blurb: "소설·시·에세이처럼 이야기와 문장을 읽는 책입니다.", always: true },
  비문학: { id: "nonfiction", en: "Non-fiction", color: "#5b4a8e", colorDark: "#c9bdf5", blurb: "역사·사회·과학처럼 사실과 주장을 따라가는 책입니다.", always: true },
  미분류: { id: "uncategorized", en: "Unsorted", color: "#6b6258", colorDark: "#d4cbbf", blurb: "아직 분류를 정하지 않은 책입니다." },
};
const shelves = readingShelves(reading.books);
const shelfByName = Object.fromEntries(shelves.map((shelf) => [shelf.name, shelf]));
const chapterNo = Object.fromEntries(data.items.map((item) => [item.id, itemsByTopic[item.topic].indexOf(item) + 1]));
const CHART_TYPES = new Set(["grouped-bar", "bars", "range", "meter"]);
const ICON = {
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  shelf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 2 15.5-3.5 1z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
};
const TYPE_LABEL = {
  "grouped-bar": "비교 막대", bars: "막대", range: "범위", meter: "진행률", flow: "흐름도", split: "나란히 보기",
  checklist: "체크리스트", timeline: "타임라인", stack: "계층도", stats: "수치 카드", quote: "인용", callout: "메모",
};
const SOURCE_KIND = { youtube: "YouTube", "youtube-title": "YouTube (제목만)", x: "X", "x-video": "X 영상" };

const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "assets"), { recursive: true });
cpSync(join(root, "src/style.css"), join(dist, "assets/style.css"));
cpSync(join(root, "src/site.js"), join(dist, "assets/site.js"));
cpSync(join(root, "src/graph.js"), join(dist, "assets/graph.js"));
cpSync(join(root, "src/favicon.svg"), join(dist, "favicon.svg"));
mkdirSync(join(dist, "data"), { recursive: true });
cpSync(join(root, "data/archive.json"), join(dist, "data/archive.json"));
cpSync(join(root, "data/reading.json"), join(dist, "data/reading.json"));
cpSync(join(root, "data/pora.json"), join(dist, "data/pora.json"));
cpSync(join(root, "data/jiang-game-theory.json"), join(dist, "data/jiang-game-theory.json"));
cpSync(join(root, "src/covers"), join(dist, "covers"), { recursive: true });
writeFileSync(join(dist, ".nojekyll"), "");
writeFileSync(join(dist, "assets/search.json"), JSON.stringify(searchIndex()));

const pages = [];
const site = (rel, depth, opts) => pages.push(writePage(rel, { depth, chrome: "site", ...opts }));
site("index.html", 0, { title: data.title, description: data.subtitle, page: "home", body: renderHome });
site("library/index.html", 1, { title: `전체 책장 · ${data.title}`, description: "주제별 책과 장을 한 번에 봅니다.", page: "library", nav: "library", body: renderLibrary });
site("map/index.html", 1, { title: `지식 지도 · ${data.title}`, description: "주제와 태그, 장이 어떻게 이어지는지 봅니다.", page: "map", nav: "map", scripts: ["graph.js"], body: renderMap });
site("summaries/index.html", 1, { title: `콘텐츠별 요약 · ${data.title}`, description: "콘텐츠마다 날짜·주제·핵심 요약·출처·태그·상태를 대주제별로 모았습니다.", page: "summaries", nav: "summaries", body: renderSummaries });
site("timeline/index.html", 1, { title: `연표 · ${data.title}`, description: "날짜별로 추가한 장을 봅니다.", page: "timeline", nav: "timeline", body: renderTimeline });
site("reading/index.html", 1, { title: `독서 기록 · ${data.title}`, description: "분류별 책장에 꽂아 둔 책과 읽은 기록을 봅니다.", page: "reading", tab: "reading", nav: "reading", body: renderReading });
site("pora/index.html", 1, { title: `${pora.title} (${pora.short}) · ${data.title}`, description: pora.intro, page: "pora", tab: "pora", body: renderPora });
site("game-theory/index.html", 1, { title: `${GT.tab} · ${data.title}`, description: `${gt.channel} 채널 ${GT.lecturer}의 ${gt.series} 시리즈 #1~#${gt.episodes.length} 회차별 요약`, page: "game-theory", tab: "game-theory", nav: "list", body: renderGameTheory });
for (const ep of gt.episodes) {
  site(`game-theory/${ep.number}/index.html`, 2, { title: `#${ep.number} ${episodeTitle(ep)} · ${GT.tab}`, description: firstSentence(ep.summary), page: "game-theory-episode", tab: "game-theory", body: (p) => renderEpisode(ep, p) });
}
for (const shelf of shelves) {
  site(`reading/${shelf.id}/index.html`, 2, { title: `${shelf.name} 책장 · 독서 기록`, description: shelf.blurb, page: "reading-shelf", tab: "reading", nav: shelf.id, body: (p) => renderShelf(shelf, p) });
}
for (const book of reading.books) {
  site(`reading/books/${book.id}/index.html`, 3, { title: `${book.title} · 독서 기록`, description: `${book.author}${book.publisher ? ` · ${book.publisher}` : ""}`, page: "reading-book", tab: "reading", nav: shelfOf(book).id, body: (p) => renderBook(book, p) });
}
for (const topic of data.topics) {
  site(`topics/${topic.id}/index.html`, 2, { title: `${topic.name} · ${data.title}`, description: topic.blurb, page: "topic", body: (p) => renderTopic(topic, p) });
}
for (const item of data.items) {
  pages.push(writePage(`items/${item.id}/index.html`, {
    depth: 2,
    chrome: "reader",
    title: `${item.title} · ${data.title}`,
    description: item.summary.slice(0, 140),
    page: "item",
    item,
    body: (p) => renderItem(item, p),
  }));
}
writeFileSync(join(dist, "404.html"), page({
  depth: 0,
  absolute: true,
  chrome: "site",
  title: `없는 페이지 · ${data.title}`,
  description: data.subtitle,
  page: "missing",
  body: (p) => `<main id="content" class="cream"><section class="wrap missing"><p class="kicker">404</p><h1>이 주소에는 페이지가 없습니다.</h1><p class="sub">책장에서 다시 찾아보세요.</p><p><a class="btn" href="${p}">공부 아카이브로 돌아가기 →</a> <a class="btn ghost" href="${p}library/">전체 책장 →</a> <a class="btn ghost" href="${p}reading/">독서 기록 →</a></p></section></main>`,
}));
// 없앤 숫자 모음(/figures/)과 /numbers/ 주소는 콘텐츠별 요약으로 보낸다
for (const old of ["figures", "numbers"]) writeRedirect(`${old}/index.html`, "summaries/");
writeFileSync(join(dist, "robots.txt"), "User-agent: *\nAllow: /\n");
writeFileSync(join(dist, "sitemap.xml"), sitemap(pages));
console.log(`built ${pages.length} pages → dist/`);

/* ---------- page shell ---------- */

function writeRedirect(rel, target) {
  const file = join(dist, rel);
  const to = "../".repeat(rel.split("/").length - 1) + target;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>콘텐츠별 요약으로 옮겼습니다 · ${esc(data.title)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(`${data.site}/${target}`)}">
<meta http-equiv="refresh" content="0; url=${to}">
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
</head>
<body><p><a href="${to}">콘텐츠별 요약</a>으로 옮겼습니다.</p></body>
</html>
`);
}

function writePage(rel, opts) {
  const file = join(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page({ ...opts, path: rel }));
  return rel;
}

function page({ title, description, depth, body, page: pageName, path, absolute, chrome, nav, item, tab = "study", scripts = [] }) {
  const prefix = absolute ? "/study-archive/" : depth ? "../".repeat(depth) : "";
  const canonPath = path === "index.html" || !path ? "/" : `/${path.replace(/index\.html$/, "")}`;
  const topic = item ? topicById[item.topic] : null;
  const style = topic ? ` style="${topicVars(topic)}"` : "";
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(data.site + canonPath)}">
<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#15162a">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${esc(data.title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(data.site + canonPath)}">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body data-page="${esc(pageName || "")}" data-tab="${tab}" data-root="${prefix}"${style}>
<a class="skip" href="#content">본문으로</a>
${tabBar(prefix, tab, pageName)}
${chrome === "reader" ? readerHeader(prefix, item) : tab === "reading" ? readingHeader(prefix, nav) : tab === "pora" ? poraHeader(prefix) : tab === "game-theory" ? gameTheoryHeader(prefix, nav) : siteHeader(prefix, nav)}
${body(prefix)}
${footer(prefix, tab)}
<div class="tip" data-tip-box hidden></div>
<script src="${prefix}assets/site.js" defer></script>${scripts.map((name) => `
<script src="${prefix}assets/${name}" defer></script>`).join("")}
</body>
</html>
`;
}


function logo() {
  return `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h9c1.2 1 2.8 1 4 0h9v16h-9c-1.2 1-2.8 1-4 0H5z" fill="#f3e6d4"/><path d="M16 8.6v15" stroke="#d68a2c" stroke-width="1.6"/><path d="M8 13h5M8 16.5h5M19 13h5M19 16.5h5" stroke="#8a4b12" stroke-width="1.3" stroke-linecap="round"/></svg>`;
}

function searchBox(prefix, placeholder) {
  return `<form class="search" action="${prefix}library/" method="get" role="search" data-search-form>
      <input type="search" name="q" placeholder="${esc(placeholder)}" aria-label="아카이브 검색" autocomplete="off" data-search>
      <button type="submit" aria-label="검색">${ICON.search}</button>
      <div class="search-pop" data-search-pop hidden role="listbox"></div>
    </form>`;
}

// 모든 페이지 맨 위에 고정되는 섹션 탭. Study = 공부 아카이브, 독서기록 = /reading/, PoRA = /pora/, 장쉐친 게임이론 = /game-theory/
function tabBar(prefix, tab, pageName) {
  const tabs = [
    ["study", "Study", prefix, pageName === "home"],
    ["reading", "독서기록", `${prefix}reading/`, pageName === "reading"],
    ["pora", tabLabel(pora), `${prefix}pora/`, pageName === "pora"],
    ["game-theory", tabLabel(GT), `${prefix}game-theory/`, pageName === "game-theory"],
  ].map(([id, label, href, isRoot]) => `<a class="tab${id === tab ? " is-active" : ""}" href="${href}"${id === tab ? ` aria-current="${isRoot ? "page" : "true"}"` : ""}>${label}</a>`).join("");
  return `<div class="tabbar">
  <div class="tabbar-in">
    <a class="tab-logo" href="${prefix}" aria-label="홈">${logo()}</a>
    <nav class="tabs" aria-label="섹션">${tabs}</nav>
    <div class="top-icons">
      <button class="icon-btn" type="button" data-theme-toggle aria-label="라이트와 다크 모드 전환">${ICON.moon}</button>
      <a class="icon-btn" href="${REPO}" aria-label="GitHub 저장소">${ICON.github}</a>
    </div>
  </div>
</div>`;
}

// 좁은 화면에서는 짧은 이름(PoRA, 게임이론)만 남긴다
function tabLabel({ tab, short }) {
  if (tab.startsWith(short)) return `${esc(short)}<span class="tab-long">${esc(tab.slice(short.length))}</span>`;
  if (tab.endsWith(short)) return `<span class="tab-long">${esc(tab.slice(0, -short.length))}</span>${esc(short)}`;
  return esc(tab);
}

function siteHeader(prefix, nav) {
  const links = [
    ["library", "전체 책장"],
    ["map", "지식 지도"],
    ["summaries", "콘텐츠별 요약"],
    ["timeline", "연표"],
  ].map(([id, label]) => `<a href="${prefix}${id}/"${id === nav ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<header class="topbar">
  <div class="topbar-in">
    <a class="brand" href="${prefix}"><span>공부 아카이브</span></a>
    ${searchBox(prefix, "책 이름이나 주제로 검색")}
    <nav class="topnav" aria-label="Study">${links}</nav>
  </div>
</header>`;
}

function readingHeader(prefix, nav) {
  const links = [[`${prefix}reading/`, "reading", "분류별 책장", ""]]
    .concat(shelves.map((shelf) => [`${prefix}reading/${shelf.id}/`, shelf.id, shelf.name, ` <small>${shelf.books.length}</small>`]))
    .map(([href, id, label, extra]) => `<a href="${href}"${id === nav ? ' aria-current="page"' : ""}>${esc(label)}${extra}</a>`).join("");
  return `<header class="topbar">
  <div class="topbar-in">
    <a class="brand" href="${prefix}reading/"><span>독서 기록</span></a>
    <nav class="topnav" aria-label="독서기록">${links}</nav>
  </div>
</header>`;
}

function poraHeader(prefix) {
  const links = [["#pora-links", "바로가기"], ["#pora-progress", "공부 진도"]]
    .map(([href, label]) => `<a href="${href}">${label}</a>`).join("");
  return `<header class="topbar">
  <div class="topbar-in">
    <a class="brand" href="${prefix}pora/"><span>${esc(pora.tab)}</span></a>
    <nav class="topnav" aria-label="${esc(pora.short)}">${links}</nav>
  </div>
</header>`;
}

function gameTheoryHeader(prefix, nav) {
  const ext = `target="_blank" rel="noopener noreferrer"`;
  const links = [
    `<a href="${prefix}game-theory/"${nav === "list" ? ' aria-current="page"' : ""}>회차 목록</a>`,
    `<a href="${prefix}game-theory/#gt-about">시리즈 소개</a>`,
    `<a href="${esc(gt.playlistUrl)}" ${ext}>재생목록 ↗</a>`,
  ].join("");
  return `<header class="topbar">
  <div class="topbar-in">
    <a class="brand" href="${prefix}game-theory/"><span>${esc(GT.tab)}</span></a>
    <nav class="topnav" aria-label="${esc(GT.tab)}">${links}</nav>
  </div>
</header>`;
}

function readerHeader(prefix, item) {
  const topic = topicById[item.topic];
  return `<header class="readbar">
  <div class="readbar-in">
    <button class="icon-btn" type="button" data-drawer-open aria-controls="book-toc" aria-expanded="false" aria-label="이 책 목차 열기">${ICON.menu}</button>
    <a class="book-brand" href="${prefix}topics/${topic.id}/"><span class="book-chip" aria-hidden="true">${art(topic.id)}</span><b>${esc(topic.name)}</b><small>${esc(topic.en)}</small></a>
    ${searchBox(prefix, "이 아카이브 검색")}
    <div class="top-icons">
      <a class="pill-btn" href="${prefix}library/">${ICON.shelf}<span>전체 책</span></a>
    </div>
  </div>
  <div class="progress" aria-hidden="true"><i data-progress></i></div>
</header>
<div class="drawer-scrim" data-drawer-close hidden></div>
<aside class="drawer" id="book-toc" aria-label="${esc(topic.name)} 목차" data-drawer hidden>
  <div class="drawer-head">${miniCover(topic)}<div><p class="kicker">${esc(topic.en)}</p><b>${esc(topic.name)}</b></div><button class="icon-btn" type="button" data-drawer-close aria-label="목차 닫기">${ICON.close}</button></div>
  <ol class="drawer-list">${itemsByTopic[topic.id].map((row) => `<li><a href="${prefix}items/${row.id}/"${row.id === item.id ? ' aria-current="page"' : ""}><span class="no">${pad(chapterNo[row.id])}</span><span>${esc(row.title)}</span></a></li>`).join("")}</ol>
  <p class="drawer-foot"><a href="${prefix}topics/${topic.id}/">책 소개로 →</a></p>
</aside>`;
}

function footer(prefix, tab) {
  if (tab === "game-theory") {
    return `<footer class="site-footer"><div class="wrap foot-in">
  <p>© 강의 ${esc(gt.channel)} · ${esc(GT.lecturer)}(${esc(GT.lecturerEn)}). ${esc(GT_NOTICE)}</p>
  <nav aria-label="바닥 메뉴"><a href="${prefix}game-theory/">회차 목록</a><a href="${esc(gt.channelUrl)}">${esc(gt.channel)} 채널</a><a href="${esc(gt.playlistUrl)}">재생목록</a><a href="${prefix}data/jiang-game-theory.json">jiang-game-theory.json</a><a href="${REPO}">이 사이트의 소스</a></nav>
</div></footer>`;
  }
  if (tab === "pora") {
    return `<footer class="site-footer"><div class="wrap foot-in">
  <p>© ${esc(pora.title)} · ${esc(pora.authors)}(${esc(pora.org)}). 진도 체크는 이 브라우저에만 저장됩니다.</p>
  <nav aria-label="바닥 메뉴"><a href="${prefix}pora/#pora-links">바로가기</a><a href="${prefix}pora/#pora-progress">공부 진도</a><a href="${prefix}data/pora.json">pora.json</a><a href="${REPO}">이 사이트의 소스</a></nav>
</div></footer>`;
  }
  if (tab === "reading") {
    return `<footer class="site-footer"><div class="wrap foot-in">
  <p>© 독서 기록 · 책 정보는 교보문고 기준입니다.</p>
  <nav aria-label="바닥 메뉴"><a href="${prefix}reading/">분류별 책장</a>${shelves.map((shelf) => `<a href="${prefix}reading/${shelf.id}/">${esc(shelf.name)}</a>`).join("")}<a href="${prefix}data/reading.json">reading.json</a><a href="${REPO}">이 사이트의 소스</a></nav>
</div></footer>`;
  }
  return `<footer class="site-footer"><div class="wrap foot-in">
  <p>© 공부 아카이브 · 수치는 각 메모에 적힌 문장에서만 그렸습니다.</p>
  <nav aria-label="바닥 메뉴"><a href="${prefix}">홈</a><a href="${prefix}library/">전체 책장</a><a href="${prefix}map/">지식 지도</a><a href="${prefix}summaries/">콘텐츠별 요약</a><a href="${prefix}timeline/">연표</a><a href="${prefix}data/archive.json">archive.json</a><a href="${REPO}">이 사이트의 소스</a></nav>
</div></footer>`;
}

/* ---------- home ---------- */

function renderHome(p) {
  const counts = countStatuses(data.items);
  const recent = recentItems(5);
  const chartItems = [...data.items].filter((item) => item.visuals.some((v) => CHART_TYPES.has(v.type))).sort(byDateDesc).slice(0, 6);
  return `<main id="content">
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <p class="hero-kicker">THE STUDY ARCHIVE · 공부 아카이브</p>
          <h1>모아 둔 공부마다,<br><em>다시 펼쳐 볼 책이 있습니다.</em></h1>
          <p class="hero-small">마지막 정리 ${esc(dotDate(data.updated))} · ${data.topics.length}권 ${data.items.length}장</p>
        </div>
        <div class="hero-side">
          <p>${esc(data.subtitle)}</p>
          <p class="hero-legend">${esc(data.statusLegend)}</p>
          <a class="hero-link" href="library/">전체 책장 둘러보기 →</a>
        </div>
      </div>
      <nav class="hero-pills" aria-label="주제">${data.topics.map((t) => `<a href="topics/${t.id}/">${esc(t.name)} <span>${itemsByTopic[t.id].length}</span> →</a>`).join("")}</nav>
      <div class="shelf-head"><h2>처음 펼치기 좋은 책</h2><a href="library/">전체 ${data.topics.length}권 보기 →</a></div>
      <div class="shelf"><div class="shelf-row books-${data.topics.length}">${data.topics.map((t) => bookCover(t, "")).join("")}</div></div>
      <div class="shelf-head"><h2>최근 추가된 장</h2><a href="timeline/">연표로 보기 →</a></div>
      <div class="shelf"><div class="shelf-row">${recent.map((item) => chapterCover(item, "")).join("")}</div></div>
    </div>
  </section>

  <section class="cream band">
    <div class="wrap">
      <p class="kicker">숫자로 펼쳐 보기</p>
      <h2 class="sec-title">궁금한 그림에서 시작해 보세요</h2>
      <p class="sub">메모 문장에 적힌 수치로만 그린 차트입니다. 카드를 누르면 해당 장의 그림으로 이어집니다.</p>
      <div class="fan" style="--n:${chartItems.length}">${chartItems.map((item, i) => fanCard(item, i, "")).join("")}</div>
      <p class="center"><a class="more" href="summaries/">콘텐츠별 요약 전체 보기 →</a></p>
    </div>
  </section>

  <section class="cream band alt">
    <div class="wrap">
      <p class="kicker">한눈에 보기</p>
      <h2 class="sec-title">아카이브의 모양</h2>
      <p class="sub">책마다 몇 장이 있는지, 언제 추가했는지, 어디까지 읽었는지를 아카이브 자체에서 셌습니다.</p>
      <div class="kpis">
        <div><b>${data.topics.length}</b><span>권(주제)</span></div>
        <div><b>${data.items.length}</b><span>장(메모)</span></div>
        ${Object.entries(data.statuses).map(([id, s]) => `<div><b>${counts[id] || 0}</b><span>${esc(s.mark)} ${esc(s.label)}</span></div>`).join("")}
        <div><b>${data.items.reduce((n, item) => n + item.highlights.length, 0)}</b><span>적힌 숫자</span></div>
      </div>
      <div class="dash">
        <figure class="card-panel">${topicCountChart("")}</figure>
        <figure class="card-panel">${statusChart(data.items)}</figure>
        <figure class="card-panel wide">${dayChart(data.items, "")}</figure>
        <figure class="card-panel wide">${tagCloud(data.items, "")}</figure>
      </div>
    </div>
  </section>

  <section class="note-band">
    <div class="wrap note-grid">
      <div><p class="kicker">ARCHIVE NOTE</p><span class="bigquote" aria-hidden="true">“</span></div>
      <div class="note-body">
        <h2>${esc(data.title)}</h2>
        <p>${esc(data.subtitle)}.</p>
        <p>${esc(data.statusLegend)}</p>
        <p>차트와 숫자 카드는 각 메모의 요약 문장에 실제로 적힌 값만 씁니다. 문장에 없는 숫자는 빌드 단계에서 걸러집니다. 원본 문서의 빈 ‘내 생각’ 칸은 비어 있는 채로 두었습니다.</p>
        <div class="sign"><span class="avatar" aria-hidden="true">${logo()}</span><div><b>${esc(data.title)}</b><small>마지막 정리 ${esc(dotDate(data.updated))}</small></div><a href="${REPO}">GitHub →</a></div>
      </div>
    </div>
  </section>
</main>`;
}

function fanCard(item, i, p) {
  const topic = topicById[item.topic];
  const vi = item.visuals.findIndex((v) => CHART_TYPES.has(v.type));
  const visual = item.visuals[vi];
  const h = item.highlights[0];
  return `<a class="fan-card" style="--i:${i};${topicVars(topic)}" href="${p}items/${item.id}/#${figId(item, vi)}">
    <div class="fan-thumb">${chartThumb(visual)}</div>
    <div class="fan-body">
      <p class="fan-topic">${esc(topic.name)}</p>
      <h3>${esc(item.title)}</h3>
      <p class="fan-sub">${h ? `${esc(h.labelParts.join(" "))} <b>${esc(h.display)}</b>` : esc(visual.title || "")}</p>
      <span class="fan-go">그림 보기 →</span>
    </div>
  </a>`;
}

/* ---------- library ---------- */

function renderLibrary(p) {
  const tabs = [`<button type="button" data-shelf-tab="all" aria-pressed="true"><span>00</span> 모든 주제</button>`]
    .concat(data.topics.map((t, i) => `<button type="button" data-shelf-tab="${t.id}" aria-pressed="false"><span>${pad(i + 1)}</span> ${esc(t.name)}</button>`)).join("");
  const sections = data.topics.map((topic) => {
    const items = itemsByTopic[topic.id];
    return `<section class="lib-sec" data-shelf="${topic.id}" style="${topicVars(topic)}">
      <div class="lib-head"><h2><i aria-hidden="true"></i>${esc(topic.name)} <small>${items.length}장</small></h2><a href="${p}topics/${topic.id}/">책 펼치기 →</a></div>
      <div class="lib-grid">
        <div class="lib-cell book-cell" data-find="${esc(findText([topic.name, topic.en, topic.blurb]))}">${bookCover(topic, p)}<b>${esc(topic.en)}</b><small>${esc(topic.blurb)}</small></div>
        ${items.map((item) => `<div class="lib-cell" data-find="${esc(findText([item.title, item.summary, topic.name, ...item.tags]))}">${chapterCover(item, p)}<b>제${chapterNo[item.id]}장 · ${esc(dotDate(item.date))}</b><small>${badge(item.status)} ${item.tags.map((t) => `#${esc(t)}`).join(" ")}</small></div>`).join("")}
      </div>
    </section>`;
  }).join("");
  return `<main id="content" class="cream">
  <div class="wrap lib">
    <div class="lib-tabs" role="toolbar" aria-label="주제 고르기"><h1>전체 책장</h1><span class="slash" aria-hidden="true">/</span>${tabs}</div>
    <p class="lib-query" data-lib-query hidden></p>
    ${sections}
    <p class="empty" data-lib-empty hidden>찾는 장이 없습니다.</p>
  </div>
</main>`;
}

/* ---------- topic (book) ---------- */

function renderTopic(topic, p) {
  const items = itemsByTopic[topic.id];
  const counts = countStatuses(items);
  const highlights = items.flatMap((item) => item.highlights.map((h) => ({ ...h, item })));
  const compare = compareRows(items);
  return `<main id="content" class="cream" style="${topicVars(topic)}">
  <section class="book-hero">
    <div class="wrap book-hero-grid">
      <div class="book-hero-cover">${bookCover(topic, p, true)}</div>
      <div>
        <nav class="crumbs" aria-label="경로"><a href="${p}">홈</a><span aria-hidden="true">/</span><a href="${p}library/">전체 책장</a><span aria-hidden="true">/</span><span>${esc(topic.name)}</span></nav>
        <p class="kicker">${esc(topic.en)}</p>
        <h1>${esc(topic.name)}</h1>
        <p class="lede">${esc(topic.blurb)}</p>
        <dl class="book-facts">
          <div><dt>장</dt><dd>${items.length}</dd></div>
          ${Object.entries(data.statuses).map(([id, s]) => `<div><dt>${esc(s.mark)} ${esc(s.label)}</dt><dd>${counts[id] || 0}</dd></div>`).join("")}
          <div><dt>최근</dt><dd>${esc(dotDate(topic.overviewLatest))}</dd></div>
        </dl>
        <p><a class="btn" href="${p}items/${items[0].id}/">1장부터 읽기 →</a></p>
      </div>
    </div>
  </section>
  <section class="band">
    <div class="wrap book-body">
      <div>
        <p class="kicker">목차</p>
        <h2 class="sec-title">이 책의 장</h2>
        <ol class="toc-list">${items.map((item) => tocRow(item, p)).join("")}</ol>
      </div>
      <aside class="book-side">
        <figure class="card-panel">${statusChart(items)}</figure>
        <figure class="card-panel">${dayChart(items, p, topic)}</figure>
        <figure class="card-panel">${tagCloud(items, p)}</figure>
      </aside>
    </div>
  </section>
  ${highlights.length ? `<section class="band alt"><div class="wrap">
    <p class="kicker">적힌 숫자</p><h2 class="sec-title">이 책의 숫자</h2><p class="sub">각 장의 문장에 나온 수치입니다. 카드를 누르면 해당 장으로 갑니다.</p>
    <div class="hi-grid">${highlights.map((h) => highlightCard(h, p)).join("")}</div>
  </div></section>` : ""}
  ${compare.length ? `<section class="band"><div class="wrap">
    <p class="kicker">예상 대비 실제</p><h2 class="sec-title">발표치와 예상치</h2><p class="sub">‘실제’와 ‘예상’이 함께 적힌 지표만 모았습니다.</p>
    ${compareChart(compare, p)}
  </div></section>` : ""}
</main>`;
}

function tocRow(item, p) {
  const types = [...new Set(item.visuals.map((v) => v.type))].filter((t) => t !== "quote" && t !== "callout");
  return `<li><a href="${p}items/${item.id}/">
    <span class="toc-no">${pad(chapterNo[item.id])}</span>
    <span class="toc-main"><b>${esc(item.title)}</b><small>${esc(firstSentence(item.summary))}</small>
      <span class="toc-meta"><time datetime="${esc(item.date)}">${esc(dotDate(item.date))}</time>${badge(item.status)}${types.map((t) => `<span class="vt" title="${esc(TYPE_LABEL[t])}">${glyph(t)}<span>${esc(TYPE_LABEL[t])}</span></span>`).join("")}</span>
    </span>
  </a></li>`;
}

/* ---------- item (chapter) ---------- */

function renderItem(item, p) {
  const topic = topicById[item.topic];
  const siblings = itemsByTopic[item.topic];
  const index = siblings.indexOf(item);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];
  const no = chapterNo[item.id];
  const youtube = youtubeId(item.source.url);
  const sections = [];
  sections.push({ id: "summary", title: "요약", html: `<div class="prose">${paragraphs(item.summary).map((t) => `<p>${esc(t)}</p>`).join("")}</div>` });
  let fig = 0;
  let pending = [];
  item.visuals.forEach((visual, vi) => {
    if (visual.type === "quote" || visual.type === "callout") {
      pending.push(renderInline(visual));
      return;
    }
    fig += 1;
    const html = `${pending.join("")}${renderFigure(visual, item, vi, `${no}-${fig}`)}`;
    pending = [];
    sections.push({ id: `sec-${vi}`, title: visual.title || TYPE_LABEL[visual.type], html });
  });
  if (pending.length) sections.push({ id: "notes", title: "남겨 둔 문장", html: pending.join("") });
  if (youtube) sections.push({ id: "video", title: "영상", html: `<div class="yt-wrap"><button type="button" class="yt" data-yt="${esc(youtube)}" data-title="${esc(item.title)}"><img src="https://i.ytimg.com/vi/${esc(youtube)}/hqdefault.jpg" alt="" loading="lazy"><span>▶ 영상 재생</span></button><p><a href="${esc(item.source.url)}" target="_blank" rel="noopener noreferrer">YouTube에서 열기 ↗</a></p></div>` });
  const key = keyPoints(item);
  if (key) sections.push({ id: "key", title: "핵심 정리", html: key });
  const quiz = quizzes(item);
  if (quiz) sections.push({ id: "quiz", title: "확인 퀴즈", html: quiz });
  sections.push({ id: "source", title: "출처와 내 생각", html: `<div class="src-grid"><aside class="source-card"><p class="kicker">출처 · ${esc(SOURCE_KIND[item.source.kind] || item.source.kind)}</p><p>${esc(item.source.label.split("\n")[0])}</p>${item.source.url ? `<p><a href="${esc(item.source.url)}" target="_blank" rel="noopener noreferrer">링크 열기 ↗</a></p>` : `<p class="muted">원문 링크가 없습니다.</p>`}</aside><aside class="thought"><p class="kicker">내 생각</p>${item.thought ? `<p>${esc(item.thought)}</p>` : `<p class="muted">아직 비어 있습니다.</p>`}</aside></div>` });

  const goals = sections.filter((s) => s.id.startsWith("sec-")).map((s) => s.title);
  return `<div class="reader">
  <main id="content" class="reader-main">
    <nav class="crumbs" aria-label="경로"><a href="${p}">홈</a><span aria-hidden="true">/</span><a href="${p}topics/${topic.id}/">${esc(topic.name)}</a><span aria-hidden="true">/</span><span>제${no}장</span></nav>
    <p class="ch-no">${pad(no)} <span>${esc(topic.en)} · ${esc(dotDate(item.date))}</span></p>
    <h1 class="ch-title">${esc(item.title)}</h1>
    <div class="ch-meta">${badge(item.status)}${item.tags.map((tag) => `<a class="tag" href="${p}map/#${tagId(tag)}">#${esc(tag)}</a>`).join("")}</div>
    ${goals.length ? `<section class="goals"><h2>이 장에서 볼 것</h2><ul>${goals.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></section>` : ""}
    ${sections.map((s, i) => `<section class="ch-sec" id="${s.id}"><h2><span class="sec-no">${pad(i + 1)}</span>${esc(s.title)}</h2>${s.html}</section>`).join("")}
    <nav class="pager" aria-label="앞뒤 장">
      ${prev ? `<a class="prev" href="${p}items/${prev.id}/"><small>← 이전 장 · ${pad(chapterNo[prev.id])}</small><b>${esc(prev.title)}</b></a>` : `<a class="prev" href="${p}topics/${topic.id}/"><small>← 책 소개</small><b>${esc(topic.name)}</b></a>`}
      ${next ? `<a class="next" href="${p}items/${next.id}/"><small>다음 장 · ${pad(chapterNo[next.id])} →</small><b>${esc(next.title)}</b></a>` : `<a class="next" href="${p}library/"><small>마지막 장 · 전체 책장 →</small><b>다른 책 펼치기</b></a>`}
    </nav>
  </main>
  <aside class="otp" aria-label="이 페이지 목차"><p>이 페이지에서</p><ol>${sections.map((s) => `<li><a href="#${s.id}" data-otp="${s.id}">${esc(s.title)}</a></li>`).join("")}</ol></aside>
</div>`;
}

function renderInline(visual) {
  if (visual.type === "quote") return `<blockquote class="pull"><p>${esc(visual.text)}</p></blockquote>`;
  return `<aside class="callout ${visual.tone === "warn" ? "warn" : "note"}"><b>${visual.tone === "warn" ? "주의" : "메모"}</b><p>${esc(visual.text)}</p></aside>`;
}

function renderFigure(visual, item, vi, label) {
  let body;
  if (visual.type === "grouped-bar" || visual.type === "bars") body = barFigure(visual);
  else if (visual.type === "range") body = renderRange(visual);
  else if (visual.type === "meter") body = renderMeter(visual);
  else if (visual.type === "flow") body = `<ol class="flow">${visual.steps.map((step, i) => `<li><span class="flow-no">${i + 1}</span><span>${esc(step)}</span></li>`).join("")}</ol>`;
  else if (visual.type === "split") body = `<div class="split" style="--cols:${Math.min(visual.columns.length, 4)}">${visual.columns.map((col, i) => `<section class="split-col s${i % 3}"><h3>${esc(col.title)}</h3><ul>${col.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul></section>`).join("")}</div>`;
  else if (visual.type === "checklist") body = `<ul class="checks">${visual.items.map((entry, i) => `<li><label><input type="checkbox" data-check="${esc(item.id)}:${vi}:${i}"><span>${esc(entry)}</span></label></li>`).join("")}</ul><p class="fig-hint">확인한 항목에 표시해 두면 이 브라우저에 기억됩니다.</p>`;
  else if (visual.type === "timeline") body = `<ol class="timeline">${visual.events.map((ev) => `<li><span class="tl-dot" aria-hidden="true"></span><time>${ev.when ? esc(ev.when) : "·"}</time><p>${esc(ev.text)}</p></li>`).join("")}</ol>`;
  else if (visual.type === "stack") body = `<ol class="stack">${visual.layers.map((layer, i) => `<li style="--d:${i}"><span>${esc(layer)}</span></li>`).join("")}</ol>`;
  else if (visual.type === "stats") body = `<div class="statgrid">${visual.items.map((entry) => `<div><b>${esc(entry.v)}</b><span>${esc(entry.k)}</span>${entry.sub ? `<small>${esc(entry.sub)}</small>` : ""}</div>`).join("")}</div>`;
  else throw new Error(`unknown visual ${visual.type}`);
  return `<figure class="figure" id="${figId(item, vi)}">${body}<figcaption><b>그림 ${label}.</b> ${esc(visual.caption || visual.title || "")}</figcaption></figure>`;
}

function keyPoints(item) {
  const parts = [];
  if (item.highlights.length) parts.push(`<div class="key-nums">${item.highlights.map((h) => `<div><b>${esc(h.display)}</b><span>${esc(h.labelParts.join(" "))}</span>${h.detailParts?.length ? `<small>${esc(h.detailParts.join(" · "))}</small>` : ""}${h.relation ? `<em class="rel">${esc(h.relation)}</em>` : ""}</div>`).join("")}</div>`);
  parts.push(`<p class="key-line"><b>한 줄로</b> ${esc(firstSentence(item.summary))}</p>`);
  const checks = item.visuals.filter((v) => v.type === "checklist").flatMap((v) => v.items);
  if (checks.length) parts.push(`<p class="key-sub">확인할 것</p><ul class="key-list">${checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`);
  parts.push(`<p class="key-tags">${item.tags.map((t) => `#${esc(t)}`).join(" ")}</p>`);
  return `<div class="key-box">${parts.join("")}</div>`;
}

function quizzes(item) {
  const qs = [];
  for (const h of item.highlights) {
    if (!h.relation) continue;
    qs.push({
      q: `${h.labelParts.join(" ")} ${h.display}, 예상과 비교하면?`,
      options: ["예상 상회", "예상 부합", "예상 하회"],
      answer: h.relation,
      why: `본문: “${h.quote}” — ${h.relationQuote}`,
    });
  }
  for (const v of item.visuals) {
    if (v.type === "flow" && v.steps.length >= 3) {
      qs.push({ q: `‘${v.title}’에서 맨 처음 오는 것은?`, options: rotate(v.steps, 1), answer: v.steps[0], why: v.steps.join(" → ") });
    }
    if (v.type === "split" && v.columns.length >= 2) {
      const titles = v.columns.map((c) => c.title);
      for (const col of v.columns) {
        const pt = col.points.find((x) => !titles.some((t) => x.includes(t)) && v.columns.filter((c) => c.points.includes(x)).length === 1);
        if (pt) { qs.push({ q: `‘${pt}’는 어느 쪽 이야기일까요?`, options: titles, answer: col.title, why: v.caption }); break; }
      }
    }
  }
  const list = qs.slice(0, 3);
  if (!list.length) return "";
  return `<div class="quiz">${list.map((q, i) => `<fieldset class="q" data-quiz data-answer="${esc(q.answer)}"><legend><span>Q${i + 1}</span> ${esc(q.q)}</legend><div class="opts">${q.options.map((o) => `<button type="button" data-opt="${esc(o)}">${esc(o)}</button>`).join("")}</div><p class="why" hidden>${esc(q.why)}</p></fieldset>`).join("")}<p class="fig-hint">문제와 정답은 모두 이 장의 문장에서 만들었습니다.</p></div>`;
}

/* ---------- map / summaries / timeline ---------- */

function renderMap(p) {
  return `<main id="content" class="cream">
  <section class="band"><div class="wrap">
    <p class="kicker">지식 지도</p><h1 class="sec-title big">주제와 태그, 장의 연결</h1>
    <p class="sub">큰 점이 대주제, 그 둘레가 콘텐츠, 작은 점이 태그입니다. 태그가 서로 다른 콘텐츠를 잇습니다. 점 크기는 연결 수에 비례합니다.</p>
    ${graphView(p)}
  </div></section>
  <section class="band alt"><div class="wrap">
    <p class="kicker">태그</p><h2 class="sec-title">태그별로 찾아보기</h2><p class="sub">태그는 각 장에 붙은 그대로입니다. 숫자는 그 태그가 붙은 장의 수입니다.</p>
    <div class="clusters">${data.topics.map((topic) => {
      const tags = sortedTags(itemsByTopic[topic.id]);
      return `<section class="cluster" style="${topicVars(topic)}"><h3><i aria-hidden="true"></i><a href="${p}topics/${topic.id}/">${esc(topic.name)}</a> <small>태그 ${tags.length}개</small></h3>
        <dl>${tags.map(([tag, n]) => `<div id="${tagId(tag)}" class="tag-row"><dt>#${esc(tag)} <small>${n}</small></dt><dd>${itemsByTopic[topic.id].filter((item) => item.tags.includes(tag)).map((item) => `<a href="${p}items/${item.id}/">${esc(item.title)}</a>`).join("")}</dd></div>`).join("")}</dl>
      </section>`;
    }).join("")}</div>
  </div></section>
</main>`;
}

function renderSummaries(p) {
  const groups = data.topics
    .map((topic) => ({ topic, items: [...itemsByTopic[topic.id]].sort(byDateDesc) }))
    .sort((a, b) => (a.items[0].date < b.items[0].date ? 1 : a.items[0].date > b.items[0].date ? -1 : 0));
  const chips = [`<button type="button" data-sum-topic="all" aria-pressed="true"><span>${pad(data.items.length)}</span> 모든 주제</button>`]
    .concat(groups.map(({ topic, items }) => `<button type="button" data-sum-topic="${topic.id}" aria-pressed="false" style="${topicVars(topic)}"><i aria-hidden="true"></i>${esc(topic.name)} <span>${items.length}</span></button>`)).join("");
  return `<main id="content" class="cream">
  <section class="band sum-band"><div class="wrap">
    <p class="kicker">콘텐츠별 요약</p><h1 class="sec-title big">콘텐츠마다 한눈에</h1>
    <p class="sub">공부한 콘텐츠 ${data.items.length}개를 대주제별로 묶고 최신순으로 놓았습니다. 소주제를 누르면 그 장으로, 출처를 누르면 원문으로 갑니다.</p>
    <div class="sum-tools">
      <div class="sum-chips lib-tabs" role="toolbar" aria-label="대주제 고르기">${chips}</div>
      <label class="sum-search"><span class="sr-only">요약 검색</span>${ICON.search}<input type="search" placeholder="제목·요약·태그·출처로 검색" autocomplete="off" data-sum-search></label>
    </div>
    <p class="sum-count" data-sum-count aria-live="polite">${data.items.length}개 콘텐츠</p>
    ${groups.map(({ topic, items }) => `<section class="sum-sec" data-sum-sec="${topic.id}" style="${topicVars(topic)}">
      <div class="lib-head"><h2><i aria-hidden="true"></i>${esc(topic.name)} <small>${items.length}개 · 최근 ${esc(dotDate(items[0].date))}</small></h2><a href="${p}topics/${topic.id}/">책 펼치기 →</a></div>
      <div class="sum-grid">${items.map((item) => summaryCard(item, topic, p)).join("")}</div>
    </section>`).join("")}
    <p class="empty" data-sum-empty hidden>맞는 콘텐츠가 없습니다.</p>
  </div></section>
</main>`;
}

function summaryCard(item, topic, p) {
  const label = item.source.label.split("\n")[0];
  const kind = SOURCE_KIND[item.source.kind] || item.source.kind;
  const source = item.source.url
    ? `<a class="sum-src" href="${esc(item.source.url)}" target="_blank" rel="noopener noreferrer" title="${esc(label)}"><b>${esc(kind)} ↗</b><span>${esc(label.replace(/^[^:]+:\s*/, ""))}</span></a>`
    : `<span class="sum-src none" title="${esc(label)}"><b>${esc(kind)}</b><span>원문 링크 없음 · ${esc(label.replace(/^[^:]+:\s*/, ""))}</span></span>`;
  return `<article class="sum-card" data-sum-find="${esc(findText([item.title, item.summary, topic.name, label, ...item.tags]))}">
    <div class="sum-meta"><time datetime="${esc(item.date)}">${esc(dotDate(item.date))} ${weekday(item.date).slice(0, 1)}</time><span class="sum-topic">${esc(topic.name)}</span>${badge(item.status)}</div>
    <h3><a href="${p}items/${item.id}/">${esc(item.title)}</a></h3>
    <p class="sum-text">${esc(item.summary)}</p>
    ${source}
    <p class="sum-tags">${item.tags.map((tag) => `<a href="${p}map/#${tagId(tag)}">#${esc(tag)}</a>`).join("")}</p>
  </article>`;
}

function renderTimeline(p) {
  const dates = [...new Set(data.items.map((item) => item.date))].sort();
  return `<main id="content" class="cream">
  <section class="band"><div class="wrap">
    <p class="kicker">연표</p><h1 class="sec-title big">날짜별로 쌓인 장</h1>
    <p class="sub">${esc(dotDate(dates[0]))}부터 ${esc(dotDate(dates.at(-1)))}까지, 장을 추가한 날만 표시합니다.</p>
    <div class="dash"><figure class="card-panel wide">${dayChart(data.items, p)}</figure><figure class="card-panel wide">${matrixChart(dates)}</figure></div>
  </div></section>
  <section class="band alt"><div class="wrap">
    <ol class="days">${dates.map((date) => {
      const items = data.items.filter((item) => item.date === date);
      return `<li><div class="day-head"><time datetime="${date}">${esc(dotDate(date))}</time><span>${weekday(date)} · ${items.length}장</span></div><div class="day-items">${items.map((item) => `<a class="day-item" style="${topicVars(topicById[item.topic])}" href="${p}items/${item.id}/"><span class="fan-topic">${esc(topicById[item.topic].name)} · 제${chapterNo[item.id]}장</span><b>${esc(item.title)}</b>${badge(item.status)}</a>`).join("")}</div></li>`;
    }).join("")}</ol>
  </div></section>
</main>`;
}

/* ---------- reading log ---------- */

function renderReading(p) {
  const now = reading.books.filter((book) => book.status === "reading");
  const done = reading.books.filter((book) => book.status === "done");
  const pages = reading.books.reduce((n, book) => n + readingProgress(book).page, 0);
  const days = new Set(reading.logs.map((log) => log.date)).size;
  const recent = sortedLogs().reverse().slice(0, 8);
  return `<main id="content">
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <p class="hero-kicker">READING LOG · 독서 기록</p>
          <h1>읽은 책마다,<br><em>꽂아 둘 자리가 있습니다.</em></h1>
          <p class="hero-small">마지막 기록 ${esc(dotDate(reading.updatedAt.slice(0, 10)))} · 책장 ${shelves.length}칸 ${reading.books.length}권</p>
        </div>
        <div class="hero-side">
          <p>분류별 책장에 읽는 중인 책과 다 읽은 책을 꽂아 둡니다. 읽는 중이면 진행률을, 다 읽었으면 완독한 달을 표지 밑에 적습니다.</p>
        </div>
      </div>
      <nav class="hero-pills" aria-label="독서 분류">${shelves.map((shelf) => `<a href="${p}reading/${shelf.id}/">${esc(shelf.name)} <span>${shelf.books.length}</span> →</a>`).join("")}</nav>
      <div class="shelf-head"><h2>분류별 책장</h2></div>
      <div class="shelf"><div class="shelf-row books-few" style="--n:${shelves.length}">${shelves.map((shelf) => shelfCover(shelf, p)).join("")}</div></div>
      <div class="shelf-head"><h2>지금 읽는 책</h2><span class="shelf-note">${now.length}권</span></div>
      ${now.length ? `<div class="rb-grid">${now.map((book) => readingBook(book, p, true)).join("")}</div>` : `<p class="hero-small">지금 읽는 책이 없습니다.</p>`}
    </div>
  </section>

  <section class="cream band">
    <div class="wrap">
      <p class="kicker">한눈에 보기</p>
      <h2 class="sec-title">독서 기록의 모양</h2>
      <p class="sub">책마다 마지막으로 적은 쪽수와 기록한 날을 셌습니다.</p>
      <div class="kpis">
        <div><b>${reading.books.length}</b><span>권</span></div>
        <div><b>${now.length}</b><span>📖 읽는 중</span></div>
        <div><b>${done.length}</b><span>✅ 완독</span></div>
        <div><b>${pages.toLocaleString("ko-KR")}</b><span>읽은 쪽</span></div>
        <div><b>${days}</b><span>기록한 날</span></div>
      </div>
      ${recent.length ? `<figure class="card-panel"><div class="fig-title">최근 기록</div><ol class="rlog">${recent.map(({ log, gained }) => {
        const book = reading.books.find((b) => b.id === log.bookId);
        const shelf = shelfOf(book);
        const what = log.to == null ? "독서 시간" : log.mode === "range" ? `${log.from}~${log.to}쪽` : `${log.to}쪽까지`;
        return `<li style="${topicVars(shelf)}"><time datetime="${esc(log.date)}">${esc(dotDate(log.date))}</time><a href="${p}reading/books/${esc(book.id)}/">${esc(book.title)}</a><span>${esc(what)}${log.to != null ? ` <b>+${gained}쪽</b>` : ""}${log.minutes ? ` · ${log.minutes}분` : ""}</span></li>`;
      }).join("")}</ol></figure>` : ""}
    </div>
  </section>
</main>`;
}

/* ---------- PoRA ---------- */

function renderPora(p) {
  const ext = `target="_blank" rel="noopener noreferrer"`;
  return `<main id="content" class="cream" style="${topicVars(pora)}">
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <p class="hero-kicker">${esc(pora.short)} · ${esc(pora.license)}</p>
          <h1>${esc(pora.title)}<br><em>(${esc(pora.short)})</em></h1>
          <p class="hero-small">${esc(pora.authors)} (${esc(pora.org)}) · ${esc(dotDate(pora.announcement.date))} 공개</p>
        </div>
        <div class="hero-side">
          <p>${esc(pora.intro)}</p>
          <a class="hero-link" href="${esc(pora.announcement.url)}" ${ext}>출처: ${esc(pora.announcement.label)} ↗</a>
        </div>
      </div>
    </div>
  </section>

  <section class="band" id="pora-links">
    <div class="wrap">
      <p class="kicker">바로가기</p>
      <h2 class="sec-title">교재와 강의 자료</h2>
      <p class="sub">카드를 누르면 새 탭에서 열립니다.</p>
      <ul class="pora-links">${pora.links.map((link) => `<li><a class="pora-link" href="${esc(link.url)}" ${ext}><span class="pora-ico" aria-hidden="true">${link.icon}</span><span class="pora-txt"><b>${esc(link.label)}</b><small>${esc(link.desc)}</small><span class="pora-url">${esc(new URL(link.url).host)}</span></span><span class="pora-go" aria-hidden="true">↗</span><span class="sr-only">(새 탭)</span></a></li>`).join("")}</ul>
    </div>
  </section>

  <section class="band alt" id="pora-progress">
    <div class="wrap pora-progress">
      <p class="kicker">공부 진도</p>
      <h2 class="sec-title">자율성 스택 체크리스트</h2>
      <p class="sub">다 공부한 단원에 체크하세요. 체크 상태는 이 브라우저(localStorage)에만 저장됩니다.</p>
      <figure class="card-panel" data-pora>
        <div class="meter" role="progressbar" aria-label="공부 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-pora-meter><i style="width:0%"></i></div>
        <p class="meter-label"><b data-pora-pct>0%</b><span data-pora-count>0 / ${pora.checklist.length} 단원</span></p>
        <ol class="checks pora-checks">${pora.checklist.map((step) => `<li><label><input type="checkbox" data-pora-check="${esc(step.id)}"><span><b>${esc(step.label)}</b> <small>${esc(step.en)}</small></span></label></li>`).join("")}</ol>
        <p class="pora-reset"><button type="button" class="btn ghost" data-pora-reset>체크 모두 지우기</button></p>
      </figure>
    </div>
  </section>
</main>`;
}

/* ---------- 장쉐친 게임이론 ---------- */

function renderGameTheory(p) {
  const ext = `target="_blank" rel="noopener noreferrer"`;
  const eps = gt.episodes;
  const hours = Math.round(eps.reduce((sum, ep) => sum + seconds(ep.duration), 0) / 3600);
  return `<main id="content" class="cream" style="${topicVars(GT)}">
  ${gtNotice()}
  <section class="hero" id="gt-about">
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <p class="hero-kicker">${esc(gt.channel)} · ${esc(gt.series)}</p>
          <h1>${esc(GT.lecturer)}의<br><em>게임이론</em></h1>
          <p class="hero-small">#1~#${eps.length} · ${esc(dotDate(eps[0].publishedDate))} ~ ${esc(dotDate(eps.at(-1).publishedDate))} · 약 ${hours}시간</p>
        </div>
        <div class="hero-side">
          <p>${esc(gt.channel)} 채널에서 ${esc(GT.lecturer)}(${esc(GT.lecturerEn)})이 한 학기 동안 강의한 ${esc(gt.series)} 시리즈입니다. 데이팅 게임에서 시작해 교육·이민·금융·전쟁·AI까지, 행위자들의 이익과 전략으로 세상을 읽는 그의 관점을 회차별로 요약했습니다.</p>
          <p class="gt-hero-links"><a class="hero-link" href="${esc(gt.channelUrl)}" ${ext}>${esc(gt.channel)} 채널 ↗</a><a class="hero-link" href="${esc(gt.playlistUrl)}" ${ext}>${esc(gt.series)} 재생목록 ↗</a></p>
        </div>
      </div>
    </div>
  </section>

  <section class="band" id="gt-episodes">
    <div class="wrap">
      <p class="kicker">회차 목록</p>
      <h2 class="sec-title">#1부터 #${eps.length}까지</h2>
      <p class="sub">카드를 누르면 그 회차의 요약·핵심 포인트·영상으로 갑니다.</p>
      <div class="sum-tools">
        <label class="sum-search"><span class="sr-only">회차 검색</span>${ICON.search}<input type="search" placeholder="번호·제목·요약·개념으로 검색" autocomplete="off" data-gt-search></label>
      </div>
      <p class="sum-count" data-gt-count aria-live="polite">${eps.length}회</p>
      <ol class="gt-grid">${eps.map((ep) => episodeCard(ep, p)).join("")}</ol>
      <p class="empty" data-gt-empty hidden>맞는 회차가 없습니다.</p>
    </div>
  </section>
</main>`;
}

function episodeCard(ep, p) {
  const find = findText([`#${ep.number}`, ep.title, ep.summary, ...ep.keyPoints, ...ep.keyConcepts]);
  return `<li data-gt-find="${esc(find)}"><a class="gt-card" href="${p}game-theory/${ep.number}/">
    <span class="gt-no">#${ep.number}</span>
    <span class="gt-meta"><time datetime="${esc(ep.publishedDate)}">${esc(dotDate(ep.publishedDate))}</time><span>${esc(ep.duration)}</span>${ep.summarySource === "description" ? `<span class="gt-src">설명 기반</span>` : ""}</span>
    <h3>${esc(episodeTitle(ep))}</h3>
    <span class="gt-lede">${esc(firstSentence(ep.summary))}</span>
    <span class="gt-tags">${ep.keyConcepts.map((c) => `<span>#${esc(c)}</span>`).join("")}</span>
  </a></li>`;
}

function renderEpisode(ep, p) {
  const eps = gt.episodes;
  const index = eps.indexOf(ep);
  const prev = eps[index - 1];
  const next = eps[index + 1];
  const ext = `target="_blank" rel="noopener noreferrer"`;
  const title = episodeTitle(ep);
  const sections = [
    { id: "video", title: "영상", html: `<div class="yt-wrap"><button type="button" class="yt" data-yt="${esc(ep.videoId)}" data-title="${esc(ep.title)}"><img src="https://i.ytimg.com/vi/${esc(ep.videoId)}/hqdefault.jpg" alt="" loading="lazy"><span>▶ 영상 재생</span></button><p class="gt-video-links"><a href="${esc(ep.url)}" ${ext}>YouTube에서 열기 ↗</a>${ep.reuploadUrl ? `<a href="${esc(ep.reuploadUrl)}" ${ext}>재업로드 영상 ↗</a>` : ""}</p>${ep.reuploadUrl ? `<p class="muted gt-reupload">원본 영상을 볼 수 없으면 재업로드 영상을 보세요.</p>` : ""}</div>` },
    { id: "summary", title: "요약", html: `<div class="prose">${paragraphs(ep.summary).map((t) => `<p>${esc(t)}</p>`).join("")}</div>` },
    { id: "points", title: "핵심 포인트", html: `<div class="key-box"><ul class="key-list">${ep.keyPoints.map((point) => `<li>${esc(point)}</li>`).join("")}</ul></div>` },
    { id: "concepts", title: "핵심 개념", html: `<p class="gt-concepts">${ep.keyConcepts.map((c) => `<a class="tag" href="${p}game-theory/?q=${encodeURIComponent(c)}">#${esc(c)}</a>`).join("")}</p><p class="muted gt-concepts-note">개념을 누르면 그 개념이 나오는 회차를 찾습니다.</p>` },
  ];
  return `<main id="content" class="cream" style="${topicVars(GT)}">
  ${gtNotice()}
  <div class="reader">
    <article class="reader-main">
      <nav class="crumbs" aria-label="경로"><a href="${p}game-theory/">${esc(GT.tab)}</a><span aria-hidden="true">/</span><span>#${ep.number}</span></nav>
      <p class="ch-no">#${ep.number} <span>${esc(gt.series)} · ${esc(gt.channel)}</span></p>
      <h1 class="ch-title">${esc(title)}</h1>
      <div class="ch-meta"><span class="tag"><time datetime="${esc(ep.publishedDate)}">${esc(dotDate(ep.publishedDate))} ${weekday(ep.publishedDate).slice(0, 1)}</time></span><span class="tag">${esc(ep.duration)}</span><span class="badge ${ep.summarySource === "description" ? "st-reading" : "st-done"}">${ep.summarySource === "description" ? "영상 설명 기반 요약" : "자막 기반 요약"}</span></div>
      ${ep.summarySource === "description" ? `<aside class="callout warn"><b>참고</b><p>자막 없이 영상 설명만으로 요약함</p></aside>` : ""}
      ${sections.map((s, i) => `<section class="ch-sec" id="${s.id}"><h2><span class="sec-no">${pad(i + 1)}</span>${esc(s.title)}</h2>${s.html}</section>`).join("")}
      <nav class="pager" aria-label="앞뒤 회차">
        ${prev ? `<a class="prev" href="${p}game-theory/${prev.number}/"><small>← 이전 회차 · #${prev.number}</small><b>${esc(episodeTitle(prev))}</b></a>` : `<a class="prev" href="${p}game-theory/"><small>← 첫 회차 · 회차 목록</small><b>${esc(GT.tab)}</b></a>`}
        ${next ? `<a class="next" href="${p}game-theory/${next.number}/"><small>다음 회차 · #${next.number} →</small><b>${esc(episodeTitle(next))}</b></a>` : `<a class="next" href="${p}game-theory/"><small>마지막 회차 · 회차 목록 →</small><b>${esc(GT.tab)}</b></a>`}
      </nav>
    </article>
    <aside class="otp" aria-label="이 페이지 목차"><p>이 페이지에서</p><ol>${sections.map((s) => `<li><a href="#${s.id}" data-otp="${s.id}">${esc(s.title)}</a></li>`).join("")}</ol></aside>
  </div>
</main>`;
}

function gtNotice() {
  return `<div class="gt-notice" role="note"><div class="wrap"><p><b>고지</b> ${esc(GT_NOTICE)}</p></div></div>`;
}

// "Game Theory #1: The Dating Game" → "The Dating Game"
function episodeTitle(ep) {
  return ep.title.replace(/^Game Theory #\d+:\s*/, "");
}

function seconds(duration) {
  return duration.split(":").reduce((sum, part) => sum * 60 + Number(part), 0);
}

function renderShelf(shelf, p) {
  const now = shelf.books.filter((book) => book.status === "reading").length;
  const done = shelf.books.length - now;
  return `<main id="content" class="cream" style="${topicVars(shelf)}">
  <section class="book-hero">
    <div class="wrap book-hero-grid">
      <div class="book-hero-cover">${shelfCover(shelf, p, true)}</div>
      <div>
        <nav class="crumbs" aria-label="경로"><a href="${p}">홈</a><span aria-hidden="true">/</span><a href="${p}reading/">독서 기록</a><span aria-hidden="true">/</span><span>${esc(shelf.name)}</span></nav>
        <p class="kicker">${esc(shelf.en)}</p>
        <h1>${esc(shelf.name)} 책장</h1>
        <p class="lede">${esc(shelf.blurb)}</p>
        <dl class="book-facts">
          <div><dt>권</dt><dd>${shelf.books.length}</dd></div>
          <div><dt>📖 읽는 중</dt><dd>${now}</dd></div>
          <div><dt>✅ 완독</dt><dd>${done}</dd></div>
        </dl>
      </div>
    </div>
  </section>
  <section class="band">
    <div class="wrap">
      <p class="kicker">꽂힌 책</p>
      <h2 class="sec-title">${esc(shelf.name)} ${shelf.books.length}권</h2>
      <p class="sub">읽는 중인 책은 마지막으로 적은 쪽수로 진행률을, 다 읽은 책은 완독한 달을 표지 밑에 적었습니다.</p>
      ${shelf.books.length ? `<div class="rb-grid">${shelf.books.map((book) => readingBook(book, p)).join("")}</div>` : `<p class="empty">아직 이 책장에 꽂힌 책이 없습니다.</p>`}
    </div>
  </section>
</main>`;
}

function renderBook(book, p) {
  const shelf = shelfOf(book);
  const logs = sortedLogs().filter(({ log }) => log.bookId === book.id).reverse();
  const facts = [
    ["분류", book.subcategory ? `${book.category} · ${book.subcategory.split(">").at(-1).trim()}` : book.category],
    ["출판사", book.publisher],
    ["출간일", book.pubDate && dotDate(book.pubDate)],
    ["쪽수", book.pages && `${book.pages}쪽`],
    ["ISBN", book.isbn],
    ["읽기 시작", book.startDate && dotDate(book.startDate)],
    ["완독", book.endDate && dotDate(book.endDate)],
  ].filter(([, v]) => v);
  return `<main id="content" class="cream" style="${topicVars(shelf)}">
  <section class="book-hero">
    <div class="wrap book-hero-grid">
      <div class="book-hero-cover rb">${coverFace(book, p)}</div>
      <div>
        <nav class="crumbs" aria-label="경로"><a href="${p}">홈</a><span aria-hidden="true">/</span><a href="${p}reading/">독서 기록</a><span aria-hidden="true">/</span><a href="${p}reading/${shelf.id}/">${esc(shelf.name)}</a><span aria-hidden="true">/</span><span>${esc(book.title)}</span></nav>
        <p class="kicker">${esc(book.subcategory || book.category)}</p>
        <h1>${esc(book.title)}</h1>
        <p class="lede">${esc(book.author)}${book.memo ? ` · ${esc(book.memo)}` : ""}</p>
        <div class="rb-detail-status">${readingStatus(book)}</div>
        <dl class="book-facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <p>${book.kyoboUrl ? `<a class="btn" href="${esc(book.kyoboUrl)}" target="_blank" rel="noopener noreferrer">교보문고에서 보기 ↗</a> ` : ""}<a class="btn ghost" href="${p}reading/${shelf.id}/">${esc(shelf.name)} 책장 →</a></p>
      </div>
    </div>
  </section>
  <section class="band">
    <div class="wrap">
      <p class="kicker">읽은 기록</p>
      <h2 class="sec-title">쪽수 기록 ${logs.length}개</h2>
      ${logs.length ? `<figure class="card-panel"><ol class="rlog">${logs.map(({ log, gained }) => {
        const what = log.to == null ? "독서 시간" : log.mode === "range" ? `${log.from}~${log.to}쪽` : `${log.to}쪽까지`;
        return `<li><time datetime="${esc(log.date)}">${esc(dotDate(log.date))}</time><span>${log.note ? esc(log.note) : ""}</span><span>${esc(what)}${log.to != null ? ` <b>+${gained}쪽</b>` : ""}${log.minutes ? ` · ${log.minutes}분` : ""}</span></li>`;
      }).join("")}</ol></figure>` : `<p class="empty">아직 기록이 없습니다.</p>`}
    </div>
  </section>
</main>`;
}

function coverFace(book, p) {
  const face = book.cover
    ? `<img src="${p}${esc(book.cover)}" alt="${esc(book.title)} 표지" loading="lazy">`
    : `<span class="rb-blank"><b>${esc(book.title)}</b><small>${esc(book.author)}</small></span>`;
  return `<span class="rb-face">${face}</span>`;
}

function shelfCover(shelf, p, big = false) {
  return `<a class="book${big ? " big" : ""}" href="${p}reading/${shelf.id}/" style="${topicVars(shelf)}" aria-label="${esc(shelf.name)} 책장 열기">
    <span class="book-label">${esc(shelf.en)}</span>
    <span class="book-title">${esc(shelf.name)}</span>
    <span class="book-art" aria-hidden="true">${shelfArt(shelf.id)}</span>
    <span class="book-foot"><span>ReadingLog</span><em>${shelf.books.length}권</em></span>
  </a>`;
}

function readingBook(book, p, onHero = false) {
  const shelf = shelfOf(book);
  const href = `${p}reading/books/${book.id}/`;
  const pub = [book.publisher, book.pubDate && dotDate(book.pubDate), book.pages && `${book.pages}쪽`].filter(Boolean);
  return `<article class="rb" id="${esc(book.id)}" style="${topicVars(shelf)}">
    <a class="rb-cover" href="${href}" aria-label="${esc(book.title)} 자세히 보기">${coverFace(book, p)}</a>
    ${readingStatus(book)}
    <a class="rb-title" href="${href}">${esc(book.title)}</a>
    <small class="rb-meta">${esc(book.author)}${book.memo ? ` · ${esc(book.memo)}` : ""}</small>
    ${pub.length ? `<small class="rb-meta">${pub.map(esc).join(" · ")}</small>` : ""}
    <small class="rb-meta rb-sub">${esc(onHero ? shelf.name : "")}${book.subcategory ? `${onHero ? " · " : ""}${esc(book.subcategory.split(">").at(-1).trim())}` : ""}</small>
  </article>`;
}

function readingStatus(book) {
  if (book.status === "done") {
    const when = book.endDate ? `${book.endDate.slice(0, 4)}년 ${Number(book.endDate.slice(5, 7))}월` : "완독";
    const stars = book.rating ? ` · ${"★".repeat(book.rating)}` : "";
    return `<p class="rb-status done"><b>${esc(when)}</b><span>✅ 완독${esc(stars)}</span></p>`;
  }
  const { page, pct } = readingProgress(book);
  return `<p class="rb-status reading"><span class="rb-bar" role="progressbar" aria-label="진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span><b>${pct}%</b><span>📖 읽는 중 · ${page}/${book.totalPages}쪽</span></p>`;
}

// 진행률은 이 책의 가장 최근 쪽수 기록(날짜, 같은 날이면 기록 시각 순) 기준
function readingProgress(book) {
  if (book.status === "done") return { page: book.totalPages, pct: 100 };
  const last = sortedLogs().map(({ log }) => log).filter((log) => log.bookId === book.id && log.to != null).at(-1);
  const page = Math.min(last ? last.to : 0, book.totalPages);
  return { page, pct: Math.round((page / book.totalPages) * 100) };
}

function sortedLogs() {
  const sorted = [...reading.logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created || 0) - (b.created || 0)));
  const cur = {};
  return sorted.map((log) => {
    const prev = cur[log.bookId] || 0;
    if (log.to == null) return { log, gained: 0 };
    const gained = log.mode === "range" ? Math.max(0, log.to - log.from + 1) : Math.max(0, log.to - prev);
    cur[log.bookId] = Math.max(prev, log.to);
    return { log, gained };
  });
}

function readingShelves(books) {
  const names = Object.keys(SHELF_META).filter((name) => SHELF_META[name].always);
  for (const book of books) if (!names.includes(book.category)) names.push(book.category);
  let extra = 0;
  return names.map((name) => {
    const meta = SHELF_META[name] || { id: `shelf-${++extra}`, en: "Shelf", color: "#3f6b4f", colorDark: "#a8d8b6", blurb: `${name}으로 분류한 책입니다.` };
    const list = books.filter((book) => book.category === name).sort(byReadingOrder);
    return { ...meta, name, books: list };
  });
}

// 읽는 중인 책 먼저(최근 시작 순), 다음 완독한 책(최근 완독 순)
function byReadingOrder(a, b) {
  if (a.status !== b.status) return a.status === "reading" ? -1 : 1;
  const ka = a.status === "done" ? a.endDate : a.startDate;
  const kb = b.status === "done" ? b.endDate : b.startDate;
  return ka < kb ? 1 : ka > kb ? -1 : 0;
}

function shelfOf(book) {
  return shelfByName[book.category];
}

function shelfArt(id) {
  const common = `viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;
  if (id === "literature") return `<svg ${common}><path d="M58 14C40 18 28 32 24 56l-6 10"/><path d="M58 14c-2 14-10 26-24 32"/><path d="M30 40h12M27 48h8"/></svg>`;
  if (id === "nonfiction") return `<svg ${common}><circle cx="40" cy="40" r="24"/><path d="M16 40h48M40 16c-8 7-11 15-11 24s3 17 11 24M40 16c8 7 11 15 11 24s-3 17-11 24"/></svg>`;
  return `<svg ${common}><rect x="14" y="20" width="12" height="42" rx="2"/><rect x="29" y="14" width="12" height="48" rx="2"/><path d="M46 22l11-3 10 40-11 3z"/><path d="M10 64h60"/></svg>`;
}

/* ---------- covers ---------- */

function bookCover(topic, p, big = false) {
  return `<a class="book${big ? " big" : ""}" href="${p}topics/${topic.id}/" style="${topicVars(topic)}" aria-label="${esc(topic.name)} 책 펼치기">
    <span class="book-label">${esc(topic.en)}</span>
    <span class="book-title">${esc(topic.name)}</span>
    <span class="book-art" aria-hidden="true">${art(topic.id)}</span>
    <span class="book-foot"><span>${esc(topic.en.replace(/\s|&/g, ""))}Book</span><em>${itemsByTopic[topic.id].length}장</em></span>
  </a>`;
}

function chapterCover(item, p) {
  const topic = topicById[item.topic];
  const main = item.visuals.find((v) => v.type !== "quote" && v.type !== "callout") || item.visuals[0];
  return `<a class="book small" href="${p}items/${item.id}/" style="${topicVars(topic)}">
    <span class="book-label">${esc(topic.name)} · ${pad(chapterNo[item.id])}</span>
    <span class="book-title">${esc(item.title)}</span>
    <span class="book-art" aria-hidden="true">${glyph(main ? main.type : "quote")}</span>
    <span class="book-foot">${esc(dotDate(item.date))}</span>
  </a>`;
}

function miniCover(topic) {
  return `<span class="mini-cover" style="${topicVars(topic)}" aria-hidden="true">${art(topic.id)}</span>`;
}

/* ---------- charts ---------- */

function barRows(visual) {
  const rows = visual.type === "bars" ? visual.rows.map((row) => ({ label: row.label, values: [row.value] })) : visual.rows;
  const series = visual.series || [visual.title || "값"];
  return { rows, series };
}

function shown(value, unit) {
  if (value == null) return "–";
  return `${value}${unit && !String(value).includes(unit) ? unit : ""}`;
}

function barSvg(visual) {
  const { rows, series } = barRows(visual);
  const nums = rows.flatMap((row) => row.values.filter((v) => v != null).map(Number.parseFloat));
  const lo = Math.min(0, ...nums);
  const hi = Math.max(0, ...nums, 0.0001);
  const W = 640;
  const x0 = lo < 0 ? 64 : 8;
  const x1 = W - 64;
  const sx = (v) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const bh = 18;
  const gap = 4;
  const labelH = 24;
  const groupGap = 18;
  let y = 4;
  const parts = [];
  for (const row of rows) {
    parts.push(`<text class="row-label" x="${x0}" y="${y + 15}">${esc(row.label)}</text>`);
    y += labelH;
    row.values.forEach((value, i) => {
      const tip = `${row.label}${series.length > 1 ? ` · ${series[i]}` : ""}: ${shown(value, visual.unit)}`;
      if (value == null) {
        parts.push(`<text class="val muted" x="${sx(0) + 6}" y="${y + bh - 5}">${esc(series[i])} 자료 없음</text>`);
      } else {
        const n = Number.parseFloat(value);
        const a = sx(Math.min(0, n));
        const w = Math.max(n === 0 ? 0 : 2, Math.abs(sx(n) - sx(0)));
        parts.push(`<rect class="bar s${i}" data-s="${i}" x="${a.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${bh}" rx="3" data-tip="${esc(tip)}"><title>${esc(tip)}</title></rect>`);
        const tx = n < 0 ? a - 6 : a + w + 6;
        parts.push(`<text class="val" data-s="${i}" x="${tx.toFixed(1)}" y="${y + bh - 5}" text-anchor="${n < 0 ? "end" : "start"}">${esc(shown(value, visual.unit))}</text>`);
      }
      y += bh + gap;
    });
    y += groupGap;
  }
  const H = y - groupGap + 4;
  const zero = `<line class="zero" x1="${sx(0).toFixed(1)}" x2="${sx(0).toFixed(1)}" y1="0" y2="${H}"/>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(visual.title || "막대그래프")}">${zero}${parts.join("")}</svg>`;
}

function barFigure(visual) {
  const { rows, series } = barRows(visual);
  const legend = series.length > 1
    ? `<div class="legend" role="group" aria-label="계열 켜고 끄기">${series.map((name, i) => `<button type="button" data-series="${i}" aria-pressed="true"><i class="sw s${i}"></i>${esc(name)}</button>`).join("")}<span class="legend-hint">눌러서 계열 켜고 끄기</span></div>`
    : "";
  const table = `<details class="tbl"><summary>표로 보기</summary><table class="num-table"><thead><tr><th>항목</th>${series.map((name) => `<th>${esc(name)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr><th>${esc(row.label)}</th>${row.values.map((value) => `<td>${esc(shown(value, visual.unit))}</td>`).join("")}</tr>`).join("")}</tbody></table></details>`;
  return `<div class="fig-title">${esc(visual.title || "")}${visual.unit ? ` <small>단위 ${esc(visual.unit)}</small>` : ""}</div>${legend}<div class="chart-box">${barSvg(visual)}</div>${table}`;
}

function chartThumb(visual) {
  if (visual.type === "grouped-bar" || visual.type === "bars") return columnThumb(visual);
  if (visual.type === "range") return `<div class="thumb-pad">${renderRange(visual)}</div>`;
  if (visual.type === "meter") return `<div class="thumb-pad">${renderMeter(visual)}</div>`;
  return glyph(visual.type);
}

function columnThumb(visual) {
  const { rows, series } = barRows(visual);
  const nums = rows.flatMap((row) => row.values.filter((v) => v != null).map(Number.parseFloat));
  const lo = Math.min(0, ...nums);
  const hi = Math.max(0, ...nums, 0.0001);
  const W = 300;
  const H = 140;
  const top = 8;
  const bottom = H - 22;
  const sy = (v) => top + ((hi - v) / (hi - lo)) * (bottom - top);
  const groupW = (W - 20) / rows.length;
  const bw = Math.min(26, (groupW - 16) / series.length - 3);
  const parts = rows.map((row, r) => {
    const gx = 10 + r * groupW + (groupW - series.length * (bw + 3)) / 2;
    const bars = row.values.map((value, i) => {
      if (value == null) return "";
      const n = Number.parseFloat(value);
      const y = sy(Math.max(0, n));
      const h = Math.max(n === 0 ? 0 : 2, Math.abs(sy(n) - sy(0)));
      return `<rect class="s${i}" x="${(gx + i * (bw + 3)).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"/>`;
    }).join("");
    return `${bars}<text class="tick" x="${(10 + r * groupW + groupW / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(row.label)}</text>`;
  }).join("");
  return `<svg class="chart thumb" viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="zero" x1="6" x2="${W - 6}" y1="${sy(0).toFixed(1)}" y2="${sy(0).toFixed(1)}"/>${parts}</svg>`;
}

function renderRange(visual) {
  const min = Number.parseFloat(visual.min);
  const max = Number.parseFloat(visual.max);
  const value = Number.parseFloat(visual.value);
  const pct = ((value - min) / (max - min)) * 100;
  return `<div class="fig-title">${esc(visual.title)}</div><div class="range" role="img" aria-label="${esc(visual.value + visual.unit)}, 범위 ${esc(visual.min)}~${esc(visual.max)}${esc(visual.unit)}">
    <div class="range-track"><span class="range-mark" style="left:${pct.toFixed(1)}%"></span><b class="range-now" style="left:${Math.min(90, Math.max(10, pct)).toFixed(1)}%">현재 ${esc(visual.value)}${esc(visual.unit)}</b></div>
    <div class="range-labels"><span>최저 ${esc(visual.min)}${esc(visual.unit)}</span><span>최고 ${esc(visual.max)}${esc(visual.unit)}</span></div>
  </div>`;
}

function renderMeter(visual) {
  const width = Number.parseFloat(visual.value);
  return `<div class="fig-title">${esc(visual.title)}</div><div class="meter" role="img" aria-label="${esc(visual.label)}"><i style="width:${width}%"></i></div><div class="meter-label"><b>${esc(visual.label)}</b><span>${(visual.notes || []).map(esc).join(" · ")}</span></div>`;
}

function compareRows(items) {
  const out = [];
  for (const item of items) {
    for (const [vi, v] of item.visuals.entries()) {
      if (v.type !== "grouped-bar") continue;
      const a = v.series.indexOf("실제");
      const e = v.series.indexOf("예상");
      if (a < 0 || e < 0) continue;
      for (const row of v.rows) {
        if (row.values[a] == null || row.values[e] == null) continue;
        out.push({ item, vi, name: v.title, period: row.label, actual: row.values[a], expected: row.values[e], unit: v.unit });
      }
    }
  }
  return out;
}

function compareChart(rows, p) {
  const groups = [...new Set(rows.map((r) => r.period))];
  const legend = `<div class="legend static"><span><i class="dot s0"></i>실제</span><span><i class="dot s1 hollow"></i>예상</span></div>`;
  const panels = groups.map((period) => {
    const list = rows.filter((r) => r.period === period);
    const nums = list.flatMap((r) => [Number.parseFloat(r.actual), Number.parseFloat(r.expected)]);
    const ticks = niceTicks(Math.min(0, ...nums), Math.max(...nums));
    const lo = ticks[0];
    const hi = ticks.at(-1);
    const W = 720;
    const L = 190;
    const R = 96;
    const sx = (v) => L + ((v - lo) / (hi - lo)) * (W - L - R);
    const rowH = 40;
    const H = 30 + list.length * rowH;
    const grid = ticks.map((t) => `<line class="grid" x1="${sx(t)}" x2="${sx(t)}" y1="22" y2="${H}"/><text class="tick" x="${sx(t)}" y="14" text-anchor="middle">${t}${esc(list[0].unit || "")}</text>`).join("");
    const marks = list.map((r, i) => {
      const y = 30 + i * rowH + rowH / 2;
      const a = Number.parseFloat(r.actual);
      const e = Number.parseFloat(r.expected);
      const verdict = a > e ? "예상 상회" : a < e ? "예상 하회" : "예상 부합";
      const tipA = `${r.name} ${r.period} 실제 ${shown(r.actual, r.unit)}`;
      const tipE = `${r.name} ${r.period} 예상 ${shown(r.expected, r.unit)}`;
      return `<a href="${p}items/${r.item.id}/#${figId(r.item, r.vi)}"><text class="row-label" x="${L - 14}" y="${y + 4}" text-anchor="end">${esc(r.name)}</text>
        <line class="link" x1="${sx(Math.min(a, e))}" x2="${sx(Math.max(a, e))}" y1="${y}" y2="${y}"/>
        <circle class="dot-e" cx="${sx(e)}" cy="${y}" r="6" data-tip="${esc(tipE)}"><title>${esc(tipE)}</title></circle>
        <circle class="dot-a" cx="${sx(a)}" cy="${y}" r="7" data-tip="${esc(tipA)}"><title>${esc(tipA)}</title></circle>
        <text class="verdict" x="${W - 4}" y="${y + 4}" text-anchor="end">${a > e ? "▲" : a < e ? "▼" : "＝"} ${verdict}</text></a>`;
    }).join("");
    const table = `<details class="tbl"><summary>표로 보기</summary><table class="num-table"><thead><tr><th>지표</th><th>실제</th><th>예상</th><th>메모</th></tr></thead><tbody>${list.map((r) => `<tr><th>${esc(r.name)}</th><td>${esc(shown(r.actual, r.unit))}</td><td>${esc(shown(r.expected, r.unit))}</td><td><a href="${p}items/${r.item.id}/">${esc(r.item.title)}</a></td></tr>`).join("")}</tbody></table></details>`;
    return `<figure class="card-panel compare"><div class="fig-title">${esc(period)}</div><svg class="chart dots" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(period)} 실제와 예상">${grid}${marks}</svg>${table}</figure>`;
  }).join("");
  return `${legend}<div class="compare-grid">${panels}</div>`;
}

function niceTicks(min, max) {
  const span = max - min || 1;
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= 5);
  const out = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.999; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

function topicCountChart(p) {
  const max = Math.max(...data.topics.map((t) => itemsByTopic[t.id].length));
  return `<div class="fig-title">책별 장 수</div><div class="hbars">${data.topics.map((t) => {
    const n = itemsByTopic[t.id].length;
    return `<a class="hbar" href="${p}topics/${t.id}/" style="${topicVars(t)}"><span class="hb-name">${esc(t.name)}</span><span class="hb-track"><i style="width:${(n / max) * 100}%" data-tip="${esc(t.name)}: ${n}장"></i></span><b>${n}</b></a>`;
  }).join("")}</div>`;
}

function statusChart(items) {
  const counts = countStatuses(items);
  const total = items.length;
  const entries = Object.entries(data.statuses);
  return `<div class="fig-title">읽기 상태</div>
  <div class="stackbar" role="img" aria-label="${entries.map(([id, s]) => `${s.label} ${counts[id] || 0}`).join(", ")}">${entries.filter(([id]) => counts[id]).map(([id, s]) => `<i class="st-${id}" style="flex:${counts[id]}" data-tip="${esc(s.label)}: ${counts[id]}장"></i>`).join("")}</div>
  <ul class="st-legend">${entries.map(([id, s]) => `<li><i class="sw st-${id}"></i>${esc(s.mark)} ${esc(s.label)} <b>${counts[id] || 0}</b><small>${total ? Math.round(((counts[id] || 0) / total) * 100) : 0}%</small></li>`).join("")}</ul>`;
}

function dayChart(items, p, onlyTopic) {
  const dates = [...new Set(items.map((item) => item.date))].sort();
  const topics = onlyTopic ? [onlyTopic] : data.topics;
  const max = Math.max(...dates.map((d) => items.filter((item) => item.date === d).length));
  const cols = dates.map((date) => {
    const segs = topics.map((t) => {
      const n = items.filter((item) => item.date === date && item.topic === t.id).length;
      return n ? `<i style="flex:${n};${topicVars(t)}" data-tip="${esc(dotDate(date))} · ${esc(t.name)} ${n}장"></i>` : "";
    }).join("");
    const n = items.filter((item) => item.date === date).length;
    return `<div class="col"><b>${n}</b><span class="col-bar" style="height:${(n / max) * 100}%">${segs}</span><time datetime="${date}">${esc(date.slice(5).replace("-", "."))}</time></div>`;
  }).join("");
  const legend = onlyTopic ? "" : `<div class="legend static">${topics.map((t) => `<span style="${topicVars(t)}"><i class="sw topic"></i>${esc(t.name)}</span>`).join("")}</div>`;
  return `<div class="fig-title">날짜별 추가</div>${legend}<div class="cols" role="img" aria-label="날짜별 추가한 장 수">${cols}</div><p class="fig-hint">장을 추가한 날만 표시했습니다.</p>`;
}

function matrixChart(dates) {
  const cell = (t, d) => data.items.filter((item) => item.topic === t.id && item.date === d).length;
  const max = Math.max(...data.topics.flatMap((t) => dates.map((d) => cell(t, d))));
  return `<div class="fig-title">책 × 날짜</div><div class="matrix" style="--days:${dates.length}" role="table" aria-label="책별 날짜별 장 수">
    <div class="mx-row head" role="row"><span role="columnheader"></span>${dates.map((d) => `<span role="columnheader">${esc(d.slice(5).replace("-", "."))}</span>`).join("")}</div>
    ${data.topics.map((t) => `<div class="mx-row" role="row" style="${topicVars(t)}"><span role="rowheader">${esc(t.name)}</span>${dates.map((d) => {
      const n = cell(t, d);
      return `<span role="cell">${n ? `<i style="--s:${(0.45 + 0.55 * (n / max)).toFixed(2)}" data-tip="${esc(t.name)} · ${esc(dotDate(d))}: ${n}장">${n}</i>` : ""}</span>`;
    }).join("")}</div>`).join("")}
  </div>`;
}

function tagCloud(items, p) {
  const tags = sortedTags(items);
  const max = Math.max(...tags.map(([, n]) => n));
  return `<div class="fig-title">태그 구름 <small>${tags.length}개</small></div><div class="tag-cloud">${tags.map(([tag, n]) => {
    const item = items.find((row) => row.tags.includes(tag));
    return `<a href="${p}map/#${tagId(tag)}" style="font-size:${(0.82 + (n / max) * 0.7).toFixed(2)}rem;${topicVars(topicById[item.topic])}" data-n="${n}">#${esc(tag)}${n > 1 ? `<small>${n}</small>` : ""}</a>`;
  }).join("")}</div>`;
}

function graphView(p) {
  const nodes = [];
  const links = [];
  const tagIndex = new Map();
  for (const topic of data.topics) {
    nodes.push({ id: `t:${topic.id}`, type: "hub", hue: hueOf(topic.color), label: topic.name, url: `${p}topics/${topic.id}/`, meta: `대주제 · 콘텐츠 ${itemsByTopic[topic.id].length}개` });
  }
  for (const item of data.items) {
    const topic = topicById[item.topic];
    nodes.push({ id: `i:${item.id}`, type: "item", hue: hueOf(topic.color), label: item.title, url: `${p}items/${item.id}/`, meta: `${topic.name} · ${dotDate(item.date)} · ${data.statuses[item.status].label}` });
    links.push([`t:${topic.id}`, `i:${item.id}`]);
    for (const tag of item.tags) {
      if (!tagIndex.has(tag)) {
        tagIndex.set(tag, 0);
        nodes.push({ id: `g:${tag}`, type: "tag", label: `#${tag}`, url: `#${tagId(tag)}`, anchor: tagId(tag) });
      }
      tagIndex.set(tag, tagIndex.get(tag) + 1);
      links.push([`i:${item.id}`, `g:${tag}`]);
    }
  }
  for (const node of nodes) if (node.type === "tag") node.meta = `태그 · 콘텐츠 ${tagIndex.get(node.label.slice(1))}개`;
  const json = JSON.stringify({ nodes, links }).replace(/</g, "\\u003c");
  return `<figure class="graph" data-graph>
    <canvas class="graph-canvas" role="img" aria-label="대주제 ${data.topics.length}개, 콘텐츠 ${data.items.length}개, 태그 ${tagIndex.size}개의 연결 그래프"></canvas>
    <div class="graph-legend" aria-hidden="true">
      <div><span><i class="g-hub"></i>대주제</span><span><i class="g-item"></i>콘텐츠</span><span><i class="g-tag"></i>태그</span></div>
      <div class="g-topics">${data.topics.map((t) => `<span style="--h:${hueOf(t.color)}"><i class="g-topic"></i>${esc(t.name)}</span>`).join("")}</div>
    </div>
    <div class="graph-zoom"><button type="button" data-graph-zoom="1" aria-label="확대">+</button><button type="button" data-graph-zoom="-1" aria-label="축소">−</button><button type="button" data-graph-fit aria-label="전체 보기">⤢</button></div>
    <div class="graph-info" data-graph-info hidden><small data-graph-meta></small><b data-graph-label></b><a data-graph-link href="#">페이지 열기 →</a></div>
    <figcaption class="graph-hint">점에 올리거나 누르면 이웃만 밝아집니다 · 드래그로 옮기기 · 휠/핀치로 확대 · 빈 곳 드래그로 이동 · 두 번 누르면 페이지로</figcaption>
    <script type="application/json" data-graph-data>${json}</script>
  </figure>
  <details class="tbl"><summary>목록으로 보기</summary><ul class="plain">${data.topics.map((t) => `<li><b>${esc(t.name)}</b>: ${itemsByTopic[t.id].map((item) => `<a href="${p}items/${item.id}/">${esc(item.title)}</a>`).join(", ")}</li>`).join("")}</ul></details>`;
}

/* ---------- small pieces ---------- */

function highlightCard(entry, p) {
  const topic = topicById[entry.item.topic];
  const rel = entry.relation ? `<em class="rel">${esc(entry.relation)}</em>` : "";
  return `<a class="hi" style="${topicVars(topic)}" href="${p}items/${entry.item.id}/">
    <span class="hi-topic">${esc(topic.name)} · ${esc(dotDate(entry.item.date))}</span>
    <b>${esc(entry.display)}</b>
    <span class="hi-label">${esc(entry.labelParts.join(" "))}</span>
    ${entry.detailParts?.length ? `<small>${esc(entry.detailParts.join(" · "))}</small>` : ""}
    ${rel}
  </a>`;
}


function glyph(type) {
  const c = `viewBox="0 0 80 56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const g = {
    "grouped-bar": `<path d="M8 50h64"/><path d="M14 50V26M20 50V32M34 50V14M40 50V22M54 50V30M60 50V36"/>`,
    bars: `<path d="M8 50h64"/><path d="M16 50V20M30 50V34M44 50V26M58 50V40"/>`,
    range: `<path d="M8 30h64"/><path d="M8 24v12M72 24v12"/><circle cx="22" cy="30" r="5" fill="currentColor"/>`,
    meter: `<rect x="8" y="22" width="64" height="12" rx="6"/><path d="M14 28h36" stroke-width="6"/>`,
    flow: `<rect x="4" y="20" width="18" height="16" rx="3"/><rect x="31" y="20" width="18" height="16" rx="3"/><rect x="58" y="20" width="18" height="16" rx="3"/><path d="M23 28h7M50 28h7"/>`,
    split: `<rect x="6" y="8" width="30" height="40" rx="3"/><rect x="44" y="8" width="30" height="40" rx="3"/><path d="M12 18h18M12 26h14M50 18h18M50 26h14"/>`,
    checklist: `<path d="M10 14l4 4 7-8M10 30l4 4 7-8M10 46l4 4 7-8"/><path d="M30 14h40M30 30h40M30 46h30"/>`,
    timeline: `<path d="M6 28h68"/><circle cx="14" cy="28" r="4"/><circle cx="34" cy="28" r="4"/><circle cx="54" cy="28" r="4"/><circle cx="70" cy="28" r="4" fill="currentColor"/>`,
    stack: `<rect x="22" y="6" width="36" height="9" rx="2"/><rect x="16" y="18" width="48" height="9" rx="2"/><rect x="10" y="30" width="60" height="9" rx="2"/><rect x="4" y="42" width="72" height="9" rx="2"/>`,
    stats: `<rect x="6" y="10" width="30" height="36" rx="4"/><rect x="44" y="10" width="30" height="36" rx="4"/><path d="M14 24h14M52 24h14" stroke-width="4"/><path d="M14 36h10M52 36h10"/>`,
    quote: `<path d="M18 36c0-10 4-16 12-18M44 36c0-10 4-16 12-18"/><circle cx="22" cy="38" r="5"/><circle cx="48" cy="38" r="5"/>`,
    callout: `<rect x="8" y="10" width="64" height="30" rx="6"/><path d="M22 40l-4 10 12-10"/>`,
  };
  return `<svg class="glyph" ${c} aria-hidden="true">${g[type] || g.quote}</svg>`;
}

function art(id) {
  const common = `viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;
  if (id === "ai-education") return `<svg ${common}><path d="M14 24h22c4 4 8 4 12 0h18v34c-5 3-8 3-13 0H36c-4 3-8 3-12 0H14V24z"/><path d="M40 24v34"/><path d="M20 32h12M20 38h10M48 32h12M48 38h10"/></svg>`;
  if (id === "economy") return `<svg ${common}><path d="M12 58h56"/><path d="M20 58V40M32 58V28M44 58V36M56 58V18"/><path d="M16 22h18l6 8 10-12 12 8"/></svg>`;
  if (id === "agents") return `<svg ${common}><circle cx="22" cy="26" r="6"/><circle cx="54" cy="22" r="6"/><circle cx="40" cy="52" r="7"/><path d="M27 30l8 16M49 28l-6 17M28 26h20"/></svg>`;
  return `<svg ${common}><path d="M10 48c10-16 18-22 30-22s20 8 30 22"/><path d="M18 48h44"/><path d="M40 26v22"/><circle cx="40" cy="22" r="3" fill="currentColor" stroke="none"/></svg>`;
}

// 그래프 색은 사이트의 대주제 색과 같은 색조(hue)에서 채도를 낮춰 만든다
function hueOf(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

function topicVars(topic) {
  return `--c-l:${topic.color};--c-d:${topic.colorDark}`;
}

function badge(status) {
  const s = data.statuses[status];
  return `<span class="badge st-${status}">${esc(s.mark)} ${esc(s.label)}</span>`;
}

function figId(item, vi) {
  return `fig-${vi + 1}`;
}

function tagId(tag) {
  return `tag-${encodeURIComponent(tag).replace(/%/g, "")}`;
}

function paragraphs(text) {
  const parts = text.split(/(?<=다\.)\s+/).map((part) => part.trim()).filter(Boolean);
  const merged = [];
  for (const part of parts) {
    if (merged.length && part.length < 28) merged[merged.length - 1] += ` ${part}`;
    else merged.push(part);
  }
  return merged.length ? merged : [text];
}

function firstSentence(text) {
  const m = text.match(/^.+?(?:다\.|\.)(?=\s|$)/);
  return m ? m[0] : text;
}

function rotate(list, n) {
  return list.slice(n).concat(list.slice(0, n));
}

function recentItems(n) {
  return [...data.items].sort(byDateDesc).slice(0, n);
}

function byDateDesc(a, b) {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : data.items.indexOf(b) - data.items.indexOf(a);
}

function countStatuses(items) {
  const counts = {};
  for (const item of items) counts[item.status] = (counts[item.status] || 0) + 1;
  return counts;
}

function sortedTags(items) {
  const tags = new Map();
  for (const item of items) for (const tag of item.tags) tags.set(tag, (tags.get(tag) || 0) + 1);
  return [...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
}

function weekday(iso) {
  return "일월화수목금토"[new Date(`${iso}T00:00:00Z`).getUTCDay()] + "요일";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function dotDate(iso) {
  return iso.replaceAll("-", ".");
}

function findText(parts) {
  return parts.join(" ").normalize("NFC").toLowerCase();
}

function youtubeId(url) {
  if (!url) return "";
  const match = url.match(/(?:youtu\.be\/|v=)([\w-]{6,})/);
  return match ? match[1] : "";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function searchIndex() {
  return [
    ...data.topics.map((t) => ({ k: "책", t: t.name, s: t.blurb, g: [t.en], u: `topics/${t.id}/`, c: t.color })),
    ...data.items.map((item) => ({ k: `${topicById[item.topic].name} · 제${chapterNo[item.id]}장`, t: item.title, s: item.summary, g: item.tags, d: item.date, u: `items/${item.id}/`, c: topicById[item.topic].color })),
  ];
}

function sitemap(rels) {
  const urls = rels.map((rel) => {
    const loc = rel === "index.html" ? `${data.site}/` : `${data.site}/${rel.replace(/index\.html$/, "")}`;
    return `  <url><loc>${loc}</loc></url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function validate(archive) {
  const tokenRe = /\d+(?:\.\d+)?/g;
  const tokens = (text) => new Set(String(text).match(tokenRe) || []);
  const need = (summary, text, ctx) => {
    if (text == null || text === "") return;
    if (!summary.includes(text)) throw new Error(`${ctx}: not in summary: ${text}`);
  };
  const checkValue = (caption, value, ctx) => {
    if (value == null) return;
    const found = tokens(caption);
    for (const tok of String(value).match(tokenRe) || []) {
      if (!found.has(tok)) throw new Error(`${ctx}: ${tok} missing from caption`);
    }
  };
  const byTopic = {};
  for (const topic of archive.topics) byTopic[topic.id] = [];
  const mustUrl = {
    "education-direction": "https://youtu.be/HYkXmBCHtTE",
    "money-trust-btc-eth": "https://youtu.be/kRmwzk0MRvo",
    "bottleneck-to-moat": "https://youtu.be/DLu-u4xo3Pc",
    "semiconductor-cycle": "https://x.com/sshleo84/status/2110860757726646291",
    "trade-prices-sep": "https://x.com/sshleo84/status/2111075884652429616",
  };
  for (const item of archive.items) {
    if (!byTopic[item.topic]) throw new Error(`unknown topic ${item.topic}`);
    byTopic[item.topic].push(item);
    if (mustUrl[item.id] && item.source.url !== mustUrl[item.id]) throw new Error(`url mismatch ${item.id}`);
    if (item.topic === "economy" && item.source.kind === "x" && !mustUrl[item.id] && item.source.url !== "https://x.com/sshleo84") {
      throw new Error(`economy profile link missing ${item.id}`);
    }
    for (const visual of item.visuals) {
      const ctx = `${item.id}/${visual.type}`;
      if (visual.type === "quote" || visual.type === "callout") {
        need(item.summary, visual.text, ctx);
        continue;
      }
      need(item.summary, visual.caption, ctx);
      for (const step of visual.steps || []) need(item.summary, step, ctx);
      for (const col of visual.columns || []) {
        need(item.summary, col.title, ctx);
        for (const pt of col.points) need(item.summary, pt, ctx);
      }
      for (const entry of visual.items || []) {
        if (typeof entry === "string") need(item.summary, entry, ctx);
        else {
          need(item.summary, entry.k, ctx);
          need(item.summary, entry.v, ctx);
          if (entry.sub) need(item.summary, entry.sub, ctx);
        }
      }
      for (const ev of visual.events || []) {
        if (ev.when) need(item.summary, ev.when, ctx);
        need(item.summary, ev.text, ctx);
      }
      for (const layer of visual.layers || []) need(item.summary, layer, ctx);
      if (visual.label) need(item.summary, visual.label, ctx);
      for (const note of visual.notes || []) need(item.summary, note, ctx);
      for (const row of visual.rows || []) {
        need(item.summary, row.label, ctx);
        if ("value" in row) checkValue(visual.caption, row.value, ctx);
        for (const value of row.values || []) checkValue(visual.caption, value, ctx);
      }
      if (visual.type === "range") ["min", "max", "value"].forEach((key) => checkValue(visual.caption, visual[key], ctx));
      if (visual.type === "meter") checkValue(visual.caption, visual.value, ctx);
    }
    for (const h of item.highlights) {
      need(item.summary, h.quote, item.id);
      if (!h.quote.includes(h.display)) throw new Error(`${item.id}: display not in quote`);
      for (const part of [...h.labelParts, ...(h.detailParts || [])]) need(item.summary, part, item.id);
    }
  }
  for (const topic of archive.topics) {
    const rows = byTopic[topic.id];
    if (rows.length !== topic.overviewCount) throw new Error(`${topic.name} count`);
    const latest = rows.map((row) => row.date).sort().at(-1);
    if (latest !== topic.overviewLatest) throw new Error(`${topic.name} latest`);
  }
}

function validatePora(book) {
  for (const key of ["title", "short", "tab", "authors", "org", "intro", "color", "colorDark"]) {
    if (!String(book[key] || "").trim()) throw new Error(`pora: ${key} missing`);
  }
  const httpsUrl = (url, ctx) => {
    let ok = false;
    try { ok = new URL(url).protocol === "https:"; } catch {}
    if (!ok) throw new Error(`pora: ${ctx} url ${url}`);
  };
  const { announcement } = book;
  if (!announcement || !/^\d{4}-\d{2}-\d{2}$/.test(announcement.date)) throw new Error(`pora: announcement date ${announcement?.date}`);
  httpsUrl(announcement.url, "announcement");
  if (!book.links?.length) throw new Error("pora: links empty");
  for (const link of book.links) {
    if (!link.icon || !link.label) throw new Error(`pora: link ${link.url} icon/label`);
    httpsUrl(link.url, link.label);
  }
  const ids = new Set();
  if (!book.checklist?.length) throw new Error("pora: checklist empty");
  for (const step of book.checklist) {
    if (!/^[a-z0-9-]+$/.test(step.id || "")) throw new Error(`pora: checklist id ${step.id}`);
    if (ids.has(step.id)) throw new Error(`pora: duplicate checklist id ${step.id}`);
    ids.add(step.id);
    if (!step.label) throw new Error(`pora: checklist ${step.id} label`);
  }
}

function validateGameTheory(series) {
  for (const key of ["series", "channel", "channelUrl", "playlistUrl"]) {
    if (!String(series[key] || "").trim()) throw new Error(`game-theory: ${key} missing`);
  }
  const httpsUrl = (url, ctx) => {
    let ok = false;
    try { ok = new URL(url).protocol === "https:"; } catch {}
    if (!ok) throw new Error(`game-theory: ${ctx} url ${url}`);
  };
  httpsUrl(series.channelUrl, "channel");
  httpsUrl(series.playlistUrl, "playlist");
  if (!series.episodes?.length) throw new Error("game-theory: episodes empty");
  series.episodes.forEach((ep, i) => {
    const ctx = `game-theory #${ep.number}`;
    if (ep.number !== i + 1) throw new Error(`${ctx}: expected #${i + 1} (numbers must run 1, 2, 3 … in order)`);
    if (!/^Game Theory #\d+:\s*\S/.test(ep.title || "") || !ep.title.startsWith(`Game Theory #${ep.number}:`)) throw new Error(`${ctx}: title ${ep.title}`);
    if (!/^[\w-]{11}$/.test(ep.videoId || "")) throw new Error(`${ctx}: videoId ${ep.videoId}`);
    httpsUrl(ep.url, ctx);
    if (youtubeId(ep.url) !== ep.videoId) throw new Error(`${ctx}: url does not match videoId`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ep.publishedDate || "")) throw new Error(`${ctx}: publishedDate ${ep.publishedDate}`);
    if (!/^(?:\d+:)?[0-5]?\d:[0-5]\d$/.test(ep.duration || "")) throw new Error(`${ctx}: duration ${ep.duration}`);
    if (!String(ep.summary || "").trim()) throw new Error(`${ctx}: summary missing`);
    if (!ep.keyPoints?.length || ep.keyPoints.some((t) => !String(t).trim())) throw new Error(`${ctx}: keyPoints`);
    if (!ep.keyConcepts?.length || ep.keyConcepts.some((t) => !String(t).trim())) throw new Error(`${ctx}: keyConcepts`);
    if (!["transcript", "description"].includes(ep.summarySource)) throw new Error(`${ctx}: summarySource ${ep.summarySource}`);
    if (ep.reuploadUrl) {
      httpsUrl(ep.reuploadUrl, `${ctx} reupload`);
      if (ep.reuploadVideoId && youtubeId(ep.reuploadUrl) !== ep.reuploadVideoId) throw new Error(`${ctx}: reuploadUrl does not match reuploadVideoId`);
    }
  });
}

function validateReading(log) {
  const ids = new Set();
  for (const book of log.books) {
    if (ids.has(book.id)) throw new Error(`reading: duplicate book ${book.id}`);
    ids.add(book.id);
    book.category = String(book.category || "").trim() || "미분류";
    if (book.status !== "reading" && book.status !== "done") throw new Error(`reading: ${book.id} status ${book.status}`);
    if (!(Number(book.totalPages) > 0)) throw new Error(`reading: ${book.id} totalPages`);
    for (const key of ["startDate", "endDate", "pubDate"]) {
      if (book[key] && !/^\d{4}-\d{2}-\d{2}$/.test(book[key])) throw new Error(`reading: ${book.id} ${key} ${book[key]}`);
    }
    if (book.pages != null && Number(book.pages) !== Number(book.totalPages)) throw new Error(`reading: ${book.id} pages ${book.pages} != totalPages ${book.totalPages}`);
    if (book.isbn && !/^97[89]\d{10}$/.test(book.isbn)) throw new Error(`reading: ${book.id} isbn ${book.isbn}`);
    if (book.kyoboUrl && !book.kyoboUrl.startsWith("https://product.kyobobook.co.kr/detail/")) throw new Error(`reading: ${book.id} kyoboUrl ${book.kyoboUrl}`);
    if (book.cover && (!/^covers\/[\w.-]+$/.test(book.cover) || !existsSync(join(root, "src", book.cover)))) throw new Error(`reading: ${book.id} cover missing ${book.cover}`);
  }
  for (const entry of log.logs) {
    if (!ids.has(entry.bookId)) throw new Error(`reading: log ${entry.id} unknown book ${entry.bookId}`);
  }
}

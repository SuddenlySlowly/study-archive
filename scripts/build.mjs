import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync, readdirSync } from "node:fs";
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
const notesByBook = loadNotes(reading.books);
const pora = JSON.parse(readFileSync(join(root, "data/pora.json"), "utf8"));
validatePora(pora);
const gt = JSON.parse(readFileSync(join(root, "data/jiang-game-theory.json"), "utf8"));
validateGameTheory(gt);
const universe = JSON.parse(readFileSync(join(root, "data/planets.json"), "utf8"));
validatePlanets(universe);
const SITE = universe.name;
// 색은 docs/palantir-design-spec.md 기준: 흰 바탕 + 검정 잉크, 화면마다 절제된 포인트 컬러 하나.
// 대주제·책장은 스펙 차트 팔레트(blue·gold·green·red·indigo·cerulean·orange·lime)를 채도 낮게 누른 색 [라이트, 다크].
// archive.json·pora.json의 color 값은 그대로 두고 화면에서만 바꾼다
const PALETTE = [
  ["#4a6c9b", "#8fb0de"], ["#8a6f33", "#d6bd80"], ["#417559", "#8ec3a6"], ["#9c5257", "#e0a1a6"],
  ["#6a609e", "#b2a9de"], ["#3e7590", "#8cc1d9"], ["#96693c", "#ddb287"], ["#6c7c42", "#b8cb8a"],
];
// 탭별 포인트 컬러. 메인 레이어 스택에서 활성 레이어 색으로 쓰고, src/style.css의 body[data-tab] --accent와 같다
const TAB_TINT = { study: ["#2d72d2", "#4c90f0"], reading: ["#2b5945", "#72ca9b"], pora: ["#7a6838", "#d1bd8a"], "game-theory": ["#8f4a43", "#f2c4bf"] };
data.topics.forEach((topic, i) => Object.assign(topic, { color: PALETTE[i % PALETTE.length][0], colorDark: PALETTE[i % PALETTE.length][1] }));
Object.assign(pora, { color: TAB_TINT.pora[0], colorDark: TAB_TINT.pora[1] });
const GT = { tab: "장쉐친 게임이론", short: "게임이론", lecturer: "장쉐친", lecturerEn: "Jiang Xueqin", color: TAB_TINT["game-theory"][0], colorDark: TAB_TINT["game-theory"][1] };
// 메인 레이어 스택의 크기: 판 반 변(판 좌표) · 판 두께 · 레이어 사이 간격(화면 px)
const ISO_H = 100;
const ISO_T = 9;
const ISO_D = 118;
// 화면에 장식용 이모지를 쓰지 않는다(상태 표시 📥📖✅ 등은 글자만)
const plain = (text) => String(text).replace(/\p{Extended_Pictographic}\uFE0F?\s*/gu, "");
const GT_NOTICE = "요약은 강의 내용(장쉐친의 주장·예측)을 정리한 것이며 사실 검증된 내용이 아닙니다.";
const SHELF_META = {
  문학: { id: "literature", en: "Literature", color: "#4a6c9b", colorDark: "#8fb0de", blurb: "소설·시·에세이처럼 이야기와 문장을 읽는 책입니다.", always: true },
  비문학: { id: "nonfiction", en: "Non-fiction", color: "#6a609e", colorDark: "#b2a9de", blurb: "역사·사회·과학처럼 사실과 주장을 따라가는 책입니다.", always: true },
  미분류: { id: "uncategorized", en: "Unsorted", color: "#5f6b7c", colorDark: "#abb3bf", blurb: "아직 분류를 정하지 않은 책입니다." },
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
const SOURCE_KIND = { youtube: "YouTube", "youtube-title": "YouTube (제목만)", x: "X", "x-video": "X 영상", pdf: "PDF" };

const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "assets"), { recursive: true });
cpSync(join(root, "src/style.css"), join(dist, "assets/style.css"));
cpSync(join(root, "src/site.js"), join(dist, "assets/site.js"));
cpSync(join(root, "src/graph.js"), join(dist, "assets/graph.js"));
cpSync(join(root, "src/mindmap.js"), join(dist, "assets/mindmap.js"));
cpSync(join(root, "src/bgm.js"), join(dist, "assets/bgm.js"));
cpSync(join(root, "src/favicon.svg"), join(dist, "favicon.svg"));
mkdirSync(join(dist, "data"), { recursive: true });
cpSync(join(root, "data/archive.json"), join(dist, "data/archive.json"));
cpSync(join(root, "data/reading.json"), join(dist, "data/reading.json"));
mkdirSync(join(dist, "data/notes"), { recursive: true });
for (const id of Object.keys(notesByBook)) cpSync(join(root, `data/notes/${id}.json`), join(dist, `data/notes/${id}.json`));
cpSync(join(root, "data/pora.json"), join(dist, "data/pora.json"));
cpSync(join(root, "data/jiang-game-theory.json"), join(dist, "data/jiang-game-theory.json"));
cpSync(join(root, "data/planets.json"), join(dist, "data/planets.json"));
cpSync(join(root, "src/covers"), join(dist, "covers"), { recursive: true });
writeFileSync(join(dist, ".nojekyll"), "");
writeFileSync(join(dist, "assets/search.json"), JSON.stringify(searchIndex()));

const pages = [];
const site = (rel, depth, opts) => pages.push(writePage(rel, { depth, chrome: "site", ...opts }));
pages.push(writePage("index.html", { depth: 0, chrome: "universe", tab: "universe", title: SITE, description: universe.tagline, page: "universe", body: renderUniverse }));
site("study/index.html", 1, { title: `Study · ${data.title}`, description: data.subtitle, page: "home", body: renderHome });
site("library/index.html", 1, { title: `전체 책장 · ${data.title}`, description: "주제별 책과 장을 한 번에 봅니다.", page: "library", nav: "library", body: renderLibrary });
site("map/index.html", 1, { title: `지식 지도 · ${data.title}`, description: "주제와 태그, 장이 어떻게 이어지는지 봅니다.", page: "map", nav: "map", scripts: ["graph.js"], body: renderMap });
site("summaries/index.html", 1, { title: `콘텐츠별 요약 · ${data.title}`, description: "콘텐츠마다 날짜·주제·핵심 요약·출처·태그·상태를 대주제별로 모았습니다.", page: "summaries", nav: "summaries", body: renderSummaries });
site("timeline/index.html", 1, { title: `연표 · ${data.title}`, description: "날짜별로 추가한 장을 봅니다.", page: "timeline", nav: "timeline", body: renderTimeline });
site("reading/index.html", 1, { title: "독서 기록", description: "분류별 책장에 꽂아 둔 책과 읽은 기록을 봅니다.", page: "reading", tab: "reading", nav: "reading", body: renderReading });
site("pora/index.html", 1, { title: `${pora.title} (${pora.short})`, description: pora.intro, page: "pora", tab: "pora", body: renderPora });
site("game-theory/index.html", 1, { title: GT.tab, description: `${gt.channel} 채널 ${GT.lecturer}의 ${gt.series} 시리즈 #1~#${gt.episodes.length} 회차별 요약`, page: "game-theory", tab: "game-theory", nav: "list", body: renderGameTheory });
for (const ep of gt.episodes) {
  site(`game-theory/${ep.number}/index.html`, 2, { title: `#${ep.number} ${episodeTitle(ep)} · ${GT.tab}`, description: firstSentence(ep.summary), page: "game-theory-episode", tab: "game-theory", body: (p) => renderEpisode(ep, p) });
}
for (const shelf of shelves) {
  site(`reading/${shelf.id}/index.html`, 2, { title: `${shelf.name} 책장 · 독서 기록`, description: shelf.blurb, page: "reading-shelf", tab: "reading", nav: shelf.id, body: (p) => renderShelf(shelf, p) });
}
for (const book of reading.books) {
  site(`reading/books/${book.id}/index.html`, 3, { title: `${book.title} · 독서 기록`, description: `${book.author}${book.publisher ? ` · ${book.publisher}` : ""}`, page: "reading-book", tab: "reading", nav: shelfOf(book).id, scripts: ["mindmap.js"], body: (p) => renderBook(book, p) });
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
  title: "없는 페이지",
  description: data.subtitle,
  page: "missing",
  body: (p) => `<main id="content" class="cream"><section class="wrap missing"><p class="kicker">404</p><h1>이 주소에는 페이지가 없습니다.</h1><p class="sub">메인에서 다시 찾아보세요.</p><p><a class="btn" href="${p}">${esc(SITE)}로 돌아가기 →</a> <a class="btn ghost" href="${p}study/">Study →</a> <a class="btn ghost" href="${p}library/">전체 책장 →</a> <a class="btn ghost" href="${p}reading/">독서 기록 →</a></p></section></main>`,
}));
// 없앤 숫자 모음(/figures/)과 /numbers/ 주소는 콘텐츠별 요약으로 보낸다
for (const old of ["figures", "numbers"]) writeRedirect(`${old}/index.html`, "summaries/", "콘텐츠별 요약");
// 행성마다 가리키는 탭 페이지가 실제로 만들어졌는지 확인
for (const planet of universe.planets) {
  if (!existsSync(join(dist, planet.href, "index.html"))) throw new Error(`planet ${planet.id}: no page at ${planet.href}`);
}
writeFileSync(join(dist, "robots.txt"), "User-agent: *\nAllow: /\n");
writeFileSync(join(dist, "sitemap.xml"), sitemap(pages));
console.log(`built ${pages.length} pages → dist/`);

/* ---------- page shell ---------- */

function writeRedirect(rel, target, label) {
  const file = join(dist, rel);
  const to = "../".repeat(rel.split("/").length - 1) + target;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${esc(label)}으로 옮겼습니다 · ${esc(SITE)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(`${data.site}/${target}`)}">
<meta http-equiv="refresh" content="0; url=${to}">
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
</head>
<body><p><a href="${to}">${esc(label)}</a>으로 옮겼습니다.</p></body>
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
<title>${esc(title === SITE ? SITE : `${title} · ${SITE}`)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(data.site + canonPath)}">
<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${esc(SITE)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(data.site + canonPath)}">
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body data-page="${esc(pageName || "")}" data-tab="${tab}" data-root="${prefix}"${style}>
<a class="skip" href="#content">본문으로</a>
${tabBar(prefix, tab, path)}
${chrome === "universe" ? "" : chrome === "reader" ? readerHeader(prefix, item) : tab === "reading" ? readingHeader(prefix, nav) : tab === "pora" ? poraHeader(prefix) : tab === "game-theory" ? gameTheoryHeader(prefix, nav) : siteHeader(prefix, nav)}
${body(prefix)}
${chrome === "universe" ? "" : footer(prefix, tab)}
<div class="tip" data-tip-box hidden></div>
<script src="${prefix}assets/site.js" defer></script>
<script src="${prefix}assets/bgm.js" defer></script>${scripts.map((name) => `
<script src="${prefix}assets/${name}" defer></script>`).join("")}
</body>
</html>
`;
}


// 궤도 하나와 그 위의 행성(포인트 컬러) 하나. 탭바 로고와 파비콘이 같은 모양
function logo() {
  return `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11.5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="16" cy="16" r="4.5" fill="currentColor"/><circle class="logo-dot" cx="24.13" cy="7.87" r="3"/></svg>`;
}

function searchBox(prefix, placeholder) {
  return `<form class="search" action="${prefix}library/" method="get" role="search" data-search-form>
      <input type="search" name="q" placeholder="${esc(placeholder)}" aria-label="아카이브 검색" autocomplete="off" data-search>
      <button type="submit" aria-label="검색">${ICON.search}</button>
      <div class="search-pop" data-search-pop hidden role="listbox"></div>
    </form>`;
}

// 모든 페이지 맨 위에 고정되는 섹션 탭. 탭 목록은 data/planets.json의 행성 순서 그대로이고, 로고는 메인(/)으로 간다
function tabBar(prefix, tab, path) {
  const tabs = universe.planets.map(({ id, label, short, href }) => {
    const on = id === tab;
    return `<a class="tab${on ? " is-active" : ""}" href="${prefix}${href}"${on ? ` aria-current="${path === `${href}index.html` ? "page" : "true"}"` : ""}>${tabLabel({ tab: label, short })}</a>`;
  }).join("");
  return `<div class="tabbar">
  <div class="tabbar-in">
    <a class="tab-logo" href="${prefix}" aria-label="${esc(SITE)} 메인"${tab === "universe" ? ' aria-current="page"' : ""}>${logo()}<span class="tab-logo-name">${esc(SITE)}</span></a>
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
    <a class="brand" href="${prefix}study/"><span>${esc(data.title)}</span></a>
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
  <p>© ${esc(SITE)} · 공부 아카이브 · 수치는 각 메모에 적힌 문장에서만 그렸습니다.</p>
  <nav aria-label="바닥 메뉴"><a href="${prefix}">${esc(SITE)}</a><a href="${prefix}study/">Study 홈</a><a href="${prefix}library/">전체 책장</a><a href="${prefix}map/">지식 지도</a><a href="${prefix}summaries/">콘텐츠별 요약</a><a href="${prefix}timeline/">연표</a><a href="${prefix}data/archive.json">archive.json</a><a href="${REPO}">이 사이트의 소스</a></nav>
</div></footer>`;
}

/* ---------- universe (main) ---------- */

// 메인(/). 왼쪽 SUDDENLY · 오른쪽 UNIVERSE, 가운데에 탭을 아이소메트릭 레이어로 쌓는다(아래부터 data/planets.json 순서).
// 레이어마다 어두운 슬레이트 판 + 측면 라벨 + 그 탭을 뜻하는 와이어프레임(궤도·행성 노드 모티프). 좁은 화면은 세로 카드
// 판 좌표(x, y, 높이 z)를 화면 좌표 "x,y"로. 30° 아이소메트릭
function iso(x, y, z = 0) {
  return `${((x - y) * 0.866).toFixed(1)},${((x + y) * 0.5 - z).toFixed(1)}`;
}

function isoPts(list) {
  return list.map((q) => iso(...q)).join(" ");
}

// 레이어의 활성 색. TAB_TINT에 없는 탭은 대주제 팔레트를 차례로
function tabTint(id, i) {
  const [light, dark] = TAB_TINT[id] || PALETTE[i % PALETTE.length];
  return `--lc-l:${light};--lc-d:${dark}`;
}

// 판 위의 그림. 모든 레이어에 궤도와 행성 노드(행성의 orbit·angle·size·ring)를 두고, 탭마다 작은 상징을 더한다
function layerArt(planet) {
  const ox = 14;
  const oy = 14;
  const r = 30 + planet.orbit * 40;
  const orbit = Array.from({ length: 49 }, (_, k) => [ox + r * Math.sin((k / 48) * 2 * Math.PI), oy - r * Math.cos((k / 48) * 2 * Math.PI)]);
  const a = (planet.angle / 180) * Math.PI;
  const nx = ox + r * Math.sin(a);
  const ny = oy - r * Math.cos(a);
  const [sx, sy] = iso(nx, ny, 16).split(",").map(Number);
  const nr = (2.5 + planet.size / 12).toFixed(1);
  const ring = planet.ring ? `<ellipse class="u-ring" cx="${sx}" cy="${sy}" rx="${(nr * 2.1).toFixed(1)}" ry="${(nr * 0.7).toFixed(1)}" transform="rotate(-14 ${sx} ${sy})"/>` : "";
  const motif = {
    study: `<polyline points="${isoPts([[-86, 40], [-62, 64], [-38, 40]])}"/><polyline points="${isoPts([[-62, 64], [-62, 92]])}"/>${[[-86, 40], [-38, 40], [-62, 92]].map(([x, y]) => `<polygon points="${isoPts([[x - 5, y - 5], [x + 5, y - 5], [x + 5, y + 5], [x - 5, y + 5]])}"/>`).join("")}<polygon class="u-fill" points="${isoPts([[-69, 57], [-55, 57], [-55, 71], [-69, 71]])}"/>`,
    reading: [10, 16, 24, 13, 20, 27].map((h, k) => `<polyline points="${isoPts([[-90 + k * 9, 66, 0], [-90 + k * 9, 66, h]])}" stroke-width="3.2"/>`).join("") + `<polyline points="${isoPts([[-96, 72], [-38, 72]])}"/>`,
    pora: `<polyline points="${isoPts([[-90, 88], [-74, 70], [-58, 80], [-46, 52], [-30, 44]])}"/>${[[-90, 88], [-74, 70], [-58, 80], [-46, 52]].map(([x, y]) => `<circle cx="${iso(x, y).split(",")[0]}" cy="${iso(x, y).split(",")[1]}" r="2.2" class="u-fill"/>`).join("")}<polygon points="${isoPts([[-34, 40, 0], [-26, 40, 0], [-26, 40, 8], [-34, 40, 8]])}"/><polygon points="${isoPts([[-26, 40, 0], [-26, 48, 0], [-26, 48, 8], [-26, 40, 8]])}"/><polygon points="${isoPts([[-34, 40, 8], [-26, 40, 8], [-26, 48, 8], [-34, 48, 8]])}" class="u-fill"/>`,
    "game-theory": `<polygon points="${isoPts([[-90, 36], [-38, 36], [-38, 88], [-90, 88]])}"/><polyline points="${isoPts([[-64, 36], [-64, 88]])}"/><polyline points="${isoPts([[-90, 62], [-38, 62]])}"/><polygon class="u-fill" points="${isoPts([[-84, 42], [-70, 42], [-70, 56], [-84, 56]])}"/><polygon class="u-fill" points="${isoPts([[-58, 68], [-44, 68], [-44, 82], [-58, 82]])}"/>`,
  }[planet.id] || "";
  return `<polyline class="u-orbit" points="${isoPts(orbit)}"/>
          <polygon class="u-hub" points="${isoPts([[ox - 4, oy - 4], [ox + 4, oy - 4], [ox + 4, oy + 4], [ox - 4, oy + 4]])}"/>
          <polyline points="${iso(nx, ny)} ${iso(nx, ny, 16 - Number(nr))}" class="u-stem"/>
          <g class="u-motif">${motif}</g>
          ${ring}<circle class="u-node" cx="${sx}" cy="${sy}" r="${nr}"/>`;
}

// 판 한 장(옆면 두 개 + 윗면 + 격자). skeleton은 늘 보이는 점선 골격, lit은 로드 때 아래부터 차례로 켜지는 층
function layerPlate(planet) {
  const H = ISO_H;
  const T = ISO_T;
  const grid = [-60, -20, 20, 60].map((v) => `<polyline points="${isoPts([[v, -H], [v, H]])}"/><polyline points="${isoPts([[-H, v], [H, v]])}"/>`).join("");
  const faces = `<polygon class="u-side-l" points="${isoPts([[-H, H, 0], [H, H, 0], [H, H, -T], [-H, H, -T]])}"/><polygon class="u-side-r" points="${isoPts([[H, -H, 0], [H, H, 0], [H, H, -T], [H, -H, -T]])}"/><polygon class="u-top" points="${isoPts([[-H, -H], [H, -H], [H, H], [-H, H]])}"/>`;
  return `<g class="u-skel">${faces}<g class="u-grid">${grid}</g></g>
        <g class="u-lit">${faces}<g class="u-grid">${grid}</g>
          ${layerArt(planet)}
        </g>`;
}

function renderUniverse(p) {
  const n = universe.planets.length;
  const [w1, ...rest] = SITE.split(" ");
  const top = -(n - 1) * ISO_D - ISO_H - 24;
  const layers = universe.planets.map((planet, i) => {
    const [lx, ly] = iso(ISO_H, -ISO_H).split(",").map(Number);
    return `<g transform="translate(0 ${-i * ISO_D})">
      <a class="u-layer" href="${p}${planet.href}" data-i="${i}" style="${tabTint(planet.id, i)};--d:${(0.35 + i * 0.45).toFixed(2)}s" aria-label="${esc(`${pad(i + 1)} ${planet.label} — ${planet.desc}`)}">
        ${layerPlate(planet)}
        <g class="u-label"><polyline points="${lx + 6},${ly} ${lx + 44},${ly}"/><text x="${lx + 52}" y="${ly - 4}"><tspan class="u-no">${pad(i + 1)}</tspan><tspan dx="8">${esc(planet.label)}</tspan></text><text class="u-path" x="${lx + 52}" y="${ly + 14}">/${esc(planet.href)}</text></g>
      </a>
    </g>`;
  }).join("\n    ");
  const cards = universe.planets.map((planet, i) => `<li><a class="u-card" href="${p}${planet.href}" style="${tabTint(planet.id, i)};--d:${(0.15 + i * 0.12).toFixed(2)}s">
        <svg class="u-card-art" viewBox="-180 -110 360 230" aria-hidden="true">${layerPlate(planet)}</svg>
        <span class="u-card-txt"><span class="u-card-no">${pad(i + 1)}</span><b>${esc(planet.label)}</b><small>${esc(planet.desc)}</small></span>
      </a></li>`).join("\n      ");
  const hover = universe.planets.map((_, i) => `.u-main:has(.u-layer[data-i="${i}"]:is(:hover,:focus-visible)) .u-desc [data-i="${i}"]{display:block}`).join("");
  return `<main id="content" class="universe">
  ${cubes(7, "u")}
  <style>${hover}.u-main:has(.u-layer:is(:hover,:focus-visible)) .u-desc-default{display:none}</style>
  <section class="u-main" aria-labelledby="u-title">
    <h1 id="u-title" class="u-title"><span class="u-w1">${esc(w1)}</span> <span class="u-w2">${esc(rest.join(" "))}</span></h1>
    <nav class="u-stack" aria-label="탭">
      <svg viewBox="-200 ${top} 640 ${-top + ISO_H + ISO_T + 30}" role="presentation">
    ${layers}
      </svg>
    </nav>
    <div class="u-desc" aria-hidden="true">
      <p class="u-desc-default">${esc(universe.tagline)}</p>
      ${universe.planets.map((planet, i) => `<p data-i="${i}"><span>${pad(i + 1)}</span> ${esc(planet.desc)}</p>`).join("")}
    </div>
    <ol class="u-cards" aria-label="탭">
      ${cards}
    </ol>
  </section>
  <p class="u-hint">레이어를 누르면 그 탭으로 갑니다 · <a href="${REPO}">GitHub</a></p>
</main>`;
}

// 배경에 떠 있는 작은 아이소메트릭 큐브(장식). 같은 시드면 늘 같은 자리
function cubes(count, seed) {
  let h = hashOf(seed);
  const rand = () => ((h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 4294967296);
  const cube = `<svg viewBox="-12 -14 24 28"><polygon points="0,-12 10.4,-6 0,0 -10.4,-6" class="c-top"/><polygon points="-10.4,-6 0,0 0,12 -10.4,6"/><polygon points="10.4,-6 0,0 0,12 10.4,6"/></svg>`;
  return `<div class="cubes" aria-hidden="true">${Array.from({ length: count }, (_, i) => `<span class="cube" style="--x:${(4 + rand() * 92).toFixed(1)}%;--y:${(6 + rand() * 84).toFixed(1)}%;--s:${Math.round(14 + rand() * 22)}px;--f:${(5 + rand() * 5).toFixed(1)}s;--fd:-${(rand() * 6).toFixed(1)}s">${cube}</span>`).join("")}</div>`;
}

/* ---------- home ---------- */

function renderHome(p) {
  const counts = countStatuses(data.items);
  const recent = recentItems(5);
  const chartItems = [...data.items].filter((item) => item.visuals.some((v) => CHART_TYPES.has(v.type))).sort(byDateDesc).slice(0, 6);
  return `<main id="content">
  <section class="hero">
    ${cubes(5, p + "hero")}
    <div class="wrap">
      <div class="hero-grid">
        <div>
          <p class="hero-kicker">THE STUDY ARCHIVE · 공부 아카이브</p>
          <h1>모아 둔 공부마다,<br><em>다시 펼쳐 볼 책이 있습니다.</em></h1>
          <p class="hero-small">마지막 정리 ${esc(dotDate(data.updated))} · ${data.topics.length}권 ${data.items.length}장</p>
        </div>
        <div class="hero-side">
          <p>${esc(data.subtitle)}</p>
          <p class="hero-legend">${esc(plain(data.statusLegend))}</p>
          <a class="hero-link" href="${p}library/">전체 책장 둘러보기 →</a>
        </div>
      </div>
      <nav class="hero-pills" aria-label="주제">${data.topics.map((t) => `<a href="${p}topics/${t.id}/">${esc(t.name)} <span>${itemsByTopic[t.id].length}</span> →</a>`).join("")}</nav>
      <div class="shelf-head"><h2>처음 펼치기 좋은 책</h2><a href="${p}library/">전체 ${data.topics.length}권 보기 →</a></div>
      <div class="shelf"><div class="shelf-row books-${data.topics.length}">${data.topics.map((t) => bookCover(t, p)).join("")}</div></div>
      <div class="shelf-head"><h2>최근 추가된 장</h2><a href="${p}timeline/">연표로 보기 →</a></div>
      <div class="shelf"><div class="shelf-row">${recent.map((item) => chapterCover(item, p)).join("")}</div></div>
    </div>
  </section>

  <section class="cream band">
    <div class="wrap">
      <p class="kicker">숫자로 펼쳐 보기</p>
      <h2 class="sec-title">궁금한 그림에서 시작해 보세요</h2>
      <p class="sub">메모 문장에 적힌 수치로만 그린 차트입니다. 카드를 누르면 해당 장의 그림으로 이어집니다.</p>
      <div class="fan" style="--n:${chartItems.length}">${chartItems.map((item, i) => fanCard(item, i, p)).join("")}</div>
      <p class="center"><a class="more" href="${p}summaries/">콘텐츠별 요약 전체 보기 →</a></p>
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
        ${Object.entries(data.statuses).map(([id, s]) => `<div><b>${counts[id] || 0}</b><span>${esc(s.label)}</span></div>`).join("")}
        <div><b>${data.items.reduce((n, item) => n + item.highlights.length, 0)}</b><span>적힌 숫자</span></div>
      </div>
      <div class="dash">
        <figure class="card-panel">${topicCountChart(p)}</figure>
        <figure class="card-panel">${statusChart(data.items)}</figure>
        <figure class="card-panel wide">${dayChart(data.items, p)}</figure>
        <figure class="card-panel wide">${tagCloud(data.items, p)}</figure>
      </div>
    </div>
  </section>

  <section class="note-band">
    <div class="wrap note-grid">
      <div><p class="kicker">ARCHIVE NOTE</p></div>
      <div class="note-body">
        <h2>${esc(data.title)}</h2>
        <p>${esc(data.subtitle)}.</p>
        <p>${esc(plain(data.statusLegend))}</p>
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
    ${cubes(4, topic.id)}
    <div class="wrap book-hero-grid">
      <div class="book-hero-cover">${bookCover(topic, p, true)}</div>
      <div>
        <nav class="crumbs" aria-label="경로"><a href="${p}study/">Study</a><span aria-hidden="true">/</span><a href="${p}library/">전체 책장</a><span aria-hidden="true">/</span><span>${esc(topic.name)}</span></nav>
        <p class="kicker">${esc(topic.en)}</p>
        <h1>${esc(topic.name)}</h1>
        <p class="lede">${esc(topic.blurb)}</p>
        <dl class="book-facts">
          <div><dt>장</dt><dd>${items.length}</dd></div>
          ${Object.entries(data.statuses).map(([id, s]) => `<div><dt>${esc(s.label)}</dt><dd>${counts[id] || 0}</dd></div>`).join("")}
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
    <nav class="crumbs" aria-label="경로"><a href="${p}study/">Study</a><span aria-hidden="true">/</span><a href="${p}topics/${topic.id}/">${esc(topic.name)}</a><span aria-hidden="true">/</span><span>제${no}장</span></nav>
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
// 독서기록 탭은 문서형 패널 레이아웃(rd-*): 왼쪽 사이드바에 책장·책 목록, 오른쪽에 머리말·숫자 줄·패널

function readingShell(nav, p, main, style = "") {
  return `<main id="content" class="rd"${style ? ` style="${style}"` : ""}>
  <div class="rd-shell">
    ${readingSide(nav, p)}
    <div class="rd-main">
${main}
    </div>
  </div>
</main>`;
}

function readingSide(nav, p) {
  const cur = (id) => (id === nav ? ' aria-current="page"' : "");
  return `<aside class="rd-side" aria-label="독서 기록 목차">
      <p class="rd-side-h">독서 기록</p>
      <ul><li><a href="${p}reading/"${cur("reading")}>개요</a></li></ul>
      <p class="rd-side-h">책장</p>
      <ul>${shelves.map((shelf) => `<li style="${topicVars(shelf)}"><a href="${p}reading/${shelf.id}/"${cur(shelf.id)}><i class="rd-dot" aria-hidden="true"></i>${esc(shelf.name)}<small>${shelf.books.length}</small></a>${shelf.books.length ? `<ul>${shelf.books.map((book) => `<li><a href="${p}reading/books/${book.id}/"${cur(`book:${book.id}`)}>${esc(book.title)}</a></li>`).join("")}</ul>` : ""}</li>`).join("")}</ul>
    </aside>`;
}

// crumbs: [label, href]의 목록. 마지막은 href 없이 현재 페이지. kicker·lede·meta는 이미 escape한 HTML
function rdHead(crumbs, { kicker = "", title, lede = "", meta = "" }) {
  const trail = crumbs.map(([label, href]) => (href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`)).join(`<span aria-hidden="true">/</span>`);
  return `<header class="rd-head">
      <nav class="rd-crumbs" aria-label="경로">${trail}</nav>
      ${kicker ? `<p class="rd-kicker">${kicker}</p>` : ""}
      <h1>${esc(title)}</h1>
      ${lede ? `<p class="rd-lede">${lede}</p>` : ""}
      ${meta ? `<p class="rd-meta">${meta}</p>` : ""}
    </header>`;
}

function rdStats(rows) {
  return `<dl class="rd-stats">${rows.map(([label, value, unit = ""]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ""}</dd></div>`).join("")}</dl>`;
}

function rdPanel(id, title, body, note = "") {
  return `<section class="rd-panel" id="${id}" aria-labelledby="${id}-h">
      <header class="rd-panel-h"><h2 id="${id}-h">${esc(title)}</h2>${note ? `<span class="rd-note">${note}</span>` : ""}</header>
      <div class="rd-panel-b">${body}</div>
    </section>`;
}

function renderReading(p) {
  const now = reading.books.filter((book) => book.status === "reading");
  const done = reading.books.filter((book) => book.status === "done");
  const pages = reading.books.reduce((n, book) => n + readingProgress(book).page, 0);
  const days = new Set(reading.logs.map((log) => log.date)).size;
  const recent = sortedLogs().reverse().slice(0, 8);
  const updated = reading.updatedAt.slice(0, 10);
  return readingShell("reading", p, [
    rdHead([["홈", p], ["독서 기록"]], {
      kicker: "Reading log",
      title: "독서 기록",
      lede: "분류별 책장에 읽는 중인 책과 다 읽은 책을 꽂아 둡니다. 책등 두께는 쪽수, 색은 표지에서 가져옵니다.",
      meta: `마지막 기록 <time datetime="${esc(updated)}">${esc(dotDate(updated))}</time> · 책장 ${shelves.length}칸 · ${reading.books.length}권`,
    }),
    rdStats([["전체", reading.books.length, "권"], ["읽는 중", now.length, "권"], ["완독", done.length, "권"], ["읽은 쪽", pages.toLocaleString("ko-KR"), "쪽"], ["기록한 날", days, "일"]]),
    rdPanel("shelves", "분류별 책장", `<div class="rd-shelf-grid">${shelves.map((shelf) => shelfCard(shelf, p)).join("")}</div>`, `${shelves.length}칸`),
    rdPanel("now", "지금 읽는 책", now.length ? bookTable(now, p) : `<p class="rd-empty">지금 읽는 책이 없습니다.</p>`, `${now.length}권`),
    recent.length ? rdPanel("recent", "최근 기록", logTable(recent, p, true), `최근 ${recent.length}개`) : "",
  ].join("\n"));
}

function renderShelf(shelf, p) {
  const now = shelf.books.filter((book) => book.status === "reading").length;
  const pages = shelf.books.reduce((n, book) => n + Number(book.totalPages), 0);
  const legend = `<ul class="case-legend"><li><i class="lg-w" aria-hidden="true"></i>두께 = 쪽수</li><li><i class="lg-c" aria-hidden="true"></i>색 = 표지 (없으면 분류 색)</li><li><i class="lg-p" aria-hidden="true"></i>오른쪽 띠 = 진행률</li></ul>`;
  return readingShell(shelf.id, p, [
    rdHead([["홈", p], ["독서 기록", `${p}reading/`], [`${shelf.name} 책장`]], {
      kicker: `<i class="rd-dot" aria-hidden="true"></i>${esc(shelf.en)}`,
      title: `${shelf.name} 책장`,
      lede: esc(shelf.blurb),
    }),
    rdStats([["꽂힌 책", shelf.books.length, "권"], ["읽는 중", now, "권"], ["완독", shelf.books.length - now, "권"], ["쪽수 합계", pages.toLocaleString("ko-KR"), "쪽"]]),
    rdPanel("case", "책장", bookcase(shelf.books, p) + legend, "책등에 올리면 표지·진행 상태, 누르면 책 상세"),
    rdPanel("list", "목록", shelf.books.length ? bookTable(shelf.books, p) : `<p class="rd-empty">아직 이 책장에 꽂힌 책이 없습니다.</p>`, `${shelf.books.length}권 · 읽는 중 먼저, 다음 최근 완독 순`),
  ].join("\n"), topicVars(shelf));
}

function renderBook(book, p) {
  const shelf = shelfOf(book);
  const logs = sortedLogs().filter(({ log }) => log.bookId === book.id).reverse();
  const notes = notesByBook[book.id];
  const facts = [
    ["저자", book.author],
    ["옮긴이 등", book.memo],
    ["분류", book.subcategory ? `${book.category} · ${book.subcategory.split(">").at(-1).trim()}` : book.category],
    ["출판사", book.publisher],
    ["출간일", book.pubDate && dotDate(book.pubDate)],
    ["쪽수", book.pages && `${book.pages}쪽`],
    ["ISBN", book.isbn],
    ["읽기 시작", book.startDate && dotDate(book.startDate)],
    ["완독", book.endDate && dotDate(book.endDate)],
  ].filter(([, v]) => v);
  const props = `<section class="rd-panel rd-props" aria-labelledby="props-h">
      <header class="rd-panel-h"><h2 id="props-h">속성</h2><span class="rd-note">교보문고 기준</span></header>
      <div class="rd-panel-b">
        ${statusBlock(book)}
        <dl class="rd-props-list">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <p class="rd-actions">${book.kyoboUrl ? `<a class="rd-btn primary" href="${esc(book.kyoboUrl)}" target="_blank" rel="noopener noreferrer">교보문고에서 보기 ↗</a>` : ""}<a class="rd-btn" href="#notes">메모 보기</a><a class="rd-btn" href="${p}reading/${shelf.id}/">${esc(shelf.name)} 책장 →</a></p>
      </div>
    </section>`;
  return readingShell(`book:${book.id}`, p, [
    rdHead([["홈", p], ["독서 기록", `${p}reading/`], [`${shelf.name} 책장`, `${p}reading/${shelf.id}/`], [book.title]], {
      kicker: `<i class="rd-dot" aria-hidden="true"></i>${esc(book.subcategory || book.category)}`,
      title: book.title,
      lede: `${esc(book.author)}${book.memo ? ` · ${esc(book.memo)}` : ""}`,
    }),
    `<div class="rd-book-grid"><figure class="rd-cover">${coverFace(book, p)}</figure>${props}</div>`,
    rdPanel("notes", "메모", mindmap(book, notes), notes ? `data/notes/${esc(book.id)}.json${notes.updatedAt ? ` · ${esc(dotDate(notes.updatedAt.slice(0, 10)))}` : ""}` : "저장소에 아직 메모 없음"),
    rdPanel("logs", "읽은 기록", logs.length ? logTable(logs, p, false) : `<p class="rd-empty">아직 기록이 없습니다.</p>`, `쪽수 기록 ${logs.length}개`),
  ].join("\n"), topicVars(shelf));
}

function shelfCard(shelf, p) {
  const now = shelf.books.filter((book) => book.status === "reading").length;
  return `<article class="rd-shelf-card" style="${topicVars(shelf)}">
        <header><i class="rd-dot" aria-hidden="true"></i><h3><a href="${p}reading/${shelf.id}/">${esc(shelf.name)}</a></h3><span class="rd-en">${esc(shelf.en)}</span><span class="rd-count">${shelf.books.length}권</span></header>
        ${bookcase(shelf.books, p, true)}
        <footer><span>읽는 중 ${now} · 완독 ${shelf.books.length - now}</span><a href="${p}reading/${shelf.id}/">책장 열기 →</a></footer>
      </article>`;
}

// 책장 한 칸. 책등 칸(.sp-slot)이 모두 같은 높이라 줄이 넘치면 flex-wrap으로 아래 선반이 생기고, 선반 판은 배경 그라데이션이 줄마다 그린다
function bookcase(books, p, mini = false) {
  const row = books.length
    ? `<ul class="case-row">${books.map((book) => `<li class="sp-slot">${spine(book, p)}</li>`).join("")}</ul>`
    : `<div class="case-row is-empty"><span>아직 꽂힌 책이 없습니다.</span></div>`;
  return `<div class="case${mini ? " mini" : ""}">${row}</div>`;
}

// 책등. 두께는 쪽수에 비례(24~76px), 높이는 책마다 조금씩 다르게(id 해시). 색은 site.js가 표지에서 뽑고, 그 전에는 분류 색을 조금씩 바꿔 쓴다
function spine(book, p) {
  const shelf = shelfOf(book);
  const h = hashOf(book.id);
  const w = Math.max(24, Math.min(76, Math.round(14 + Number(book.totalPages) * 0.085)));
  const hf = (0.8 + (h % 17) / 100).toFixed(2);
  const tint = `color-mix(in srgb, ${shelf.color} ${88 - (h % 4) * 7}%, ${h % 2 ? "#000" : "#fff"})`;
  const { pct } = readingProgress(book);
  const when = doneMonth(book);
  const status = book.status === "done" ? `완독 ${when}` : `읽는 중 ${pct}%`;
  const attrs = {
    "data-title": book.title,
    "data-author": book.author,
    "data-status": book.status,
    "data-pct": pct,
    "data-when": when,
    "data-pages": book.totalPages,
    "data-cover": book.cover ? `${p}${book.cover}` : "",
  };
  return `<a class="sp" href="${p}reading/books/${book.id}/" style="--w:${w};--hf:${hf};--sp:${tint}" data-spine ${Object.entries(attrs).filter(([, v]) => v !== "").map(([k, v]) => `${k}="${esc(v)}"`).join(" ")} aria-label="${esc(`${book.title} · ${book.author} · ${book.totalPages}쪽 · ${status}`)}"><span class="sp-title">${esc(book.title)}</span><span class="sp-author">${esc(book.author)}</span>${book.status === "reading" ? `<span class="sp-prog" style="--pct:${pct}%" aria-hidden="true"></span>` : ""}</a>`;
}

function bookTable(books, p) {
  return `<div class="rd-table-wrap"><table class="rd-table">
        <thead><tr><th scope="col">책</th><th scope="col">분류</th><th scope="col" class="num">쪽수</th><th scope="col">상태</th><th scope="col">기간</th></tr></thead>
        <tbody>${books.map((book) => {
          const shelf = shelfOf(book);
          const sub = book.subcategory ? book.subcategory.split(">").at(-1).trim() : "";
          const period = `${book.startDate ? dotDate(book.startDate) : "—"} ~ ${book.endDate ? dotDate(book.endDate) : ""}`;
          return `<tr style="${topicVars(shelf)}"><td><a class="rd-book" href="${p}reading/books/${book.id}/">${thumb(book, p)}<span><b>${esc(book.title)}</b><small>${esc(book.author)}${book.publisher ? ` · ${esc(book.publisher)}` : ""}</small></span></a></td><td><span class="rd-chip"><i class="rd-dot" aria-hidden="true"></i>${esc(shelf.name)}</span>${sub ? `<small class="rd-sub">${esc(sub)}</small>` : ""}</td><td class="num">${book.totalPages}</td><td>${statusCell(book)}</td><td class="rd-mono">${esc(period)}</td></tr>`;
        }).join("")}</tbody>
      </table></div>`;
}

function logTable(entries, p, withBook) {
  return `<div class="rd-table-wrap"><table class="rd-table rd-log">
        <thead><tr><th scope="col">날짜</th>${withBook ? `<th scope="col">책</th>` : ""}<th scope="col">기록</th><th scope="col" class="num">늘어난 쪽</th><th scope="col" class="num">시간</th>${withBook ? "" : `<th scope="col">메모</th>`}</tr></thead>
        <tbody>${entries.map(({ log, gained }) => {
          const book = reading.books.find((b) => b.id === log.bookId);
          const what = log.to == null ? "독서 시간" : log.mode === "range" ? `${log.from}~${log.to}쪽` : `${log.to}쪽까지`;
          const bookCell = withBook ? `<td style="${topicVars(shelfOf(book))}"><a class="rd-link" href="${p}reading/books/${esc(book.id)}/"><i class="rd-dot" aria-hidden="true"></i>${esc(book.title)}</a></td>` : "";
          return `<tr><td class="rd-mono"><time datetime="${esc(log.date)}">${esc(dotDate(log.date))}</time></td>${bookCell}<td>${esc(what)}</td><td class="num">${log.to != null ? `<b class="rd-plus">+${gained}</b>` : "—"}</td><td class="num">${log.minutes ? `${log.minutes}분` : "—"}</td>${withBook ? "" : `<td class="rd-muted">${esc(log.note || "")}</td>`}</tr>`;
        }).join("")}</tbody>
      </table></div>`;
}

function thumb(book, p) {
  return book.cover
    ? `<img class="rd-thumb" src="${p}${esc(book.cover)}" alt="" loading="lazy" width="30" height="42">`
    : `<span class="rd-thumb blank" aria-hidden="true"></span>`;
}

function statusCell(book) {
  if (book.status === "done") return `<span class="rd-badge done">완독</span> <span class="rd-mono">${esc(doneMonth(book))}</span>`;
  const { page, pct } = readingProgress(book);
  return `<span class="rd-prog"><span class="rd-bar" role="progressbar" aria-label="진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span><b>${pct}%</b><small>${page}/${book.totalPages}쪽</small></span>`;
}

function statusBlock(book) {
  if (book.status === "done") {
    const stars = book.rating ? ` · ${"★".repeat(book.rating)}` : "";
    return `<div class="rd-status"><span class="rd-badge done">완독</span><b>${esc(doneMonth(book))}</b><span>${esc(stars)}</span></div>`;
  }
  const { page, pct } = readingProgress(book);
  return `<div class="rd-status"><span class="rd-badge reading">읽는 중</span><b>${pct}%</b><span>${page} / ${book.totalPages}쪽</span><span class="rd-bar big" role="progressbar" aria-label="진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span></div>`;
}

// 완독한 책은 endDate 기준 ‘2026년 10월’
function doneMonth(book) {
  if (book.status !== "done") return "";
  return book.endDate ? `${book.endDate.slice(0, 4)}년 ${Number(book.endDate.slice(5, 7))}월` : "완독";
}

function coverFace(book, p) {
  const face = book.cover
    ? `<img src="${p}${esc(book.cover)}" alt="${esc(book.title)} 표지" loading="lazy">`
    : `<span class="rd-face-blank"><b>${esc(book.title)}</b><small>${esc(book.author)}</small></span>`;
  return `<span class="rd-face">${face}</span>`;
}

// 책 상세의 메모 마인드맵. 저장소 메모(data/notes/<id>.json)를 페이지에 넣어 두고 mindmap.js가 그린다.
// 스크립트가 돌기 전·못 도는 환경에서는 같은 내용을 목록으로 보여 준다
function mindmap(book, notes) {
  const doc = notes || { version: 1, bookId: book.id, updatedAt: "", root: { id: "root", text: book.title, children: [] } };
  const json = JSON.stringify({ ...doc, root: { ...doc.root, text: book.title } }).replace(/</g, "\\u003c");
  const outline = (nodes) => (nodes && nodes.length ? `<ul>${nodes.map((n) => `<li>${esc(n.text)}${outline(n.children)}</li>`).join("")}</ul>` : "");
  const btn = (cmd, label, title, extra = "") => `<button type="button" data-mm="${cmd}" title="${esc(title)}"${extra}>${label}</button>`;
  return `<div class="mm" data-mindmap data-book="${esc(book.id)}">
        <div class="mm-bar" role="toolbar" aria-label="마인드맵 도구" data-mm-bar hidden>
          <div class="mm-group">${btn("child", "＋ 자식", "자식 가지 추가 (Tab)")}${btn("sibling", "＋ 형제", "형제 가지 추가 (Enter)")}${btn("edit", "편집", "글 고치기 (더블클릭 · F2)")}${btn("delete", "삭제", "가지 삭제 (Delete)")}${btn("fold", "접기", "접기·펼치기 (Space)")}</div>
          <div class="mm-group">${btn("undo", "↶", "되돌리기 (Ctrl+Z)", ' aria-label="되돌리기"')}${btn("redo", "↷", "다시 하기 (Ctrl+Shift+Z)", ' aria-label="다시 하기"')}${btn("layout", "자동 정렬", "손으로 옮긴 위치를 지우고 다시 배치")}</div>
          <div class="mm-group">${btn("zoom-out", "−", "축소", ' aria-label="축소"')}<output data-mm-zoom>100%</output>${btn("zoom-in", "＋", "확대", ' aria-label="확대"')}${btn("fit", "맞춤", "화면에 맞추기 (0)")}${btn("full", "전체 화면", "전체 화면", ' aria-pressed="false"')}</div>
          <div class="mm-group mm-io">${btn("export", "JSON 내보내기", `${book.id}.json 파일로 받기`)}${btn("import", "JSON 가져오기", "JSON 파일에서 불러오기")}${btn("reset", "저장소 버전", "브라우저 편집본을 지우고 저장소 메모로 되돌리기")}<input type="file" accept="application/json,.json" data-mm-file hidden></div>
        </div>
        <div class="mm-stage" tabindex="0" data-mm-stage aria-label="${esc(book.title)} 메모 마인드맵" aria-roledescription="마인드맵">
          <div class="mm-outline"><p><b>${esc(book.title)}</b></p>${outline(doc.root.children) || `<p class="rd-muted">아직 메모가 없습니다.</p>`}</div>
        </div>
        <div class="mm-foot"><span class="mm-state" data-mm-status aria-live="polite"></span><span class="mm-keys"><kbd>Tab</kbd> 자식 <kbd>Enter</kbd> 형제 <kbd>더블클릭</kbd> 편집 <kbd>Del</kbd> 삭제 <kbd>Space</kbd> 접기 <kbd>Esc</kbd> 선택 해제 · 노드를 끌어 다른 노드 위에 놓으면 그 아래로 · 빈 곳 끌기 이동 · <kbd>Ctrl</kbd>+휠 확대</span></div>
        <script type="application/json" data-mm-data>${json}</script>
      </div>`;
}

function hashOf(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
}

/* ---------- PoRA ---------- */

function renderPora(p) {
  const ext = `target="_blank" rel="noopener noreferrer"`;
  return `<main id="content" class="cream" style="${topicVars(pora)}">
  <section class="hero">
    ${cubes(5, p + "hero")}
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
      <ul class="pora-links">${pora.links.map((link, i) => `<li><a class="pora-link" href="${esc(link.url)}" ${ext}><span class="pora-ico" aria-hidden="true">${pad(i + 1)}</span><span class="pora-txt"><b>${esc(link.label)}</b><small>${esc(link.desc)}</small><span class="pora-url">${esc(new URL(link.url).host)}</span></span><span class="pora-go" aria-hidden="true">↗</span><span class="sr-only">(새 탭)</span></a></li>`).join("")}</ul>
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
    ${cubes(5, "gt")}
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
    const meta = SHELF_META[name] || { id: `shelf-${++extra}`, en: "Shelf", color: "#417559", colorDark: "#8ec3a6", blurb: `${name}으로 분류한 책입니다.` };
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
        parts.push(`<rect class="bar s${i}" data-s="${i}" x="${a.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${bh}" data-tip="${esc(tip)}"><title>${esc(tip)}</title></rect>`);
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
      return `<rect class="s${i}" x="${(gx + i * (bw + 3)).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}"/>`;
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
  <ul class="st-legend">${entries.map(([id, s]) => `<li><i class="sw st-${id}"></i>${esc(s.label)} <b>${counts[id] || 0}</b><small>${total ? Math.round(((counts[id] || 0) / total) * 100) : 0}%</small></li>`).join("")}</ul>`;
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
  const c = `viewBox="0 0 80 56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"`;
  const g = {
    "grouped-bar": `<path d="M8 50h64"/><path d="M14 50V26M20 50V32M34 50V14M40 50V22M54 50V30M60 50V36"/>`,
    bars: `<path d="M8 50h64"/><path d="M16 50V20M30 50V34M44 50V26M58 50V40"/>`,
    range: `<path d="M8 30h64"/><path d="M8 24v12M72 24v12"/><circle cx="22" cy="30" r="5" fill="currentColor"/>`,
    meter: `<rect x="8" y="22" width="64" height="12"/><path d="M14 28h36" stroke-width="6"/>`,
    flow: `<rect x="4" y="20" width="18" height="16"/><rect x="31" y="20" width="18" height="16"/><rect x="58" y="20" width="18" height="16"/><path d="M23 28h7M50 28h7"/>`,
    split: `<rect x="6" y="8" width="30" height="40"/><rect x="44" y="8" width="30" height="40"/><path d="M12 18h18M12 26h14M50 18h18M50 26h14"/>`,
    checklist: `<path d="M10 14l4 4 7-8M10 30l4 4 7-8M10 46l4 4 7-8"/><path d="M30 14h40M30 30h40M30 46h30"/>`,
    timeline: `<path d="M6 28h68"/><circle cx="14" cy="28" r="4"/><circle cx="34" cy="28" r="4"/><circle cx="54" cy="28" r="4"/><circle cx="70" cy="28" r="4" fill="currentColor"/>`,
    stack: `<rect x="22" y="6" width="36" height="9"/><rect x="16" y="18" width="48" height="9"/><rect x="10" y="30" width="60" height="9"/><rect x="4" y="42" width="72" height="9"/>`,
    stats: `<rect x="6" y="10" width="30" height="36"/><rect x="44" y="10" width="30" height="36"/><path d="M14 24h14M52 24h14" stroke-width="4"/><path d="M14 36h10M52 36h10"/>`,
    quote: `<path d="M18 36c0-10 4-16 12-18M44 36c0-10 4-16 12-18"/><circle cx="22" cy="38" r="5"/><circle cx="48" cy="38" r="5"/>`,
    callout: `<rect x="8" y="10" width="64" height="30"/><path d="M22 40l-4 10 12-10"/>`,
  };
  return `<svg class="glyph" ${c} aria-hidden="true">${g[type] || g.quote}</svg>`;
}

function art(id) {
  const common = `viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter"`;
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
  return `<span class="badge st-${status}">${esc(s.label)}</span>`;
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

function validatePlanets(u) {
  if (!String(u.name || "").trim() || !String(u.tagline || "").trim()) throw new Error("planets: name/tagline missing");
  if (!u.planets?.length) throw new Error("planets: empty");
  const ids = new Set();
  for (const planet of u.planets) {
    const ctx = `planets: ${planet.id}`;
    if (!/^[a-z0-9-]+$/.test(planet.id || "")) throw new Error(`planets: id ${planet.id}`);
    if (ids.has(planet.id)) throw new Error(`${ctx} duplicate id`);
    ids.add(planet.id);
    for (const key of ["label", "short", "desc"]) if (!String(planet[key] || "").trim()) throw new Error(`${ctx} ${key} missing`);
    if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*\/$/.test(planet.href || "")) throw new Error(`${ctx} href must be a relative folder like "reading/": ${planet.href}`);
    if (!/^#[0-9a-f]{6}$/i.test(planet.color || "")) throw new Error(`${ctx} color ${planet.color}`);
    const range = (key, lo, hi) => { if (!(typeof planet[key] === "number" && planet[key] >= lo && planet[key] <= hi)) throw new Error(`${ctx} ${key} must be ${lo}~${hi}: ${planet[key]}`); };
    range("size", 24, 80);
    range("orbit", 0.4, 0.96);
    range("angle", 0, 360);
    range("period", 30, 600);
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

// data/notes/<bookId>.json: 책마다 메모 마인드맵 하나. 파일 이름이 reading.json에 있는 책 id여야 한다
function loadNotes(books) {
  const dir = join(root, "data/notes");
  const out = {};
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const id = name.slice(0, -5);
    if (!books.some((book) => book.id === id)) throw new Error(`notes/${name}: no book ${id} in reading.json`);
    const doc = JSON.parse(readFileSync(join(dir, name), "utf8"));
    validateNotes(doc, id);
    out[id] = doc;
  }
  return out;
}

function validateNotes(doc, id) {
  const ctx = `notes/${id}.json`;
  if (doc.version !== 1) throw new Error(`${ctx}: version must be 1`);
  if (doc.bookId !== id) throw new Error(`${ctx}: bookId ${doc.bookId} != ${id}`);
  if (doc.updatedAt && Number.isNaN(Date.parse(doc.updatedAt))) throw new Error(`${ctx}: updatedAt ${doc.updatedAt}`);
  const ids = new Set();
  const walk = (node, depth) => {
    if (!node || typeof node !== "object") throw new Error(`${ctx}: node must be an object`);
    if (typeof node.id !== "string" || !/^[\w-]{1,40}$/.test(node.id)) throw new Error(`${ctx}: bad node id ${node.id}`);
    if (ids.has(node.id)) throw new Error(`${ctx}: duplicate node id ${node.id}`);
    ids.add(node.id);
    if (typeof node.text !== "string" || node.text.length > 2000) throw new Error(`${ctx}: ${node.id} text`);
    if (node.children != null && !Array.isArray(node.children)) throw new Error(`${ctx}: ${node.id} children must be an array`);
    if (node.collapsed != null && typeof node.collapsed !== "boolean") throw new Error(`${ctx}: ${node.id} collapsed`);
    if (node.color != null && !(Number.isInteger(node.color) && node.color >= 0 && node.color < 8)) throw new Error(`${ctx}: ${node.id} color must be 0~7`);
    for (const key of ["dx", "dy"]) if (node[key] != null && !Number.isFinite(node[key])) throw new Error(`${ctx}: ${node.id} ${key}`);
    if (depth > 30) throw new Error(`${ctx}: deeper than 30 levels`);
    for (const child of node.children || []) walk(child, depth + 1);
  };
  walk(doc.root, 0);
}

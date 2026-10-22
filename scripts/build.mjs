import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "data/archive.json"), "utf8"));
validate(data);

const topicById = Object.fromEntries(data.topics.map((topic) => [topic.id, topic]));
const itemsByTopic = Object.fromEntries(data.topics.map((topic) => [topic.id, []]));
for (const item of data.items) itemsByTopic[item.topic].push(item);

const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "assets"), { recursive: true });
cpSync(join(root, "src/style.css"), join(dist, "assets/style.css"));
cpSync(join(root, "src/site.js"), join(dist, "assets/site.js"));
cpSync(join(root, "src/favicon.svg"), join(dist, "favicon.svg"));
mkdirSync(join(dist, "data"), { recursive: true });
cpSync(join(root, "data/archive.json"), join(dist, "data/archive.json"));
writeFileSync(join(dist, ".nojekyll"), "");

const pages = [];
pages.push(writePage("index.html", { depth: 0, title: data.title, description: data.subtitle, page: "home", body: renderHome() }));
for (const topic of data.topics) {
  const rel = `topics/${topic.id}/index.html`;
  pages.push(writePage(rel, {
    depth: 2,
    title: `${topic.name} · ${data.title}`,
    description: topic.blurb,
    page: "topic",
    active: topic.id,
    body: renderTopic(topic),
  }));
}
for (const item of data.items) {
  const rel = `items/${item.id}/index.html`;
  pages.push(writePage(rel, {
    depth: 2,
    title: `${item.title} · ${data.title}`,
    description: item.summary.slice(0, 140),
    page: "item",
    active: item.topic,
    body: renderItem(item),
  }));
}
writeFileSync(join(dist, "404.html"), page({
  depth: 0,
  title: `없는 페이지 · ${data.title}`,
  description: data.subtitle,
  page: "missing",
  absolute: true,
  body: `<main class="chapter"><h1>이 주소에는 페이지가 없습니다.</h1><p><a href="/study-archive/">공부 아카이브로 돌아가기</a></p></main>`,
}));
writeFileSync(join(dist, "robots.txt"), "User-agent: *\nAllow: /\n");
writeFileSync(join(dist, "sitemap.xml"), sitemap(pages));
console.log(`built ${pages.length} pages → dist/`);

function writePage(rel, opts) {
  const file = join(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page({ ...opts, path: rel }));
  return rel;
}

function page({ title, description, depth, body, page: pageName, active, path, absolute }) {
  const prefix = absolute ? "/study-archive/" : depth ? "../".repeat(depth) : "";
  const canonPath = path === "index.html" || !path ? "/" : `/${path.replace(/index\.html$/, "")}`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(data.site + canonPath)}">
<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#201c1f">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${esc(data.title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(data.site + canonPath)}">
<script>try{var t=localStorage.getItem("theme");if(!t&&matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t)document.documentElement.dataset.theme=t;}catch(e){}</script>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body data-page="${esc(pageName || "")}">
<a class="skip" href="#content">본문으로</a>
${header(prefix, active)}
${body}
${footer(prefix)}
<script src="${prefix}assets/site.js" defer></script>
</body>
</html>
`;
}

function header(prefix, active) {
  const links = data.topics.map((topic) => `<a href="${prefix}topics/${topic.id}/"${topic.id === active ? ' aria-current="page"' : ""}>${esc(topic.name)}</a>`).join("");
  return `<header class="topbar">
  <div class="wrap">
    <a class="brand" href="${prefix}"><img src="${prefix}favicon.svg" alt=""> 공부 아카이브 <small>Study Archive</small></a>
    <form class="search" action="${prefix || "./"}" method="get" role="search">
      <input data-search type="search" name="q" placeholder="제목, 태그, 문장" aria-label="아카이브 검색" autocomplete="off">
    </form>
    <nav class="topnav" aria-label="대주제">${links}</nav>
    <button class="icon-btn" type="button" data-theme-toggle aria-label="라이트와 다크 모드 전환">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
    </button>
  </div>
</header>`;
}

function footer(prefix) {
  return `<footer class="site-footer"><div class="wrap"><p>수치는 각 메모에 적힌 문장에서만 그렸습니다. 원본 문서의 빈 ‘내 생각’은 비어 있는 채로 두었습니다.</p><p><a href="${prefix}data/archive.json">archive.json</a> · <a href="https://github.com/SuddenlySlowly/study-archive">GitHub</a></p></div></footer>`;
}

function renderHome() {
  const counts = countStatuses(data.items);
  const pills = data.topics.map((topic) => `<a href="topics/${topic.id}/">${esc(topic.name)} <b>${itemsByTopic[topic.id].length}</b></a>`).join("");
  const highlights = data.items.flatMap((item) => item.highlights.filter((h) => h.home).map((h) => ({ ...h, item })));
  return `<main id="content">
  <section class="home-hero">
    <div class="wrap hero-grid">
      <div>
        <p class="eyebrow">Study Archive</p>
        <h1>모아 둔 공부마다,<br><em>다시 펼쳐 볼 수 있게.</em></h1>
      </div>
      <div class="hero-side">
        <p>${esc(data.subtitle)}</p>
        <p class="legend">${esc(data.statusLegend)}</p>
      </div>
    </div>
    <div class="wrap">
      <nav class="pills" aria-label="대주제">${pills}</nav>
      <div class="stats">
        <div><b>${data.topics.length}</b><span>대주제</span></div>
        <div><b>${data.items.length}</b><span>항목</span></div>
        <div><b>${counts.reading || 0}</b><span>공부중</span></div>
        <div><b>${counts.todo || 0}</b><span>읽을거리</span></div>
      </div>
    </div>
  </section>
  <section class="block">
    <div class="wrap" data-filter-group>
      <div class="sec-head"><div><p class="eyebrow">Topics</p><h2>대주제</h2></div></div>
      <div class="topic-grid">${data.topics.map(topicCard).join("")}</div>
      <p class="empty" data-empty hidden>찾는 대주제가 없습니다.</p>
    </div>
  </section>
  <section class="block">
    <div class="wrap" data-filter-group>
      <div class="sec-head"><div><p class="eyebrow">Figures</p><h2>적힌 숫자</h2><p>메모 문장에 나온 수치만 모았습니다. 칸을 누르면 해당 메모로 갑니다.</p></div></div>
      <div class="hi-grid">${highlights.map(highlightCard).join("")}</div>
      <p class="empty" data-empty hidden>조건에 맞는 숫자가 없습니다.</p>
    </div>
  </section>
  <section class="block">
    <div class="wrap layout-2">
      <div class="panel">${dayChart()}</div>
      <div>
        <div class="panel">${statusChart()}</div>
        <div class="panel" style="margin-top:16px">${tagCloud()}</div>
      </div>
    </div>
  </section>
  <section class="block">
    <div class="wrap" data-filter-group>
      <div class="sec-head"><div><p class="eyebrow">Latest</p><h2>최근 메모</h2></div><p class="sr-only" data-search-count aria-live="polite"></p></div>
      <div class="card-grid">${recentItems().map(itemCard).join("")}</div>
    </div>
  </section>
  <section class="block" style="padding-top:0">
    <div class="wrap" data-filter-group>
      <div class="sec-head"><div><p class="eyebrow">Index</p><h2>모든 메모</h2></div></div>
      <ul class="index-list">${data.items.map(indexRow).join("")}</ul>
      <p class="empty" data-empty hidden>조건에 맞는 메모가 없습니다.</p>
    </div>
  </section>
</main>`;
}

function renderTopic(topic) {
  const items = itemsByTopic[topic.id];
  const counts = countStatuses(items);
  const prefix = "../../";
  const tags = tagCounts(items);
  const highlights = items.flatMap((item) => item.highlights.map((h) => ({ ...h, item })));
  const embedded = items.length <= 3 ? items.map((item) => `<section class="figure"><p class="eyebrow">${esc(dotDate(item.date))}</p><h2 style="margin:0 0 8px;font-size:22px"><a href="${prefix}items/${item.id}/">${esc(item.title)}</a></h2>${item.visuals.map(renderVisual).join("")}<p><a href="${prefix}items/${item.id}/">메모 읽기 →</a></p></section>`).join("") : "";
  return `<main id="content">
  <header class="page-head"><div class="wrap">
    <nav class="crumbs" aria-label="경로"><a href="${prefix}">홈</a> <span aria-hidden="true">/</span> <span>${esc(topic.name)}</span></nav>
    <p class="eyebrow">${esc(topic.en)}</p>
    <h1>${esc(topic.name)}</h1>
    <p class="lede">${esc(topic.blurb)}</p>
    <div class="topic-kpis">
      <span><b>${items.length}</b> 항목</span>
      <span><b>${counts.reading || 0}</b> 공부중</span>
      <span><b>${counts.todo || 0}</b> 읽을거리</span>
      <span><b>${counts.done || 0}</b> 정리완료</span>
      <span>최근 <b>${esc(dotDate(topic.overviewLatest))}</b></span>
    </div>
  </div></header>
  <section class="block" style="padding-top:12px"><div class="wrap">
    ${highlights.length ? `<div class="sec-head"><div><p class="eyebrow">Figures</p><h2>이 주제의 숫자</h2></div></div><div class="hi-grid">${highlights.map((h) => highlightCard(h, prefix)).join("")}</div>` : ""}
    ${embedded}
    <div class="filters" data-status-bar aria-label="상태 필터">
      <button type="button" data-status-btn="all" aria-pressed="true">전체 ${items.length}</button>
      ${Object.entries(data.statuses).map(([id, s]) => `<button type="button" data-status-btn="${id}" aria-pressed="false">${esc(s.mark)} ${esc(s.label)} ${counts[id] || 0}</button>`).join("")}
    </div>
    <div class="tag-row">${[...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).map(([tag, n]) => `<button type="button" class="tag-btn" data-tag="${esc(tag)}" aria-pressed="false">#${esc(tag)} ${n}</button>`).join("")}</div>
    <div class="card-grid">${items.map((item, index) => itemCard(item, prefix, index + 1)).join("")}</div>
  </div></section>
</main>`;
}

function renderItem(item) {
  const topic = topicById[item.topic];
  const siblings = itemsByTopic[item.topic];
  const index = siblings.findIndex((row) => row.id === item.id);
  const prev = siblings[index - 1];
  const next = siblings[index + 1];
  const prefix = "../../";
  const youtube = youtubeId(item.source.url);
  return `<main id="content" class="chapter">
  <nav class="crumbs" aria-label="경로"><a href="${prefix}">홈</a> <span aria-hidden="true">/</span> <a href="${prefix}topics/${topic.id}/">${esc(topic.name)}</a> <span aria-hidden="true">/</span> <span>${esc(item.title)}</span></nav>
  <p class="eyebrow">${esc(topic.en)} · ${esc(dotDate(item.date))} · ${String(index + 1).padStart(2, "0")}</p>
  <h1>${esc(item.title)}</h1>
  <div class="chapter-meta">${badge(item.status)}${item.tags.map((tag) => `<a class="tag" href="${prefix}?q=${encodeURIComponent(tag)}">#${esc(tag)}</a>`).join("")}</div>
  <div class="lead">${paragraphs(item.summary).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
  ${item.visuals.map(renderVisual).join("")}
  ${youtube ? `<div class="yt-wrap"><button type="button" class="yt" data-yt="${esc(youtube)}" data-title="${esc(item.title)}"><img src="https://i.ytimg.com/vi/${esc(youtube)}/hqdefault.jpg" alt=""><span>영상 재생</span></button><p><a href="${esc(item.source.url)}" target="_blank" rel="noopener noreferrer">YouTube에서 열기 ↗</a></p></div>` : ""}
  <aside class="source-card"><p class="eyebrow">출처</p><p>${esc(item.source.label)}</p>${item.source.url ? `<p><a href="${esc(item.source.url)}" target="_blank" rel="noopener noreferrer">링크 열기 ↗</a></p>` : ""}</aside>
  <aside class="thought"><p class="eyebrow">내 생각</p>${item.thought ? `<p>${esc(item.thought)}</p>` : `<p class="empty">아직 비어 있습니다.</p>`}</aside>
  <nav class="pager" aria-label="앞뒤 메모">
    ${prev ? `<a class="prev" href="${prefix}items/${prev.id}/"><small>이전</small><b>${esc(prev.title)}</b></a>` : "<span></span>"}
    ${next ? `<a class="next" href="${prefix}items/${next.id}/"><small>다음</small><b>${esc(next.title)}</b></a>` : ""}
  </nav>
</main>`;
}

function recentItems() {
  return data.items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.date < b.item.date ? 1 : a.item.date > b.item.date ? -1 : b.index - a.index))
    .slice(0, 6)
    .map((row) => row.item);
}

function topicCard(topic) {
  const items = itemsByTopic[topic.id];
  const find = findText([topic.name, topic.en, topic.blurb, ...items.flatMap((item) => [item.title, ...item.tags])]);
  return `<a class="topic-card" style="--c-l:${topic.color};--c-d:${topic.colorDark}" href="topics/${topic.id}/" data-find="${esc(find)}">
    <div class="topic-art" aria-hidden="true">${art(topic.id)}</div>
    <p class="en">${esc(topic.en)}</p>
    <h3>${esc(topic.name)}</h3>
    <p>${esc(topic.blurb)}</p>
    <p class="meta"><b>${items.length}</b> 항목 · 최근 ${esc(dotDate(topic.overviewLatest))}</p>
  </a>`;
}

function highlightCard(entry, prefix = "") {
  const topic = topicById[entry.item.topic];
  const rel = entry.relation ? `<em class="rel">${esc(entry.relation)}</em>` : "";
  const find = findText([entry.display, ...entry.labelParts, ...(entry.detailParts || []), entry.item.title, topic.name]);
  return `<a class="hi" style="--c-l:${topic.color};--c-d:${topic.colorDark}" href="${prefix}items/${entry.item.id}/" data-find="${esc(find)}">
    <b>${esc(entry.display)}</b>
    <span>${esc(entry.labelParts.join(" "))}</span>
    <small>${esc((entry.detailParts || []).join(" · "))}</small>
    ${rel}
  </a>`;
}

function itemCard(item, prefix = "", number = 0) {
  const topic = topicById[item.topic];
  const find = findText([item.title, item.summary, item.date, topic.name, ...item.tags]);
  const code = number ? `${String(number).padStart(2, "0")} · ${dotDate(item.date)}` : `${topic.name} · ${dotDate(item.date)}`;
  return `<a class="card" style="--c-l:${topic.color};--c-d:${topic.colorDark}" href="${prefix}items/${item.id}/" data-find="${esc(find)}" data-status="${item.status}" data-tags="${esc(item.tags.join(","))}">
    <div class="cover"><span class="code">${esc(code)}</span><span class="headline">${esc(item.title)}</span></div>
    <div class="body">${badge(item.status)}<p class="clamp">${esc(item.summary)}</p><div class="tags">${item.tags.map((tag) => `<span class="tag">#${esc(tag)}</span>`).join("")}</div></div>
  </a>`;
}

function indexRow(item) {
  const topic = topicById[item.topic];
  const find = findText([item.title, item.summary, item.date, topic.name, ...item.tags, data.statuses[item.status].label]);
  return `<li data-find="${esc(find)}"><time datetime="${esc(item.date)}">${esc(dotDate(item.date))}</time><a href="items/${item.id}/">${esc(item.title)}</a><span class="where">${esc(topic.name)} · ${esc(data.statuses[item.status].label)}</span></li>`;
}

function dayChart() {
  const counts = new Map();
  for (const item of data.items) counts.set(item.date, (counts.get(item.date) || 0) + 1);
  const rows = [...counts.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1);
  const max = Math.max(...rows.map((row) => row[1]));
  const bars = rows.map(([date, n]) => `<div class="day"><span class="day-col" style="height:${Math.max(12, Math.round((n / max) * 100))}%"><b>${n}</b></span><time datetime="${esc(date)}">${esc(date.slice(5).replace("-", "."))}</time></div>`).join("");
  return `<h3>날짜별 추가</h3><div class="daybars" role="img" aria-label="항목이 있는 날의 개수">${bars}</div><p class="fig-note">항목이 있는 날만 표시했습니다.</p><table class="sr-only"><caption>날짜별 항목 수</caption><tbody>${rows.map(([date, n]) => `<tr><th>${esc(date)}</th><td>${n}</td></tr>`).join("")}</tbody></table>`;
}

function statusChart() {
  const counts = countStatuses(data.items);
  const max = Math.max(...Object.values(counts), 1);
  const rows = Object.entries(data.statuses).map(([id, s]) => {
    const n = counts[id] || 0;
    return `<div class="status-row"><span>${esc(s.mark)} ${esc(s.label)}</span><span class="status-track"><i style="width:${(n / max) * 100}%"></i></span><b>${n}</b></div>`;
  }).join("");
  return `<h3>상태</h3><div class="status-rows">${rows}</div>`;
}

function tagCloud() {
  const tags = tagCounts(data.items);
  const max = Math.max(...tags.values());
  const links = [...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko")).map(([tag, n]) => {
    const size = 0.86 + (n / max) * 0.85;
    return `<a href="./?q=${encodeURIComponent(tag)}" style="font-size:${size.toFixed(2)}rem">#${esc(tag)} <small>${n}</small></a>`;
  }).join("");
  return `<h3>태그</h3><div class="tag-cloud">${links}</div>`;
}

function renderVisual(visual) {
  const title = visual.title ? `<figcaption class="fig-title">${esc(visual.title)}</figcaption>` : "";
  const note = visual.caption ? `<figcaption class="fig-note">${esc(visual.caption)}</figcaption>` : "";
  let body = "";
  if (visual.type === "grouped-bar" || visual.type === "bars") body = renderBars(visual);
  else if (visual.type === "range") body = renderRange(visual);
  else if (visual.type === "meter") body = renderMeter(visual);
  else if (visual.type === "flow") body = `<ol class="flow">${visual.steps.map((step) => `<li><span>${esc(step)}</span></li>`).join("")}</ol>`;
  else if (visual.type === "split") body = `<div class="split">${visual.columns.map((col) => `<section><h3>${esc(col.title)}</h3><ul>${col.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul></section>`).join("")}</div>`;
  else if (visual.type === "checklist") body = `<ul class="checks">${visual.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
  else if (visual.type === "timeline") body = `<ol class="timeline">${visual.events.map((ev) => `<li>${ev.when ? `<time>${esc(ev.when)}</time>` : ""}<p>${esc(ev.text)}</p></li>`).join("")}</ol>`;
  else if (visual.type === "stack") body = `<ol class="stack">${visual.layers.map((layer) => `<li>${esc(layer)}</li>`).join("")}</ol>`;
  else if (visual.type === "stats") body = `<div class="statgrid">${visual.items.map((item) => `<div><b>${esc(item.v)}</b><span>${esc(item.k)}</span>${item.sub ? `<small>${esc(item.sub)}</small>` : ""}</div>`).join("")}</div>`;
  else if (visual.type === "quote") return `<figure class="figure"><blockquote class="pull">${esc(visual.text)}</blockquote></figure>`;
  else if (visual.type === "callout") return `<aside class="callout ${visual.tone === "warn" ? "warn" : "note"}"><p>${esc(visual.text)}</p></aside>`;
  else throw new Error(`unknown visual ${visual.type}`);
  return `<figure class="figure">${title}${body}${note}</figure>`;
}

function renderBars(visual) {
  const rows = visual.type === "bars"
    ? visual.rows.map((row) => ({ label: row.label, values: [row.value] }))
    : visual.rows;
  const series = visual.series || ["값"];
  const numbers = rows.flatMap((row) => row.values.filter((value) => value != null).map((value) => Number.parseFloat(value)));
  const diverging = numbers.some((n) => n < 0);
  const maxAbs = Math.max(...numbers.map((n) => Math.abs(n)), 0.0001);
  const maxPos = Math.max(...numbers.map((n) => Math.max(n, 0)), 0.0001);
  const legend = series.length > 1 ? `<div class="legend">${series.map((name, i) => `<span><i class="swatch s${i}"></i>${esc(name)}</span>`).join("")}</div>` : "";
  const lines = rows.map((row) => {
    const showKey = series.length > 1;
    const cells = row.values.map((value, i) => {
      const key = showKey ? `<span class="k">${esc(series[i] || "")}</span>` : "";
      if (value == null) return `<div class="line ${showKey ? "" : "solo"}"><i class="swatch s${i}"></i>${key}<span class="track"></span><b>–</b></div>`;
      const n = Number.parseFloat(value);
      const shown = `${esc(value)}${visual.unit && !String(value).includes("%") ? esc(visual.unit) : ""}`;
      if (diverging) {
        const width = Math.abs(n) / maxAbs * 50;
        return `<div class="line ${showKey ? "" : "solo"}"><i class="swatch s${i}"></i>${key}<span class="div-track"><i class="div-bar ${n < 0 ? "neg" : "pos"} s${i}" style="width:${width}%"></i></span><b>${shown}</b></div>`;
      }
      const width = n === 0 ? 0 : Math.max(2, (n / maxPos) * 100);
      return `<div class="line ${showKey ? "" : "solo"}"><i class="swatch s${i}"></i>${key}<span class="track"><i class="s${i}" style="width:${width}%"></i></span><b>${shown}</b></div>`;
    }).join("");
    return `<div class="metric"><div class="metric-name">${esc(row.label)}</div>${cells}</div>`;
  }).join("");
  const table = `<table class="num-table"><caption>${esc(visual.title || "수치")}</caption><thead><tr><th>항목</th>${series.map((name) => `<th>${esc(name)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr><th>${esc(row.label)}</th>${row.values.map((value) => `<td>${value == null ? "–" : esc(value)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  return `${legend}${lines}${table}`;
}

function renderRange(visual) {
  const min = Number.parseFloat(visual.min);
  const max = Number.parseFloat(visual.max);
  const value = Number.parseFloat(visual.value);
  const p = ((value - min) / (max - min)) * 100;
  return `<div class="range-track" role="img" aria-label="${esc(visual.value)}${esc(visual.unit)}, 범위 ${esc(visual.min)}에서 ${esc(visual.max)}"><span class="range-mark" style="left:${p}%"></span><b class="range-now" style="left:${Math.min(92, Math.max(8, p))}%">${esc(visual.value)}${esc(visual.unit)}</b></div>
  <div class="range-labels"><span>${esc(visual.min)}${esc(visual.unit)}</span><span>${esc(visual.max)}${esc(visual.unit)}</span></div>`;
}

function renderMeter(visual) {
  const width = Number.parseFloat(visual.value);
  const notes = (visual.notes || []).map((note) => esc(note)).join(" · ");
  return `<div class="meter" role="img" aria-label="${esc(visual.label)}"><i style="width:${width}%"></i></div><div class="meter-label"><b>${esc(visual.label)}</b><span>${notes}</span></div>`;
}

function art(id) {
  const common = `viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;
  if (id === "ai-education") return `<svg ${common}><path d="M14 24h22c4 4 8 4 12 0h18v34c-5 3-8 3-13 0H36c-4 3-8 3-12 0H14V24z"/><path d="M40 24v34"/><path d="M20 32h12M20 38h10M48 32h12M48 38h10"/></svg>`;
  if (id === "economy") return `<svg ${common}><path d="M12 58h56"/><path d="M20 58V40M32 58V28M44 58V36M56 58V18"/><path d="M16 22h18l6 8 10-12 12 8"/></svg>`;
  if (id === "agents") return `<svg ${common}><circle cx="22" cy="26" r="6"/><circle cx="54" cy="22" r="6"/><circle cx="40" cy="52" r="7"/><path d="M27 30l8 16M49 28l-6 17M28 26h20"/></svg>`;
  return `<svg ${common}><path d="M10 48c10-16 18-22 30-22s20 8 30 22"/><path d="M18 48h44"/><path d="M40 26v22"/><circle cx="40" cy="22" r="3" fill="currentColor" stroke="none"/></svg>`;
}

function badge(status) {
  const s = data.statuses[status];
  return `<span class="badge st-${status}">${esc(s.mark)} ${esc(s.label)}</span>`;
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

function countStatuses(items) {
  const counts = {};
  for (const item of items) counts[item.status] = (counts[item.status] || 0) + 1;
  return counts;
}

function tagCounts(items) {
  const tags = new Map();
  for (const item of items) for (const tag of item.tags) tags.set(tag, (tags.get(tag) || 0) + 1);
  return tags;
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

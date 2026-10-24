// dist/의 모든 HTML에서 내부 링크(href·src)를 따라가 파일과 #앵커가 실제로 있는지 확인한다.
// 404.html은 /study-archive/ 절대 경로를 쓰므로 그 접두어를 dist 루트로 본다.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (!existsSync(dist)) throw new Error("dist/ 가 없습니다. 먼저 node scripts/build.mjs");

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const htmlFiles = walk(dist).filter((f) => f.endsWith(".html"));
const idsCache = new Map();
const idsOf = (file) => {
  if (!idsCache.has(file)) idsCache.set(file, new Set([...readFileSync(file, "utf8").matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsCache.get(file);
};
const unescape = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const broken = [];
let checked = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  for (const [, attr, raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const url = unescape(raw);
    if (/^(https?:|mailto:|data:|javascript:)/.test(url) || url.startsWith("//")) continue;
    const [pathAndQuery, hash = ""] = url.split("#");
    const path = pathAndQuery.split("?")[0];
    let target;
    if (path === "") target = file;
    else if (path.startsWith("/study-archive/")) target = join(dist, decodeURIComponent(path.slice("/study-archive/".length)));
    else if (path.startsWith("/")) { broken.push(`${relative(dist, file)}: ${attr}="${url}" (사이트 밖 절대 경로)`); continue; }
    else target = join(dirname(file), decodeURIComponent(path));
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
    checked += 1;
    if (!existsSync(target)) { broken.push(`${relative(dist, file)}: ${attr}="${url}" → 파일 없음`); continue; }
    if (hash && target.endsWith(".html") && !idsOf(target).has(decodeURIComponent(hash))) {
      broken.push(`${relative(dist, file)}: ${attr}="${url}" → #${hash} 없음`);
    }
  }
}

if (broken.length) {
  console.error(`broken links ${broken.length}:\n${broken.join("\n")}`);
  process.exit(1);
}
console.log(`links ok: ${checked} internal links in ${htmlFiles.length} HTML files`);

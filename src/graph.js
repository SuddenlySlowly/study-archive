(function () {
  "use strict";

  /* knowledge map: Obsidian-style force-directed graph on a canvas, no libraries */
  const frame = document.querySelector("[data-graph]");
  if (!frame) return;
  const canvas = frame.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const raw = JSON.parse(frame.querySelector("[data-graph-data]").textContent);
  const info = frame.querySelector("[data-graph-info]");
  const infoLabel = frame.querySelector("[data-graph-label]");
  const infoMeta = frame.querySelector("[data-graph-meta]");
  const infoLink = frame.querySelector("[data-graph-link]");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const font = getComputedStyle(document.body).fontFamily;

  /* ---------- graph ---------- */
  const byId = new Map();
  const nodes = raw.nodes.map((n) => {
    const node = { ...n, x: 0, y: 0, vx: 0, vy: 0, deg: 0, nb: new Set(), held: false };
    byId.set(n.id, node);
    return node;
  });
  const links = raw.links.map(([a, b]) => ({ s: byId.get(a), t: byId.get(b) }));
  for (const l of links) {
    l.s.deg += 1;
    l.t.deg += 1;
    l.s.nb.add(l.t);
    l.t.nb.add(l.s);
  }
  for (const l of links) {
    const hub = l.s.type === "hub" ? l.s : l.t.type === "hub" ? l.t : null;
    l.len = hub ? 34 + Math.sqrt(hub.deg) * 11 : 30;
  }
  // 노드 크기는 연결 수에 비례
  const BASE = { hub: 7, item: 3.4, tag: 2.4 };
  const GROW = { hub: 3.6, item: 2, tag: 2 };
  for (const n of nodes) n.r = BASE[n.type] + Math.sqrt(n.deg) * GROW[n.type];
  for (const l of links) l.hue = l.s.type === "item" ? l.s.hue : l.t.type === "item" ? l.t.hue : (l.s.hue ?? l.t.hue);
  const order = ["tag", "item", "hub"].flatMap((type) => nodes.filter((n) => n.type === type));

  // 같은 배치로 열리도록 고정 시드
  let seed = 20261023;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hubs = nodes.filter((n) => n.type === "hub");
  hubs.forEach((h, i) => {
    const a = (i / hubs.length) * Math.PI * 2;
    h.x = Math.cos(a) * 190;
    h.y = Math.sin(a) * 190;
  });
  for (const n of nodes) {
    if (n.type === "item") {
      const hub = [...n.nb].find((m) => m.type === "hub");
      n.x = hub.x + (rand() - 0.5) * 140;
      n.y = hub.y + (rand() - 0.5) * 140;
    }
  }
  for (const n of nodes) {
    if (n.type === "tag") {
      const first = [...n.nb][0];
      n.x = first.x + (rand() - 0.5) * 70;
      n.y = first.y + (rand() - 0.5) * 70;
    }
  }

  /* ---------- force simulation ---------- */
  let alpha = 1;
  let alphaTarget = 0;
  function tick() {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) { dx = rand() - 0.5; dy = rand() - 0.5; d2 = dx * dx + dy * dy; }
        if (d2 > 160000) continue;
        const k = (30 * (a.r + b.r) * alpha) / d2;
        a.vx -= dx * k; a.vy -= dy * k;
        b.vx += dx * k; b.vy += dy * k;
      }
    }
    for (const l of links) {
      const dx = l.t.x - l.s.x;
      const dy = l.t.y - l.s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = ((d - l.len) / d) * 0.09 * alpha;
      const bias = l.s.deg / (l.s.deg + l.t.deg);
      l.t.vx -= dx * f * bias; l.t.vy -= dy * f * bias;
      l.s.vx += dx * f * (1 - bias); l.s.vy += dy * f * (1 - bias);
    }
    for (const n of nodes) {
      n.vx -= n.x * 0.03 * alpha;
      n.vy -= n.y * 0.03 * alpha;
      if (n.held) { n.vx = 0; n.vy = 0; continue; }
      n.vx *= 0.58;
      n.vy *= 0.58;
      n.x += n.vx;
      n.y += n.vy;
    }
  }
  for (let i = 0; i < 320; i += 1) { tick(); alpha *= 0.986; }
  alpha = 0;

  let running = false;
  function loop() {
    if (alpha > 0.004 || alphaTarget > 0) {
      tick();
      alpha += (alphaTarget - alpha) * 0.025;
    }
    draw();
    if (alpha > 0.004 || alphaTarget > 0) requestAnimationFrame(loop);
    else running = false;
  }
  function reheat() {
    if (reduce) { draw(); return; }
    alpha = Math.max(alpha, 0.3);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  /* ---------- view ---------- */
  let w = 0;
  let h = 0;
  let dpr = 1;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let hover = null;
  let selected = null;
  let C = {};

  function readColors() {
    const css = getComputedStyle(frame);
    const v = (name) => css.getPropertyValue(name).trim();
    C = { bg: v("--g-bg"), tag: v("--g-tag"), line: v("--g-line"), hi: v("--g-hi"), text: v("--g-text") };
    // 대주제 색: 허브는 진하게, 콘텐츠는 같은 색조를 연하게, 강조선은 약하게
    const hub = v("--g-hub-sl");
    const item = v("--g-item-sl");
    const edge = v("--g-edge-sla");
    for (const n of nodes) n.color = n.hue == null ? C.tag : `hsl(${n.hue} ${n.type === "hub" ? hub : item})`;
    for (const l of links) l.color = `hsl(${l.hue} ${edge})`;
  }

  function fit() {
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const n of nodes) {
      x0 = Math.min(x0, n.x - n.r); y0 = Math.min(y0, n.y - n.r);
      x1 = Math.max(x1, n.x + n.r); y1 = Math.max(y1, n.y + n.r);
    }
    // 가장자리 이름이 잘리지 않게 가로 여백을 넉넉히
    scale = clamp(Math.min((w - 110) / (x1 - x0), (h - 110) / (y1 - y0)), 0.15, 2.5);
    tx = w / 2 - ((x0 + x1) / 2) * scale;
    ty = h / 2 - ((y0 + y1) / 2) * scale;
    draw();
  }

  function resize() {
    const nw = canvas.clientWidth;
    const nh = canvas.clientHeight;
    if (!nw || !nh) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(nw * dpr);
    canvas.height = Math.round(nh * dpr);
    const first = !w;
    tx += (nw - w) / 2;
    ty += (nh - h) / 2;
    w = nw;
    h = nh;
    if (first) fit();
    else draw();
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const toWorld = (p) => ({ x: (p.x - tx) / scale, y: (p.y - ty) / scale });
  function zoomAt(p, factor) {
    const ns = clamp(scale * factor, 0.15, 5);
    tx = p.x - (p.x - tx) * (ns / scale);
    ty = p.y - (p.y - ty) * (ns / scale);
    scale = ns;
    draw();
  }

  function shorten(text, max) {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  function draw() {
    if (!w) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * tx, dpr * ty);
    const focus = hover || selected;
    const lit = (n) => !focus || n === focus || focus.nb.has(n);

    // 선: 초점과 이어진 선만 밝게
    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = C.line;
    ctx.globalAlpha = focus ? 0.35 : 1;
    ctx.beginPath();
    for (const l of links) {
      if (focus && (l.s === focus || l.t === focus)) continue;
      ctx.moveTo(l.s.x, l.s.y);
      ctx.lineTo(l.t.x, l.t.y);
    }
    ctx.stroke();
    if (focus) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.4 / scale;
      for (const l of links) {
        if (l.s !== focus && l.t !== focus) continue;
        ctx.strokeStyle = l.color;
        ctx.beginPath();
        ctx.moveTo(l.s.x, l.s.y);
        ctx.lineTo(l.t.x, l.t.y);
        ctx.stroke();
      }
    }

    // 점: 대주제 허브는 같은 넓이의 사각형, 콘텐츠·태그는 원
    const shape = (n, r) => {
      ctx.beginPath();
      if (n.type === "hub") { const a = r * 0.886; ctx.rect(n.x - a, n.y - a, a * 2, a * 2); }
      else ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    };
    for (const n of order) {
      const on = lit(n);
      ctx.globalAlpha = on ? 1 : 0.12;
      ctx.fillStyle = n === focus && n.type === "tag" ? C.hi : n.color;
      shape(n, n.r);
      ctx.fill();
      if (focus && on) {
        ctx.lineWidth = (n === focus ? 1.5 : 1) / scale;
        ctx.strokeStyle = C.hi;
        ctx.globalAlpha = n === focus ? 0.8 : 0.45;
        shape(n, n.r + (n === focus ? 3.5 : 1.5) / scale);
        ctx.stroke();
      }
    }

    // 이름: 초점과 이웃, 초점이 없으면 허브(확대하면 전부)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const fade = clamp((scale - 1.5) * 1.6, 0, 1);
    ctx.lineJoin = "miter";
    ctx.strokeStyle = C.bg;
    // 초점 이름은 맨 위에 오도록 마지막에
    for (const n of focus ? order.filter((m) => m !== focus).concat(focus) : order) {
      let size = 11.5;
      let weight = 400;
      let a = 0;
      let max = 18;
      if (focus) {
        if (n === focus) { size = 13.5; weight = 600; a = 1; max = 60; }
        else if (focus.nb.has(n)) { a = 0.9; max = focus.nb.size > 8 ? 14 : 22; }
      } else if (n.type === "hub") { size = 13; weight = 500; a = 1; }
      else a = fade * 0.85;
      if (!a) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = n === focus ? C.hi : C.text;
      ctx.font = `${weight} ${size / scale}px ${font}`;
      const text = shorten(n.label, max);
      const ly = n.y + n.r + 4 / scale;
      if (n === focus) {
        const tw = ctx.measureText(text).width;
        const pad = 5 / scale;
        ctx.fillStyle = C.bg;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(n.x - tw / 2 - pad, ly - pad / 2, tw + pad * 2, (size + 4) / scale);
        ctx.globalAlpha = 1;
        ctx.fillStyle = C.hi;
      } else {
        ctx.lineWidth = 3.5 / scale;
        ctx.strokeText(text, n.x, ly);
      }
      ctx.fillText(text, n.x, ly);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- selection ---------- */
  function select(n) {
    selected = n;
    if (n) {
      infoMeta.textContent = n.meta || "";
      infoLabel.textContent = n.label;
      infoLink.href = n.url;
      infoLink.textContent = n.type === "tag" ? "태그 목록에서 보기 →" : "페이지 열기 →";
      info.hidden = false;
    } else {
      info.hidden = true;
    }
    draw();
  }

  /* ---------- pointer: hover, tap, double tap, drag, pan, pinch ---------- */
  const pointers = new Map();
  let mode = null;
  let downNode = null;
  let downAt = null;
  let panStart = null;
  let pinch = null;
  let moved = false;
  let lastTap = { node: null, time: 0 };

  const pos = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  function hit(p, touch) {
    const wp = toWorld(p);
    const pad = (touch ? 12 : 5) / scale;
    let best = null;
    let bestD = Infinity;
    for (const n of order) {
      const d = Math.hypot(n.x - wp.x, n.y - wp.y) - n.r;
      if (d < pad && d <= bestD) { best = n; bestD = d; }
    }
    return best;
  }
  function startPinch() {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scale, tx, ty };
  }
  function releaseNode() {
    if (downNode) downNode.held = false;
    alphaTarget = 0;
    canvas.classList.remove("is-dragging", "is-panning");
  }

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, pos(e));
    if (pointers.size === 2) {
      releaseNode();
      downNode = null;
      mode = "pinch";
      moved = true;
      startPinch();
      return;
    }
    if (pointers.size > 2) return;
    const p = pos(e);
    downAt = p;
    moved = false;
    downNode = hit(p, e.pointerType !== "mouse");
    mode = downNode ? "drag" : "pan";
    panStart = { x: p.x, y: p.y, tx, ty };
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType !== "mouse") return;
      const n = hit(pos(e), false);
      if (n !== hover) {
        hover = n;
        canvas.classList.toggle("is-over", Boolean(n));
        draw();
      }
      return;
    }
    pointers.set(e.pointerId, pos(e));
    if (mode === "pinch" && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const ns = clamp((pinch.scale * d) / pinch.d, 0.15, 5);
      const wx = (pinch.mid.x - pinch.tx) / pinch.scale;
      const wy = (pinch.mid.y - pinch.ty) / pinch.scale;
      scale = ns;
      tx = mid.x - wx * ns;
      ty = mid.y - wy * ns;
      draw();
      return;
    }
    const p = pos(e);
    if (!moved && Math.hypot(p.x - downAt.x, p.y - downAt.y) > (e.pointerType === "mouse" ? 3 : 8)) moved = true;
    if (!moved) return;
    if (mode === "drag") {
      const wp = toWorld(p);
      downNode.held = true;
      downNode.x = wp.x;
      downNode.y = wp.y;
      hover = e.pointerType === "mouse" ? downNode : hover;
      canvas.classList.add("is-dragging");
      if (!reduce) alphaTarget = 0.22;
      reheat();
    } else if (mode === "pan") {
      tx = panStart.tx + p.x - panStart.x;
      ty = panStart.ty + p.y - panStart.y;
      canvas.classList.add("is-panning");
      draw();
    }
  });

  function pointerEnd(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (mode === "pinch") {
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        mode = "pan";
        panStart = { x: p.x, y: p.y, tx, ty };
      } else if (!pointers.size) mode = null;
      return;
    }
    const tapped = !moved && e.type === "pointerup";
    const node = downNode;
    releaseNode();
    if (node && moved) reheat();
    mode = null;
    downNode = null;
    if (!tapped) return;
    const now = performance.now();
    if (node && lastTap.node === node && now - lastTap.time < 420) {
      location.href = node.url;
      return;
    }
    lastTap = { node, time: now };
    select(node);
  }
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", pointerEnd);
  canvas.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && hover && !pointers.size) {
      hover = null;
      canvas.classList.remove("is-over");
      draw();
    }
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomAt(pos(e), Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0016)));
  }, { passive: false });

  frame.querySelectorAll("[data-graph-zoom]").forEach((btn) => {
    btn.addEventListener("click", () => zoomAt({ x: w / 2, y: h / 2 }, btn.dataset.graphZoom === "1" ? 1.3 : 1 / 1.3));
  });
  frame.querySelector("[data-graph-fit]").addEventListener("click", fit);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && selected) select(null); });

  /* ---------- theme, size, #tag- links ---------- */
  readColors();
  const recolor = () => { readColors(); draw(); };
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  new ResizeObserver(resize).observe(canvas);
  resize();

  const fromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const n = id && nodes.find((node) => node.anchor === id);
    if (n) select(n);
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();

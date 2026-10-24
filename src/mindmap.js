// 책 상세의 메모 마인드맵. 외부 라이브러리 없이 DOM 노드 + SVG 곡선으로 그린다.
// 저장소 메모는 빌드가 페이지에 넣어 둔 JSON(data/notes/<id>.json)이고, 브라우저에서 고친 내용은 localStorage `notes:<id>`에 자동 저장한다.
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const COLORS = 8;
  const H_GAP = [0, 64, 40]; // 부모와의 가로 간격(깊이 1, 2 이상)
  const V_GAP = [0, 22, 10]; // 형제 사이 세로 간격
  const MIN_Z = 0.25;
  const MAX_Z = 2.5;
  const MAX_TEXT = 500;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-mindmap]").forEach(init);

  function init(el) {
    const bookId = el.dataset.book;
    const key = `notes:${bookId}`;
    const stage = el.querySelector("[data-mm-stage]");
    const bar = el.querySelector("[data-mm-bar]");
    const statusEl = el.querySelector("[data-mm-status]");
    const zoomEl = el.querySelector("[data-mm-zoom]");
    const fileInput = el.querySelector("[data-mm-file]");
    let repo;
    try { repo = JSON.parse(el.querySelector("[data-mm-data]").textContent); } catch (e) { return; }
    const title = repo.root.text;
    normalize(repo.root);

    const store = {
      get() { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
      set(value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } },
      del() { try { localStorage.removeItem(key); } catch (e) {} },
    };

    // 브라우저 편집본은 그것을 시작할 때의 저장소 메모(base)나 마지막으로 내보낸 파일(exported)이 지금 저장소 메모와 같을 때만 그대로 쓴다.
    // 그 사이 저장소 메모가 바뀌었으면 저장소 메모를 보여 주고, 편집본은 알림 줄에서 불러올 수 있게 둔다
    let doc = clone(repo);
    let source = "repo";
    let saveOk = true;
    let pending = null;
    const local = store.get();
    if (local && local.doc && valid(local.doc.root)) {
      normalize(local.doc.root);
      const stamp = repo.updatedAt || "";
      if (local.base === stamp || (stamp && local.exported === stamp)) { doc = local.doc; source = "local"; }
      else if (JSON.stringify(strip(local.doc.root)) !== JSON.stringify(strip(repo.root))) pending = local;
    }
    doc.root.text = title;

    let sel = null;
    let editing = null; // { id, snap, isNew }
    let drag = null; // { kind: "node" | "pan", ... }
    const view = { x: 0, y: 0, z: 1 };
    const undoStack = [];
    const redoStack = [];
    const els = new Map(); // id → 노드 요소
    let pos = new Map(); // id → 배치 결과 { x, y, w, h, dir, depth, color, parent }
    let shown = new Map(); // 지금 화면에 그려진 위치(애니메이션 시작점)
    let raf = 0;
    const pointers = new Map();
    let pinch = null;

    stage.innerHTML = "";
    const layer = document.createElement("div");
    layer.className = "mm-layer";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "mm-edges");
    svg.setAttribute("aria-hidden", "true");
    layer.append(svg);
    const live = document.createElement("span");
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    stage.append(layer, live);
    bar.hidden = false;
    if (pending) showNotice();

    render(false);
    fit();
    setStatus();

    /* ---------- tree helpers ---------- */

    function find(id, node = doc.root) {
      if (node.id === id) return node;
      for (const child of node.children) {
        const hit = find(id, child);
        if (hit) return hit;
      }
      return null;
    }

    function parentOf(id, node = doc.root) {
      for (const child of node.children) {
        if (child.id === id) return node;
        const hit = parentOf(id, child);
        if (hit) return hit;
      }
      return null;
    }

    function contains(node, id) {
      return node.id === id || node.children.some((child) => contains(child, id));
    }

    function newId() {
      return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    }

    // 1단계 가지는 색 번호를 갖는다. 비어 있으면 아직 안 쓴 번호부터
    function nextColor() {
      const used = new Set(doc.root.children.map((child) => child.color));
      for (let i = 0; i < COLORS; i += 1) if (!used.has(i)) return i;
      return doc.root.children.length % COLORS;
    }

    /* ---------- render + layout ---------- */

    function makeNode(id) {
      const e = document.createElement("div");
      e.dataset.id = id;
      const t = document.createElement("span");
      t.className = "mm-text";
      t.dataset.ph = "내용 입력";
      t.addEventListener("keydown", onEditKey);
      t.addEventListener("input", () => { if (editing) { layout(); draw(false); } });
      t.addEventListener("blur", () => { if (editing) commitEdit(); });
      const f = document.createElement("button");
      f.type = "button";
      f.className = "mm-fold";
      f.tabIndex = -1;
      e.append(t, f);
      return e;
    }

    function render(anim = true) {
      const seen = new Set();
      const visit = (node, depth) => {
        seen.add(node.id);
        let e = els.get(node.id);
        if (!e) { e = makeNode(node.id); els.set(node.id, e); layer.append(e); }
        const isEditing = editing && editing.id === node.id;
        if (!isEditing) e.firstChild.textContent = node.text;
        e.className = `mm-node ${depth === 0 ? "root" : `d${Math.min(depth, 2)}`}${node.id === sel ? " sel" : ""}${isEditing ? " editing" : ""}${drag && drag.moved && drag.id === node.id ? " dragging" : ""}`;
        const fold = e.lastChild;
        fold.hidden = depth === 0 || !node.children.length;
        fold.classList.toggle("folded", Boolean(node.collapsed));
        fold.textContent = node.collapsed ? String(node.children.length) : "−";
        fold.setAttribute("aria-label", node.collapsed ? `펼치기 (${node.children.length}개)` : "접기");
        if (!node.collapsed) node.children.forEach((child) => visit(child, depth + 1));
      };
      visit(doc.root, 0);
      els.forEach((e, id) => { if (!seen.has(id)) { e.remove(); els.delete(id); shown.delete(id); } });
      layout();
      draw(anim);
      updateBar();
    }

    // 가운데 책 제목, 1단계 가지는 오른쪽부터 채우고 높이가 절반을 넘으면 왼쪽. 각 가지는 가로로 자라는 나무
    function layout() {
      pos = new Map();
      const sub = new Map();
      const kids = (node) => (node.collapsed ? [] : node.children);
      const vgap = (depth) => V_GAP[Math.min(depth, 2)];
      const hgap = (depth) => H_GAP[Math.min(depth, 2)];
      const measure = (node, depth) => {
        const e = els.get(node.id);
        let total = 0;
        kids(node).forEach((child, i) => { total += measure(child, depth + 1) + (i ? vgap(depth + 1) : 0); });
        const m = { w: e.offsetWidth, nh: e.offsetHeight, kids: total };
        m.h = Math.max(m.nh, total);
        sub.set(node.id, m);
        return m.h;
      };
      const place = (node, depth, x, top, dir, color, parent, ox, oy) => {
        const m = sub.get(node.id);
        const dx = ox + (node.dx || 0);
        const dy = oy + (node.dy || 0);
        const cy = top + m.h / 2;
        pos.set(node.id, { x: (dir > 0 ? x : x - m.w) + dx, y: cy - m.nh / 2 + dy, w: m.w, h: m.nh, dir, depth, color, parent });
        const cx = dir > 0 ? x + m.w + hgap(depth + 1) : x - m.w - hgap(depth + 1);
        let y = cy - m.kids / 2;
        kids(node).forEach((child) => {
          place(child, depth + 1, cx, y, dir, color, node.id, dx, dy);
          y += sub.get(child.id).h + vgap(depth + 1);
        });
      };
      const root = doc.root;
      const re = els.get(root.id);
      const rw = re.offsetWidth;
      const rh = re.offsetHeight;
      pos.set(root.id, { x: -rw / 2, y: -rh / 2, w: rw, h: rh, dir: 1, depth: 0, color: 0, parent: null });
      const top = kids(root);
      top.forEach((child) => measure(child, 1));
      const total = top.reduce((n, child) => n + sub.get(child.id).h, 0);
      const sides = [[], []];
      let acc = 0;
      top.forEach((child) => {
        (acc < total / 2 || !sides[0].length ? sides[0] : sides[1]).push(child);
        acc += sub.get(child.id).h;
      });
      sides.forEach((list, s) => {
        const dir = s ? -1 : 1;
        const height = list.reduce((n, child, i) => n + sub.get(child.id).h + (i ? V_GAP[1] : 0), 0);
        let y = -height / 2;
        list.forEach((child) => {
          const color = Number.isInteger(child.color) ? child.color : root.children.indexOf(child) % COLORS;
          place(child, 1, dir > 0 ? rw / 2 + H_GAP[1] : -rw / 2 - H_GAP[1], y, dir, color, root.id, 0, 0);
          y += sub.get(child.id).h + V_GAP[1];
        });
      });
      pos.forEach((p, id) => {
        const e = els.get(id);
        if (p.depth) {
          e.classList.add(p.dir > 0 ? "right" : "left");
          e.style.setProperty("--b", `var(--b${p.color})`);
        }
      });
    }

    // 새 위치까지 짧게 미끄러지듯 옮긴다. 새로 생긴 노드는 부모 자리에서 나온다
    function draw(anim) {
      cancelAnimationFrame(raf);
      const from = new Map(shown);
      const to = pos;
      const dur = anim && !reduced ? 240 : 0;
      const start = performance.now();
      const frame = (now) => {
        const t = dur ? Math.min(1, (now - start) / dur) : 1;
        const k = 1 - Math.pow(1 - t, 3);
        const cur = new Map();
        to.forEach((p, id) => {
          let f = from.get(id);
          if (!f) {
            const pp = p.parent && (from.get(p.parent) || to.get(p.parent));
            f = pp ? { x: pp.x + (pp.w - p.w) / 2, y: pp.y + (pp.h - p.h) / 2 } : p;
          }
          const x = f.x + (p.x - f.x) * k;
          const y = f.y + (p.y - f.y) * k;
          cur.set(id, { ...p, x, y });
          els.get(id).style.transform = `translate(${x}px, ${y}px)`;
        });
        edges(cur);
        shown = cur;
        if (t < 1) raf = requestAnimationFrame(frame);
      };
      if (dur) raf = requestAnimationFrame(frame);
      else frame(start);
    }

    // 부모 옆면 가운데에서 자식 옆면 가운데로 가는 1px 직각 연결선(가로 → 세로 → 가로). 1단계 가지만 조금 굵게
    function edges(at) {
      let out = "";
      at.forEach((p) => {
        if (!p.parent) return;
        const q = at.get(p.parent);
        if (!q) return;
        const fromRoot = q.depth === 0;
        const x1 = p.dir > 0 ? q.x + q.w - (fromRoot ? 12 : 0) : q.x + (fromRoot ? 12 : 0);
        const y1 = q.y + q.h / 2;
        const x2 = p.dir > 0 ? p.x : p.x + p.w;
        const y2 = p.y + p.h / 2;
        const mx = x1 + (x2 - x1) * 0.5;
        const width = p.depth === 1 ? 1.5 : 1;
        out += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}H${mx.toFixed(1)}V${y2.toFixed(1)}H${x2.toFixed(1)}" style="--b:var(--b${p.color})" stroke-width="${width}"/>`;
      });
      svg.innerHTML = out;
    }

    /* ---------- view: pan / zoom / fit ---------- */

    function applyView() {
      layer.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
      zoomEl.textContent = `${Math.round(view.z * 100)}%`;
    }

    function zoomAt(sx, sy, factor) {
      const z = Math.max(MIN_Z, Math.min(MAX_Z, view.z * factor));
      view.x = sx - ((sx - view.x) * z) / view.z;
      view.y = sy - ((sy - view.y) * z) / view.z;
      view.z = z;
      applyView();
    }

    function bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pos.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h); });
      return { x0, y0, x1, y1 };
    }

    function fit() {
      const { x0, y0, x1, y1 } = bounds();
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const pad = 48;
      view.z = Math.max(MIN_Z, Math.min(1, (W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0)));
      view.x = W / 2 - ((x0 + x1) / 2) * view.z;
      view.y = H / 2 - ((y0 + y1) / 2) * view.z;
      applyView();
    }

    function ensureVisible(id) {
      const p = pos.get(id);
      if (!p) return;
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const pad = 24;
      const sx0 = p.x * view.z + view.x;
      const sy0 = p.y * view.z + view.y;
      const sx1 = sx0 + p.w * view.z;
      const sy1 = sy0 + p.h * view.z;
      if (sx0 < pad) view.x += pad - sx0;
      else if (sx1 > W - pad) view.x -= sx1 - (W - pad);
      if (sy0 < pad) view.y += pad - sy0;
      else if (sy1 > H - pad) view.y -= sy1 - (H - pad);
      applyView();
    }

    function toWorld(ev) {
      const r = stage.getBoundingClientRect();
      return { x: (ev.clientX - r.left - view.x) / view.z, y: (ev.clientY - r.top - view.y) / view.z };
    }

    /* ---------- edits ---------- */

    function snapshot() {
      return JSON.stringify(doc.root);
    }

    function pushUndo(snap = snapshot()) {
      undoStack.push(snap);
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
    }

    function restore(from, to) {
      if (!from.length) return;
      to.push(snapshot());
      doc.root = JSON.parse(from.pop());
      doc.root.text = title;
      if (sel && !find(sel)) sel = null;
      save();
      render();
    }

    function save() {
      doc.updatedAt = new Date().toISOString();
      const prev = store.get();
      saveOk = store.set({ base: repo.updatedAt || "", exported: prev && prev.exported, savedAt: doc.updatedAt, doc });
      source = "local";
      setStatus();
    }

    function select(id, reveal = true) {
      sel = id;
      els.forEach((e, key) => e.classList.toggle("sel", key === id));
      updateBar();
      if (id) {
        const node = find(id);
        live.textContent = `${node.text || "빈 노드"} 선택${node.children.length ? `, 하위 ${node.children.length}개${node.collapsed ? " 접힘" : ""}` : ""}`;
        if (reveal) ensureVisible(id);
      }
    }

    function addChild(pid) {
      const parent = find(pid);
      if (!parent) return;
      pushUndo();
      const node = { id: newId(), text: "", children: [] };
      if (parent === doc.root) node.color = nextColor();
      parent.collapsed = false;
      parent.children.push(node);
      sel = node.id;
      render();
      startEdit(node.id, true);
    }

    function addSibling(id) {
      const parent = parentOf(id);
      if (!parent) return addChild(id);
      pushUndo();
      const node = { id: newId(), text: "", children: [] };
      if (parent === doc.root) node.color = nextColor();
      parent.children.splice(parent.children.findIndex((c) => c.id === id) + 1, 0, node);
      sel = node.id;
      render();
      startEdit(node.id, true);
    }

    function removeNode(id) {
      const parent = parentOf(id);
      if (!parent) return;
      pushUndo();
      const i = parent.children.findIndex((c) => c.id === id);
      parent.children.splice(i, 1);
      const next = parent.children[i] || parent.children[i - 1] || parent;
      sel = next.id;
      save();
      render();
      select(sel);
    }

    function toggle(id) {
      const node = find(id);
      if (!node || !node.children.length || node === doc.root) return;
      pushUndo();
      node.collapsed = !node.collapsed;
      if (!node.collapsed) delete node.collapsed;
      save();
      render();
    }

    function relayout() {
      pushUndo();
      const clear = (node) => { delete node.dx; delete node.dy; node.children.forEach(clear); };
      clear(doc.root);
      save();
      render();
      setTimeout(fit, reduced ? 0 : 260);
    }

    function startEdit(id, isNew = false) {
      const node = find(id);
      if (!node || node === doc.root) return;
      const e = els.get(id);
      const t = e.firstChild;
      editing = { id, snap: isNew ? null : snapshot(), isNew };
      e.classList.add("editing");
      try { t.contentEditable = "plaintext-only"; } catch (err) { t.contentEditable = "true"; }
      t.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(t);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(range);
      ensureVisible(id);
      updateBar();
    }

    function commitEdit(cancel = false) {
      const { id, snap, isNew } = editing;
      editing = null;
      const node = find(id);
      const e = els.get(id);
      if (e) { e.firstChild.contentEditable = "false"; e.classList.remove("editing"); }
      if (!node) return;
      const text = cancel ? node.text : e.firstChild.innerText.replace(/ /g, " ").replace(/\n+$/, "").trim().slice(0, MAX_TEXT);
      if (!text) {
        // 비워 둔 새 노드는 없던 일로, 원래 있던 노드는 원래 글로
        if (isNew) {
          const parent = parentOf(id);
          parent.children.splice(parent.children.findIndex((c) => c.id === id), 1);
          undoStack.pop();
          sel = parent.id;
        }
      } else if (text !== node.text || isNew) {
        if (snap) pushUndo(snap);
        node.text = text;
        save();
      }
      render();
      select(sel, false);
      stage.focus({ preventScroll: true });
    }

    function onEditKey(ev) {
      if (!editing) return;
      ev.stopPropagation();
      if (ev.isComposing || ev.keyCode === 229) return;
      // 방금 만든 노드에서 Enter를 치면 이어서 형제를 하나 더 만든다(빠르게 받아 적기). 원래 있던 노드는 고치기만 끝낸다
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); const { id, isNew } = editing; commitEdit(); if (isNew && find(id)) addSibling(id); }
      else if (ev.key === "Tab") { ev.preventDefault(); const id = editing.id; commitEdit(); if (find(id)) addChild(id); }
      else if (ev.key === "Escape") { ev.preventDefault(); commitEdit(true); }
    }

    /* ---------- keyboard ---------- */

    stage.addEventListener("keydown", (ev) => {
      if (editing || ev.isComposing) return;
      const mod = ev.ctrlKey || ev.metaKey;
      const k = ev.key;
      if (mod && (k === "z" || k === "Z")) { ev.preventDefault(); if (ev.shiftKey) restore(redoStack, undoStack); else restore(undoStack, redoStack); return; }
      if (mod && (k === "y" || k === "Y")) { ev.preventDefault(); restore(redoStack, undoStack); return; }
      if (mod) return;
      if (k === "Escape") {
        if (el.classList.contains("is-full")) setFull(false);
        else select(null);
        return;
      }
      if (k === "0") { fit(); return; }
      if (k === "=" || k === "+") { zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.2); return; }
      if (k === "-") { zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1 / 1.2); return; }
      if (k.startsWith("Arrow")) { ev.preventDefault(); move(k); return; }
      if (!sel) {
        if (k === "Enter") { ev.preventDefault(); select(doc.root.id); }
        return; // 아무것도 고르지 않았으면 Tab은 다음 요소로 넘어간다
      }
      if (k === "Tab" && !ev.shiftKey) { ev.preventDefault(); addChild(sel); }
      else if (k === "Enter") { ev.preventDefault(); sel === doc.root.id ? addChild(sel) : addSibling(sel); }
      else if (k === "F2") { ev.preventDefault(); startEdit(sel); }
      else if (k === "Delete" || k === "Backspace") { ev.preventDefault(); removeNode(sel); }
      else if (k === " ") { ev.preventDefault(); toggle(sel); }
    });

    // 화살표: 그 방향에 있는 가장 가까운 노드로
    function move(key) {
      if (!sel || !pos.has(sel)) return select(doc.root.id);
      const p = pos.get(sel);
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const [ux, uy] = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
      let best = null;
      let score = Infinity;
      pos.forEach((q, id) => {
        if (id === sel) return;
        const dx = q.x + q.w / 2 - cx;
        const dy = q.y + q.h / 2 - cy;
        const along = dx * ux + dy * uy;
        if (along <= 4) return;
        const across = Math.abs(dx * uy - dy * ux);
        const s = along + across * 2.5;
        if (s < score) { score = s; best = id; }
      });
      if (best) select(best);
    }

    /* ---------- pointer: select, drag nodes, pan, pinch ---------- */

    stage.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0 && ev.pointerType === "mouse") return;
      if (ev.target.closest(".mm-fold")) return;
      const nodeEl = ev.target.closest(".mm-node");
      if (editing && nodeEl && nodeEl.dataset.id === editing.id) return;
      if (editing) commitEdit();
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        drag = null;
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.z };
        return;
      }
      stage.focus({ preventScroll: true });
      const id = nodeEl && nodeEl.dataset.id;
      if (id && id !== doc.root.id) {
        const node = find(id);
        select(id, false);
        drag = { kind: "node", id, sx: ev.clientX, sy: ev.clientY, ox: node.dx || 0, oy: node.dy || 0, snap: snapshot(), moved: false, target: null };
      } else {
        if (id) select(id, false);
        drag = { kind: "pan", sx: ev.clientX, sy: ev.clientY, vx: view.x, vy: view.y, moved: false, onNode: Boolean(id) };
      }
      addEventListener("pointermove", onMove);
      addEventListener("pointerup", onUp);
      addEventListener("pointercancel", onUp);
    });

    function onMove(ev) {
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const r = stage.getBoundingClientRect();
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, (pinch.z * (d / pinch.d)) / view.z);
        return;
      }
      if (!drag) return;
      const dx = ev.clientX - drag.sx;
      const dy = ev.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      if (!drag.moved) {
        drag.moved = true;
        if (drag.kind === "pan") stage.classList.add("panning");
        else els.get(drag.id).classList.add("dragging");
      }
      if (drag.kind === "pan") {
        view.x = drag.vx + dx;
        view.y = drag.vy + dy;
        applyView();
        return;
      }
      const node = find(drag.id);
      node.dx = drag.ox + dx / view.z;
      node.dy = drag.oy + dy / view.z;
      layout();
      draw(false);
      hitTest(ev);
    }

    // 끌고 있는 노드 밑의 다른 노드: 위·아래 1/4이면 그 앞·뒤 형제로, 가운데면 그 자식으로
    function hitTest(ev) {
      const w = toWorld(ev);
      const moving = find(drag.id);
      let target = null;
      pos.forEach((p, id) => {
        if (target || contains(moving, id)) return;
        if (w.x < p.x - 6 || w.x > p.x + p.w + 6 || w.y < p.y - 6 || w.y > p.y + p.h + 6) return;
        const f = (w.y - p.y) / p.h;
        const zone = id === doc.root.id ? "in" : f < 0.25 ? "before" : f > 0.75 ? "after" : "in";
        target = { id, zone };
      });
      els.forEach((e) => e.classList.remove("drop-in", "drop-before", "drop-after"));
      if (target) els.get(target.id).classList.add(`drop-${target.zone}`);
      drag.target = target;
    }

    function onUp(ev) {
      pointers.delete(ev.pointerId);
      if (pinch) { if (pointers.size < 2) pinch = null; if (!drag) cleanup(); return; }
      const d = drag;
      drag = null;
      cleanup();
      stage.classList.remove("panning");
      if (!d) return;
      if (d.kind === "pan") {
        if (!d.moved && !d.onNode) select(null);
        return;
      }
      if (!d.moved) return;
      els.forEach((e) => e.classList.remove("drop-in", "drop-before", "drop-after", "dragging"));
      const node = find(d.id);
      pushUndo(d.snap);
      if (d.target) {
        // 다른 노드 위에 놓으면 그 노드로 옮기고, 손으로 옮긴 위치는 지운다
        const from = parentOf(d.id);
        from.children.splice(from.children.findIndex((c) => c.id === d.id), 1);
        delete node.dx;
        delete node.dy;
        const target = find(d.target.id);
        if (d.target.zone === "in") {
          target.collapsed = false;
          delete target.collapsed;
          target.children.push(node);
        } else {
          const parent = parentOf(target.id);
          const i = parent.children.indexOf(target);
          parent.children.splice(d.target.zone === "before" ? i : i + 1, 0, node);
        }
        const parent = parentOf(d.id);
        if (parent === doc.root && !Number.isInteger(node.color)) node.color = nextColor();
      } else {
        node.dx = Math.round(node.dx);
        node.dy = Math.round(node.dy);
        if (!node.dx) delete node.dx;
        if (!node.dy) delete node.dy;
      }
      save();
      render();
    }

    function cleanup() {
      if (pointers.size) return;
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", onUp);
    }

    stage.addEventListener("click", (ev) => {
      const fold = ev.target.closest(".mm-fold");
      if (fold) { toggle(fold.parentElement.dataset.id); stage.focus({ preventScroll: true }); }
    });

    stage.addEventListener("dblclick", (ev) => {
      const nodeEl = ev.target.closest(".mm-node");
      if (nodeEl && !ev.target.closest(".mm-fold") && !(editing && editing.id === nodeEl.dataset.id)) startEdit(nodeEl.dataset.id);
    });

    // Ctrl(⌘)+휠·트랙패드 핀치는 확대, 전체 화면에서는 그냥 휠로 이동. 그 밖의 휠은 페이지 스크롤에 둔다
    stage.addEventListener("wheel", (ev) => {
      const r = stage.getBoundingClientRect();
      if (ev.ctrlKey || ev.metaKey) {
        ev.preventDefault();
        zoomAt(ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * 0.01));
      } else if (el.classList.contains("is-full")) {
        ev.preventDefault();
        view.x -= ev.deltaX;
        view.y -= ev.deltaY;
        applyView();
      }
    }, { passive: false });

    /* ---------- toolbar ---------- */

    bar.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-mm]");
      if (!btn || btn.disabled) return;
      const cmd = btn.dataset.mm;
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      if (cmd === "child" && sel) addChild(sel);
      else if (cmd === "sibling" && sel) addSibling(sel);
      else if (cmd === "edit" && sel) startEdit(sel);
      else if (cmd === "delete" && sel) removeNode(sel);
      else if (cmd === "fold" && sel) toggle(sel);
      else if (cmd === "undo") restore(undoStack, redoStack);
      else if (cmd === "redo") restore(redoStack, undoStack);
      else if (cmd === "layout") relayout();
      else if (cmd === "zoom-in") zoomAt(W / 2, H / 2, 1.2);
      else if (cmd === "zoom-out") zoomAt(W / 2, H / 2, 1 / 1.2);
      else if (cmd === "fit") fit();
      else if (cmd === "full") setFull(!el.classList.contains("is-full"));
      else if (cmd === "export") exportJson();
      else if (cmd === "import") fileInput.click();
      else if (cmd === "reset") resetToRepo();
    });

    function updateBar() {
      const node = sel && find(sel);
      const isRoot = node === doc.root;
      const set = (cmd, on) => { const b = bar.querySelector(`[data-mm="${cmd}"]`); if (b) b.disabled = !on; };
      set("child", Boolean(node));
      set("sibling", Boolean(node) && !isRoot);
      set("edit", Boolean(node) && !isRoot);
      set("delete", Boolean(node) && !isRoot);
      set("fold", Boolean(node) && !isRoot && node.children.length > 0);
      set("undo", undoStack.length > 0);
      set("redo", redoStack.length > 0);
      set("reset", source === "local");
      const fold = bar.querySelector('[data-mm="fold"]');
      if (fold) fold.textContent = node && node.collapsed ? "펼치기" : "접기";
    }

    function setFull(on) {
      el.classList.toggle("is-full", on);
      document.body.classList.toggle("mm-lock", on);
      bar.querySelector('[data-mm="full"]').setAttribute("aria-pressed", String(on));
      requestAnimationFrame(fit);
      stage.focus({ preventScroll: true });
    }

    function setStatus() {
      const fmt = (iso) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      };
      statusEl.dataset.state = source;
      if (source === "local") {
        statusEl.textContent = saveOk
          ? `이 브라우저에 자동 저장됨 · ${fmt(doc.updatedAt)} · 사이트에 올리려면 JSON 내보내기 → data/notes/${bookId}.json 커밋`
          : "이 브라우저에 저장하지 못했습니다(저장 공간 차단). 닫기 전에 JSON 내보내기로 받아 두세요.";
      } else {
        statusEl.textContent = repo.updatedAt
          ? `저장소 메모 · data/notes/${bookId}.json · ${fmt(repo.updatedAt)}`
          : "아직 메모가 없습니다. 가운데 제목을 누르고 Tab으로 가지를 더해 보세요.";
      }
      updateBar();
    }

    function showNotice() {
      const box = document.createElement("div");
      box.className = "mm-notice";
      box.setAttribute("role", "status");
      box.innerHTML = `<span>이 브라우저에 저장소 메모와 다른 편집본이 있습니다${pending.savedAt ? ` (${esc(pending.savedAt.slice(0, 16).replace("T", " "))})` : ""}. 저장소 메모가 그 뒤에 바뀌어서 저장소 메모를 보여 줍니다.</span><button type="button" data-n="load">편집본 불러오기</button><button type="button" data-n="drop">편집본 지우기</button>`;
      box.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-n]");
        if (!b) return;
        if (b.dataset.n === "load") {
          pushUndo();
          doc.root = pending.doc.root;
          doc.root.text = title;
          save();
          render();
          fit();
        } else store.del();
        pending = null;
        box.remove();
      });
      bar.after(box);
    }

    function exportJson() {
      const out = { version: 1, bookId, updatedAt: new Date().toISOString(), root: strip(doc.root) };
      const blob = new Blob([`${JSON.stringify(out, null, 2)}\n`], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${bookId}.json`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      // 내보낸 파일을 커밋하면 저장소 메모의 updatedAt이 이 값이 되므로, 그때도 이 편집본을 이어서 쓴다
      doc.updatedAt = out.updatedAt;
      saveOk = store.set({ base: repo.updatedAt || "", exported: out.updatedAt, savedAt: out.updatedAt, doc });
      source = "local";
      setStatus();
    }

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      file.text().then((text) => {
        let data;
        try { data = JSON.parse(text); } catch (e) { alert("JSON 파일을 읽지 못했습니다."); return; }
        const root = data && data.root ? data.root : data;
        if (!valid(root)) { alert("메모 형식이 아닙니다. { version, bookId, root: { id, text, children } } 형식이어야 합니다."); return; }
        if (data.bookId && data.bookId !== bookId && !confirm(`다른 책(${data.bookId})의 메모입니다. 그래도 이 책으로 가져올까요?`)) return;
        pushUndo();
        normalize(root);
        root.text = title;
        doc.root = root;
        sel = null;
        save();
        render();
        fit();
      });
    });

    function resetToRepo() {
      if (!confirm("이 브라우저의 편집본을 지우고 저장소 메모로 되돌릴까요? (되돌리기로 다시 가져올 수 있습니다)")) return;
      pushUndo();
      doc = { ...clone(repo), root: clone(repo.root) };
      doc.root.text = title;
      store.del();
      source = "repo";
      sel = null;
      render();
      fit();
      setStatus();
    }
  }

  /* ---------- data helpers ---------- */

  function valid(node, depth = 0) {
    return Boolean(node) && typeof node === "object" && typeof node.text === "string" && depth < 40
      && (node.children == null || (Array.isArray(node.children) && node.children.every((child) => valid(child, depth + 1))));
  }

  // 빠진 children·id를 채우고, 겹치는 id는 새로 만든다. 1단계 가지에는 색 번호를 붙여 둔다
  function normalize(root) {
    const seen = new Set();
    const walk = (node, depth, index) => {
      if (typeof node.id !== "string" || !/^[\w-]{1,40}$/.test(node.id) || seen.has(node.id)) node.id = `n${Math.random().toString(36).slice(2, 10)}`;
      seen.add(node.id);
      node.text = String(node.text).slice(0, 2000);
      if (!Array.isArray(node.children)) node.children = [];
      if (depth === 1 && !Number.isInteger(node.color)) node.color = index % 8;
      if (node.collapsed !== true) delete node.collapsed;
      node.children.forEach((child, i) => walk(child, depth + 1, i));
    };
    walk(root, 0, 0);
    return root;
  }

  // 저장 형식: id·text·children, 그리고 쓸 때만 collapsed·color·dx·dy
  function strip(node) {
    const out = { id: node.id, text: node.text };
    if (node.collapsed) out.collapsed = true;
    if (Number.isInteger(node.color)) out.color = node.color;
    if (node.dx) out.dx = Math.round(node.dx);
    if (node.dy) out.dy = Math.round(node.dy);
    out.children = node.children.map(strip);
    return out;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
})();

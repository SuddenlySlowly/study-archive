(function () {
  "use strict";

  const doc = document.documentElement;
  const body = document.body;
  const root = body.dataset.root || "";
  const fold = (value) => String(value || "").normalize("NFC").toLowerCase().replace(/\s+/g, "");
  const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) {} },
  };

  /* theme */
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dark = doc.dataset.theme ? doc.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      doc.dataset.theme = dark ? "light" : "dark";
      store.set("theme", doc.dataset.theme);
    });
  });

  /* search */
  let index = null;
  const loadIndex = () => index || (index = fetch(`${root}assets/search.json`).then((r) => r.json()).catch(() => []));
  const score = (entry, q) => {
    const title = fold(entry.t);
    if (title.includes(q)) return 3;
    if ((entry.g || []).some((tag) => fold(tag).includes(q))) return 2;
    if (fold(entry.s).includes(q) || fold(entry.k).includes(q)) return 1;
    return 0;
  };
  document.querySelectorAll("[data-search-form]").forEach((form) => {
    const input = form.querySelector("[data-search]");
    const pop = form.querySelector("[data-search-pop]");
    let hits = [];
    let active = -1;
    const close = () => { pop.hidden = true; active = -1; };
    const paint = () => {
      pop.querySelectorAll("a").forEach((a, i) => a.setAttribute("aria-selected", String(i === active)));
    };
    input.addEventListener("focus", loadIndex, { once: true });
    input.addEventListener("input", async () => {
      const q = fold(input.value);
      if (!q) return close();
      const list = await loadIndex();
      hits = list.map((e) => ({ e, s: score(e, q) })).filter((r) => r.s).sort((a, b) => b.s - a.s).slice(0, 8).map((r) => r.e);
      active = -1;
      pop.innerHTML = hits.length
        ? hits.map((e) => `<a href="${root}${e.u}" role="option" style="--c:${esc(e.c)}"><small>${esc(e.k)}${e.d ? ` · ${esc(e.d.replaceAll("-", "."))}` : ""}</small><b>${esc(e.t)}</b></a>`).join("")
        : `<p>‘${esc(input.value)}’에 맞는 장이 없습니다.</p>`;
      pop.hidden = false;
    });
    input.addEventListener("keydown", (ev) => {
      if (pop.hidden) return;
      const links = pop.querySelectorAll("a");
      if (ev.key === "ArrowDown") { active = Math.min(links.length - 1, active + 1); paint(); ev.preventDefault(); }
      else if (ev.key === "ArrowUp") { active = Math.max(-1, active - 1); paint(); ev.preventDefault(); }
      else if (ev.key === "Escape") close();
    });
    form.addEventListener("submit", (ev) => {
      const links = pop.querySelectorAll("a");
      const pick = links[Math.max(active, 0)];
      if (!pop.hidden && pick) { ev.preventDefault(); location.href = pick.href; }
    });
    document.addEventListener("click", (ev) => { if (!form.contains(ev.target)) close(); });
  });

  /* summaries: topic chips + search, kept in ?topic=&q= */
  const sumChips = [...document.querySelectorAll("[data-sum-topic]")];
  if (sumChips.length) {
    const input = document.querySelector("[data-sum-search]");
    const secs = [...document.querySelectorAll("[data-sum-sec]")];
    const count = document.querySelector("[data-sum-count]");
    const empty = document.querySelector("[data-sum-empty]");
    const params = new URLSearchParams(location.search);
    let topic = params.get("topic") || "all";
    if (!sumChips.some((c) => c.dataset.sumTopic === topic)) topic = "all";
    input.value = params.get("q") || "";
    const apply = () => {
      const q = fold(input.value);
      sumChips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.sumTopic === topic)));
      let shown = 0;
      secs.forEach((sec) => {
        let n = 0;
        sec.querySelectorAll("[data-sum-find]").forEach((card) => {
          card.hidden = Boolean(q) && !fold(card.dataset.sumFind).includes(q);
          if (!card.hidden) n += 1;
        });
        sec.hidden = (topic !== "all" && sec.dataset.sumSec !== topic) || n === 0;
        if (!sec.hidden) shown += n;
      });
      count.textContent = `${shown}개 콘텐츠${q || topic !== "all" ? " · 필터 적용" : ""}`;
      empty.hidden = shown > 0;
      const next = new URLSearchParams();
      if (topic !== "all") next.set("topic", topic);
      if (input.value.trim()) next.set("q", input.value.trim());
      history.replaceState(null, "", `${location.pathname}${next.toString() ? `?${next}` : ""}${location.hash}`);
    };
    sumChips.forEach((c) => c.addEventListener("click", () => { topic = c.dataset.sumTopic; apply(); }));
    input.addEventListener("input", apply);
    apply();
  }

  /* game theory: episode search, kept in ?q= */
  const gtInput = document.querySelector("[data-gt-search]");
  if (gtInput) {
    const cards = [...document.querySelectorAll("[data-gt-find]")];
    const count = document.querySelector("[data-gt-count]");
    const empty = document.querySelector("[data-gt-empty]");
    gtInput.value = new URLSearchParams(location.search).get("q") || "";
    const apply = () => {
      const q = fold(gtInput.value);
      let shown = 0;
      cards.forEach((card) => {
        card.hidden = Boolean(q) && !fold(card.dataset.gtFind).includes(q);
        if (!card.hidden) shown += 1;
      });
      count.textContent = q ? `${shown} / ${cards.length}회 · 검색 적용` : `${cards.length}회`;
      empty.hidden = shown > 0;
      const next = new URLSearchParams();
      if (gtInput.value.trim()) next.set("q", gtInput.value.trim());
      history.replaceState(null, "", `${location.pathname}${next.toString() ? `?${next}` : ""}${location.hash}`);
    };
    gtInput.addEventListener("input", apply);
    apply();
  }

  /* library tabs + ?q= filter */
  const tabs = [...document.querySelectorAll("[data-shelf-tab]")];
  if (tabs.length) {
    const shelves = [...document.querySelectorAll("[data-shelf]")];
    const empty = document.querySelector("[data-lib-empty]");
    const note = document.querySelector("[data-lib-query]");
    const q = fold(new URLSearchParams(location.search).get("q"));
    let current = location.hash.replace("#", "") || "all";
    const apply = () => {
      tabs.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.shelfTab === current)));
      let shown = 0;
      shelves.forEach((sec) => {
        const okTopic = current === "all" || sec.dataset.shelf === current;
        let n = 0;
        sec.querySelectorAll("[data-find]").forEach((cell) => {
          cell.hidden = Boolean(q) && !fold(cell.dataset.find).includes(q);
          if (!cell.hidden) n += 1;
        });
        sec.hidden = !okTopic || n === 0;
        if (!sec.hidden) shown += n;
      });
      empty.hidden = shown > 0;
    };
    if (q && note) { note.hidden = false; note.innerHTML = `‘${esc(new URLSearchParams(location.search).get("q"))}’ 검색 결과 · <a href="./">모두 보기</a>`; }
    if (!tabs.some((t) => t.dataset.shelfTab === current)) current = "all";
    tabs.forEach((t) => t.addEventListener("click", () => {
      current = t.dataset.shelfTab;
      history.replaceState(null, "", current === "all" ? location.pathname + location.search : `#${current}`);
      apply();
    }));
    apply();
  }

  /* reader: drawer */
  const drawer = document.querySelector("[data-drawer]");
  if (drawer) {
    const scrim = document.querySelector(".drawer-scrim");
    const opener = document.querySelector("[data-drawer-open]");
    const set = (open) => {
      drawer.hidden = !open;
      scrim.hidden = !open;
      opener.setAttribute("aria-expanded", String(open));
      if (open) (drawer.querySelector('[aria-current="page"]') || drawer.querySelector("a")).focus();
      else opener.focus();
    };
    opener.addEventListener("click", () => set(true));
    document.querySelectorAll("[data-drawer-close]").forEach((el) => el.addEventListener("click", () => set(false)));
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !drawer.hidden) set(false); });
  }

  /* reader: progress + on-this-page */
  const bar = document.querySelector("[data-progress]");
  const otp = [...document.querySelectorAll("[data-otp]")];
  if (bar || otp.length) {
    const secs = otp.map((a) => document.getElementById(a.dataset.otp)).filter(Boolean);
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.width = `${max > 0 ? Math.min(100, (scrollY / max) * 100) : 100}%`;
      let on = secs[0];
      for (const s of secs) if (s.getBoundingClientRect().top < 120) on = s;
      if (max > 0 && scrollY >= max - 2) on = secs[secs.length - 1];
      otp.forEach((a) => a.classList.toggle("on", on && a.dataset.otp === on.id));
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* chart series toggles */
  document.querySelectorAll("[data-series]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fig = btn.closest("figure");
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      fig.classList.toggle(`hide-s${btn.dataset.series}`, !on);
    });
  });

  /* checklists */
  document.querySelectorAll("[data-check]").forEach((box) => {
    const key = `check:${box.dataset.check}`;
    box.checked = store.get(key) === "1";
    box.addEventListener("change", () => store.set(key, box.checked ? "1" : "0"));
  });

  /* PoRA study progress: one localStorage key per step */
  const poraBoxes = [...document.querySelectorAll("[data-pora-check]")];
  if (poraBoxes.length) {
    const meter = document.querySelector("[data-pora-meter]");
    const pct = document.querySelector("[data-pora-pct]");
    const count = document.querySelector("[data-pora-count]");
    const key = (box) => `pora:${box.dataset.poraCheck}`;
    const update = () => {
      const done = poraBoxes.filter((box) => box.checked).length;
      const value = Math.round((done / poraBoxes.length) * 100);
      meter.querySelector("i").style.width = `${value}%`;
      meter.setAttribute("aria-valuenow", String(value));
      pct.textContent = `${value}%`;
      count.textContent = `${done} / ${poraBoxes.length} 단원`;
    };
    poraBoxes.forEach((box) => {
      box.checked = store.get(key(box)) === "1";
      box.addEventListener("change", () => { store.set(key(box), box.checked ? "1" : "0"); update(); });
    });
    const reset = document.querySelector("[data-pora-reset]");
    if (reset) reset.addEventListener("click", () => {
      poraBoxes.forEach((box) => { box.checked = false; store.set(key(box), "0"); });
      update();
    });
    update();
  }

  /* quiz */
  document.querySelectorAll("[data-quiz]").forEach((q) => {
    q.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-opt]");
      if (!btn) return;
      const right = btn.dataset.opt === q.dataset.answer;
      q.querySelectorAll("[data-opt]").forEach((b) => b.classList.remove("wrong"));
      btn.classList.add(right ? "right" : "wrong");
      if (right) q.querySelector(".why").hidden = false;
    });
  });

  /* tooltips */
  const tip = document.querySelector("[data-tip-box]");
  if (tip) {
    const show = (ev) => {
      const el = ev.target.closest && ev.target.closest("[data-tip]");
      if (!el) { tip.hidden = true; return; }
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      const x = Math.min(innerWidth - tip.offsetWidth - 8, ev.clientX + 12);
      const y = ev.clientY - tip.offsetHeight - 12;
      tip.style.left = `${Math.max(8, x)}px`;
      tip.style.top = `${y < 8 ? ev.clientY + 16 : y}px`;
    };
    document.addEventListener("pointermove", show);
    document.addEventListener("scroll", () => { tip.hidden = true; }, { passive: true });
    document.querySelectorAll("[data-tip] title").forEach((t) => t.remove());
  }

  /* reading: book spines. 표지에서 색을 뽑아 책등에 칠하고, 올리거나 포커스하면 표지·진행 상태 툴팁 */
  const spines = [...document.querySelectorAll("[data-spine]")];
  if (spines.length) {
    const tint = (img) => {
      const c = document.createElement("canvas");
      c.width = 24; c.height = 32;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < px.length; i += 4) {
        const max = Math.max(px[i], px[i + 1], px[i + 2]);
        const min = Math.min(px[i], px[i + 1], px[i + 2]);
        // 거의 흰색·검은색인 바탕은 빼고, 색이 있는 화소에 무게를 더 준다
        if (max > 245 && min > 235) continue;
        const w = 1 + (max - min) / 64;
        r += px[i] * w; g += px[i + 1] * w; b += px[i + 2] * w; n += w;
      }
      if (!n) return null;
      // HSL로 바꿔 채도·밝기를 책장에 어울리는 범위로 누른다
      let [h, s, l] = rgbToHsl(r / n, g / n, b / n);
      s = Math.min(s, 0.42);
      l = Math.max(0.26, Math.min(l, 0.6));
      return { css: `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`, light: l > 0.52 };
    };
    spines.forEach((sp) => {
      if (!sp.dataset.cover) return;
      const img = new Image();
      img.onload = () => {
        try {
          const t = tint(img);
          if (!t) return;
          sp.style.setProperty("--sp", t.css);
          sp.style.setProperty("--sp-ink", t.light ? "#1c2127" : "#fff");
        } catch (e) {}
      };
      img.src = sp.dataset.cover;
    });

    const box = document.createElement("div");
    box.className = "sp-tip";
    box.hidden = true;
    box.setAttribute("aria-hidden", "true");
    body.appendChild(box);
    const open = (sp) => {
      const d = sp.dataset;
      const status = d.status === "done"
        ? `<dt>상태</dt><dd>완독</dd><dt>완독</dt><dd>${esc(d.when)}</dd>`
        : `<dt>상태</dt><dd>읽는 중 · ${esc(d.pct)}%</dd>`;
      const bar = d.status === "done" ? "" : `<span class="rd-bar"><i style="width:${Number(d.pct)}%"></i></span>`;
      box.style.setProperty("--sp", getComputedStyle(sp).getPropertyValue("--sp"));
      box.innerHTML = `${d.cover ? `<img class="sp-tip-cover" src="${esc(d.cover)}" alt="">` : `<span class="sp-tip-cover"></span>`}
        <div><b>${esc(d.title)}</b><span class="sp-tip-who">${esc(d.author)}</span></div>
        <dl>${status}<dt>쪽수</dt><dd>${esc(d.pages)}쪽</dd></dl>${bar}
        <span class="sp-tip-hint">누르면 책 상세로</span>`;
      box.hidden = false;
      const r = sp.getBoundingClientRect();
      const x = Math.max(8, Math.min(innerWidth - box.offsetWidth - 8, r.left + r.width / 2 - box.offsetWidth / 2));
      const above = r.top - box.offsetHeight - 12;
      box.style.left = `${x}px`;
      box.style.top = `${above >= 8 ? above : Math.min(innerHeight - box.offsetHeight - 8, r.bottom + 12)}px`;
    };
    const close = () => { box.hidden = true; };
    spines.forEach((sp) => {
      sp.addEventListener("pointerenter", (ev) => { if (ev.pointerType !== "touch") open(sp); });
      sp.addEventListener("pointerleave", close);
      sp.addEventListener("focus", () => open(sp));
      sp.addEventListener("blur", close);
    });
    addEventListener("scroll", close, { passive: true });
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }

  /* youtube */
  document.querySelectorAll("[data-yt]").forEach((button) => {
    button.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.className = "yt-frame";
      frame.src = `https://www.youtube-nocookie.com/embed/${button.dataset.yt}?autoplay=1`;
      frame.title = button.dataset.title || "YouTube";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      button.replaceWith(frame);
    });
  });
})();

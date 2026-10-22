(function () {
  "use strict";

  const root = document.documentElement;
  const themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    });
  }

  const fold = (value) => value.normalize("NFC").toLowerCase().replace(/\s+/g, "");
  const search = document.querySelector("[data-search]");
  const groups = [...document.querySelectorAll("[data-filter-group]")];
  function applyQuery(raw) {
    const q = raw.normalize("NFC").trim().toLowerCase();
    const compact = fold(raw);
    document.querySelectorAll("[data-find]").forEach((el) => {
      const hay = el.dataset.find || "";
      el.hidden = Boolean(q) && !hay.includes(q) && !fold(hay).includes(compact);
    });
    groups.forEach((group) => {
      const items = [...group.querySelectorAll("[data-find]")];
      const empty = group.querySelector("[data-empty]");
      if (!empty) return;
      empty.hidden = items.some((el) => !el.hidden);
    });
    const live = document.querySelector("[data-search-count]");
    if (live) {
      const n = document.querySelectorAll(".index-list [data-find]:not([hidden])").length;
      live.textContent = q ? `검색 결과 ${n}개` : "";
    }
  }
  if (search && document.body.dataset.page === "home") {
    const params = new URLSearchParams(location.search);
    if (params.get("q")) search.value = params.get("q");
    applyQuery(search.value);
    search.addEventListener("input", () => applyQuery(search.value));
  }

  const bar = document.querySelector("[data-status-bar]");
  if (bar) {
    const cards = [...document.querySelectorAll("[data-status]")];
    const tagButtons = [...document.querySelectorAll("[data-tag]")];
    let status = "all";
    let tag = "all";
    function paint() {
      cards.forEach((card) => {
        const tags = (card.dataset.tags || "").split(",").filter(Boolean);
        const okStatus = status === "all" || card.dataset.status === status;
        const okTag = tag === "all" || tags.includes(tag);
        card.hidden = !(okStatus && okTag);
      });
      bar.querySelectorAll("[data-status-btn]").forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn.dataset.statusBtn === status));
      });
      tagButtons.forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn.dataset.tag === tag));
      });
    }
    bar.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-status-btn]");
      if (!btn) return;
      status = btn.dataset.statusBtn;
      paint();
    });
    tagButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tag = tag === btn.dataset.tag ? "all" : btn.dataset.tag;
        paint();
      });
    });
  }

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

// 배경음악: 숨긴 YouTube 플레이어(UO5hm2WbVes, 반복)와 오른쪽 아래 ♪ 토글.
// 소리 있는 자동재생은 막히므로, 켜 둔 상태여도 사용자가 페이지를 한 번 클릭해야 다시 재생한다.
(function () {
  var VIDEO = "UO5hm2WbVes", KEY = "bgm";
  var want = false, player = null, ready = false;
  try { want = localStorage.getItem(KEY) === "on"; } catch (e) {}

  var css = document.createElement("style");
  css.textContent =
    ".bgm-btn{position:fixed;right:16px;bottom:16px;z-index:9999;width:36px;height:36px;padding:0;" +
    "background:#fff;color:#1E2124;border:1px solid #1E2124;border-radius:0;font:16px/1 system-ui,sans-serif;cursor:pointer}" +
    ".bgm-btn:hover{background:#F6F7F9}.bgm-btn[aria-pressed=true]{background:#1E2124;color:#fff}" +
    "[data-theme=dark] .bgm-btn{background:#1E2124;color:#F6F7F9;border-color:#F6F7F9}" +
    "[data-theme=dark] .bgm-btn[aria-pressed=true]{background:#F6F7F9;color:#1E2124}" +
    ".bgm-frame{position:fixed;width:1px;height:1px;left:-9999px;top:0;opacity:0;pointer-events:none}";
  document.head.appendChild(css);

  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "bgm-btn";
  btn.textContent = "♪";
  var box = document.createElement("div");
  box.className = "bgm-frame"; box.setAttribute("aria-hidden", "true");
  var slot = document.createElement("div"); slot.id = "bgm-player"; box.appendChild(slot);
  document.body.appendChild(box); document.body.appendChild(btn);

  function sync(playing) {
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    var label = playing ? "배경음악 끄기" : "배경음악 켜기";
    btn.title = label; btn.setAttribute("aria-label", label);
  }
  function save() { try { localStorage.setItem(KEY, want ? "on" : "off"); } catch (e) {} }
  function apply() {
    if (!ready) return;
    if (want) player.playVideo(); else player.pauseVideo();
  }

  var loading = false;
  function load() {
    if (loading) return; loading = true;
    window.onYouTubeIframeAPIReady = function () {
      player = new YT.Player("bgm-player", {
        width: 1, height: 1, videoId: VIDEO,
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: VIDEO, playsinline: 1 },
        events: {
          onReady: function () { ready = true; apply(); },
          onStateChange: function (e) { sync(e.data === 1); }
        }
      });
    };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    want = !(btn.getAttribute("aria-pressed") === "true");
    save(); sync(want); load(); apply();
  });
  sync(false);
  if (want) {
    // 켜 둔 상태: 첫 클릭 때 이어서 재생
    var resume = function () {
      document.removeEventListener("pointerdown", resume, true);
      document.removeEventListener("keydown", resume, true);
      if (want) { load(); apply(); }
    };
    document.addEventListener("pointerdown", resume, true);
    document.addEventListener("keydown", resume, true);
  }
})();

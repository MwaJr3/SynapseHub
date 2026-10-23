/**
 * VDownloader OS — Browser Content Script (Chrome / Edge & Firefox compatible)
 *
 * 1. Detects active <video> elements (HTML5 / MSE / HLS / DASH streams) and sends
 *    the canonical page URL (not blob: URL) to the native Python WebSocket server.
 * 2. Displays an optional IDM-style "Download with VDownloader" floating pill button
 *    when the user hovers over a sufficiently sized video player (>= 240x135 px).
 */

(() => {
  const runtimeApi = typeof browser !== "undefined" ? browser : chrome;
  let lastReportedUrl = "";
  let lastReportTimestamp = 0;
  let hoverOverlayEnabled = true;
  let activeOverlayBtn = null;
  let hoveredVideo = null;
  let hideOverlayTimer = null;

  runtimeApi.storage.local.get({ hoverOverlayEnabled: true }, (items) => {
    if (items && typeof items.hoverOverlayEnabled === "boolean") {
      hoverOverlayEnabled = items.hoverOverlayEnabled;
    }
  });

  runtimeApi.storage.onChanged.addListener((changes) => {
    if (changes.hoverOverlayEnabled) {
      hoverOverlayEnabled = Boolean(changes.hoverOverlayEnabled.newValue);
      if (!hoverOverlayEnabled && activeOverlayBtn) {
        activeOverlayBtn.style.display = "none";
      }
    }
  });

  function resolveThumbnail(videoEl) {
    if (videoEl && videoEl.poster && !videoEl.poster.startsWith("blob:")) {
      return videoEl.poster;
    }
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImg.content) {
      return ogImg.content;
    }
    try {
      const parsed = new URL(window.location.href);
      if (parsed.hostname.includes("youtube.com")) {
        const vid = parsed.searchParams.get("v");
        if (vid) return `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
      }
    } catch (_err) {
      // Ignore URL parse error
    }
    return "";
  }

  function resolveTitle() {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) {
      return ogTitle.content.trim();
    }
    return (document.title || "Streaming Video").replace(/^\(\d+\)\s*/, "").trim();
  }

  function hasPlayableSource(videoEl) {
    if (!videoEl) return false;
    if (videoEl.currentSrc || videoEl.src) return true;
    if (videoEl.querySelector("source[src]")) return true;
    return videoEl.readyState >= 1;
  }

  function sendVideoEvent(videoEl, trigger) {
    const pageUrl = window.location.href;
    if (!pageUrl.startsWith("http://") && !pageUrl.startsWith("https://")) {
      return;
    }

    const now = Date.now();
    if (
      trigger === "playback" &&
      pageUrl === lastReportedUrl &&
      now - lastReportTimestamp < 30000
    ) {
      return;
    }

    lastReportedUrl = pageUrl;
    lastReportTimestamp = now;

    const payload = {
      type: trigger === "hover_button" ? "download_request" : "video_detected",
      url: pageUrl,
      title: resolveTitle(),
      thumbnail: resolveThumbnail(videoEl),
      duration: videoEl && Number.isFinite(videoEl.duration) ? videoEl.duration : 0,
      trigger
    };

    try {
      runtimeApi.runtime.sendMessage({ action: "notify_video", payload });
    } catch (_err) {
      // Extension context invalidated during reload
    }
  }

  // Capture-phase media listener catches dynamically mounted SPA players (YouTube, TikTok, Reels)
  document.addEventListener(
    "playing",
    (event) => {
      const target = event.target;
      if (target && target.tagName === "VIDEO" && hasPlayableSource(target)) {
        // Ignore tiny muted UI decorative background loops
        const rect = target.getBoundingClientRect();
        if (rect.width >= 200 && rect.height >= 120) {
          sendVideoEvent(target, "playback");
        }
      }
    },
    true
  );

  // Create IDM-style hover overlay button
  function ensureOverlayButton() {
    if (activeOverlayBtn) return activeOverlayBtn;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "vdownloader-os-overlay-btn";
    btn.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#C6FF33;box-shadow:0 0 8px #C6FF33;"></span>
      <span>Download with VDownloader</span>
    `;
    Object.assign(btn.style, {
      position: "fixed",
      zIndex: "2147483646",
      display: "none",
      alignItems: "center",
      gap: "8px",
      padding: "7px 13px",
      borderRadius: "999px",
      border: "1px solid rgba(198, 255, 51, 0.65)",
      background: "rgba(11, 15, 20, 0.90)",
      backdropFilter: "blur(10px)",
      color: "#F8FAFC",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      fontSize: "12px",
      fontWeight: "600",
      letterSpacing: "0.01em",
      cursor: "pointer",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
      transition: "transform 0.15s ease, opacity 0.15s ease"
    });

    btn.addEventListener("mouseenter", () => {
      if (hideOverlayTimer) clearTimeout(hideOverlayTimer);
      btn.style.transform = "translateY(-1px)";
      btn.style.borderColor = "#C6FF33";
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0)";
      scheduleOverlayHide();
    });

    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      sendVideoEvent(hoveredVideo, "hover_button");
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `<span style="color:#C6FF33;">✓ Sent to VDownloader OS</span>`;
      setTimeout(() => {
        btn.innerHTML = originalHtml;
      }, 1600);
    });

    document.documentElement.appendChild(btn);
    activeOverlayBtn = btn;
    return btn;
  }

  function scheduleOverlayHide() {
    if (hideOverlayTimer) clearTimeout(hideOverlayTimer);
    hideOverlayTimer = setTimeout(() => {
      if (activeOverlayBtn) activeOverlayBtn.style.display = "none";
    }, 900);
  }

  function positionOverlayAboveVideo(videoEl) {
    if (!hoverOverlayEnabled || !videoEl) return;
    const rect = videoEl.getBoundingClientRect();
    if (rect.width < 240 || rect.height < 135) return;

    const btn = ensureOverlayButton();
    hoveredVideo = videoEl;
    const top = Math.max(10, rect.top + 12);
    const left = Math.max(10, Math.min(window.innerWidth - 220, rect.right - 210));
    btn.style.top = `${top}px`;
    btn.style.left = `${left}px`;
    btn.style.display = "inline-flex";
  }

  function attachHoverListeners(videoEl) {
    if (!videoEl || videoEl.dataset.vdownloaderBound === "1") return;
    videoEl.dataset.vdownloaderBound = "1";

    videoEl.addEventListener("mouseenter", () => {
      if (hideOverlayTimer) clearTimeout(hideOverlayTimer);
      if (hasPlayableSource(videoEl)) {
        positionOverlayAboveVideo(videoEl);
      }
    });

    videoEl.addEventListener("mousemove", () => {
      if (hoverOverlayEnabled && hasPlayableSource(videoEl)) {
        if (hideOverlayTimer) clearTimeout(hideOverlayTimer);
        positionOverlayAboveVideo(videoEl);
      }
    });

    videoEl.addEventListener("mouseleave", () => {
      scheduleOverlayHide();
    });
  }

  function scanVideos() {
    const videos = document.querySelectorAll("video");
    videos.forEach((v) => {
      attachHoverListeners(v);
      if (!v.paused && !v.ended && hasPlayableSource(v)) {
        const rect = v.getBoundingClientRect();
        if (rect.width >= 200 && rect.height >= 120) {
          sendVideoEvent(v, "playback");
        }
      }
    });
  }

  const observer = new MutationObserver(() => {
    scanVideos();
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  scanVideos();
})();

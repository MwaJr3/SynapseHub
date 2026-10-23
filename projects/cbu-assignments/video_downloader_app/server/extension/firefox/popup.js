(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const statusBadge = document.getElementById("statusBadge");
  const wsPortInput = document.getElementById("wsPort");
  const autoDetectInput = document.getElementById("autoDetect");
  const hoverBtnInput = document.getElementById("hoverBtn");
  const sendCurrentBtn = document.getElementById("sendCurrentBtn");
  const reconnectBtn = document.getElementById("reconnectBtn");
  const feedback = document.getElementById("feedback");

  function renderStatus(connected, port) {
    if (connected) {
      statusBadge.textContent = "Connected";
      statusBadge.classList.add("online");
    } else {
      statusBadge.textContent = "Desktop Offline";
      statusBadge.classList.remove("online");
    }
    feedback.textContent = `ws://127.0.0.1:${port}`;
  }

  api.runtime.sendMessage({ action: "get_bridge_status" }, (resp) => {
    if (!resp || !resp.ok) return;
    const s = resp.settings || {};
    wsPortInput.value = s.wsPort || 8765;
    autoDetectInput.checked = s.autoDetectEnabled !== false;
    hoverBtnInput.checked = s.hoverOverlayEnabled !== false;
    renderStatus(Boolean(resp.connected), wsPortInput.value);
  });

  wsPortInput.addEventListener("change", () => {
    const port = Math.max(1024, Math.min(65535, Number(wsPortInput.value) || 8765));
    wsPortInput.value = port;
    api.storage.local.set({ wsPort: port });
    feedback.textContent = `Updated port -> ws://127.0.0.1:${port}`;
  });

  autoDetectInput.addEventListener("change", () => {
    api.storage.local.set({ autoDetectEnabled: autoDetectInput.checked });
  });

  hoverBtnInput.addEventListener("change", () => {
    api.storage.local.set({ hoverOverlayEnabled: hoverBtnInput.checked });
  });

  sendCurrentBtn.addEventListener("click", () => {
    api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.url) return;
      api.runtime.sendMessage(
        {
          action: "notify_video",
          payload: {
            type: "download_request",
            url: tab.url,
            title: tab.title || "Browser Tab Video",
            thumbnail: tab.favIconUrl || "",
            trigger: "popup_manual"
          }
        },
        () => {
          feedback.textContent = "✓ URL dispatched to VDownloader OS!";
        }
      );
    });
  });

  reconnectBtn.addEventListener("click", () => {
    feedback.textContent = "Reconnecting...";
    api.runtime.sendMessage({ action: "reconnect_bridge" }, (resp) => {
      renderStatus(Boolean(resp && resp.connected), wsPortInput.value);
    });
  });
})();

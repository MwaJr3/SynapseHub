/**
 * VDownloader OS — Firefox Manifest V2 Background Script
 *
 * Persistent background page maintaining a resilient WebSocket connection to
 * ws://127.0.0.1:<PORT> and updating the browserAction badge status.
 */

const extApi = typeof browser !== "undefined" ? browser : chrome;
const DEFAULT_SETTINGS = {
  wsPort: 8765,
  autoDetectEnabled: true,
  hoverOverlayEnabled: true
};

let socket = null;
let connected = false;
let pendingQueue = [];
let reconnectTimer = null;

function getSettings() {
  return new Promise((resolve) => {
    extApi.storage.local.get(DEFAULT_SETTINGS, (items) => {
      resolve({ ...DEFAULT_SETTINGS, ...(items || {}) });
    });
  });
}

function updateBadge(isOnline) {
  connected = isOnline;
  if (extApi.browserAction) {
    extApi.browserAction.setBadgeText({ text: isOnline ? "ON" : "" });
    extApi.browserAction.setBadgeBackgroundColor({
      color: isOnline ? "#10B981" : "#64748B"
    });
  }
}

async function ensureSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  const settings = await getSettings();
  const wsUrl = `ws://127.0.0.1:${settings.wsPort}`;

  try {
    socket = new WebSocket(wsUrl);
  } catch (_err) {
    updateBadge(false);
    scheduleReconnect();
    return null;
  }

  socket.addEventListener("open", () => {
    updateBadge(true);
    while (pendingQueue.length > 0 && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(pendingQueue.shift()));
    }
  });

  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "welcome" || data.type === "pong") {
        updateBadge(true);
      }
    } catch (_err) {
      // Ignore malformed payloads
    }
  });

  socket.addEventListener("close", () => {
    updateBadge(false);
    socket = null;
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    updateBadge(false);
  });

  return socket;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ensureSocket();
  }, 4000);
}

async function dispatchToDesktop(payload) {
  const settings = await getSettings();
  if (payload.trigger === "playback" && !settings.autoDetectEnabled) {
    return { sent: false, reason: "Auto-detection disabled" };
  }

  await ensureSocket();
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
    return { sent: true };
  }

  if (pendingQueue.length < 15) {
    pendingQueue.push(payload);
  }
  return { sent: false, queued: true };
}

setInterval(() => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "ping" }));
  } else {
    ensureSocket();
  }
}, 25000);

extApi.storage.onChanged.addListener((changes) => {
  if (changes.wsPort && socket) {
    socket.close();
    socket = null;
    ensureSocket();
  }
});

extApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    sendResponse({ ok: false });
    return false;
  }

  if (message.action === "get_bridge_status") {
    getSettings().then((settings) => {
      sendResponse({ ok: true, connected, settings });
    });
    return true;
  }

  if (message.action === "reconnect_bridge") {
    if (socket) {
      socket.close();
      socket = null;
    }
    ensureSocket().then(() => {
      setTimeout(() => sendResponse({ ok: true, connected }), 350);
    });
    return true;
  }

  if (message.action === "notify_video") {
    dispatchToDesktop(message.payload).then((result) => {
      sendResponse({ ok: true, ...result });
    });
    return true;
  }

  return false;
});

ensureSocket();

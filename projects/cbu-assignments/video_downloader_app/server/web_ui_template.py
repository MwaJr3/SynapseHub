"""Self-contained HTML/CSS/JS frontend for the VDownloader OS Live Dashboard & Control Center."""

from __future__ import annotations

WEB_DASHBOARD_HTML = r"""<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VDownloader OS — Analytical Board, Downloader & Transcript Suite</title>
  <style>
    :root[data-theme="light"] {
      --bg-outer: #ECEEF8;
      --bg-canvas: #F5F7F2;
      --bg-sidebar: #FFFFFF;
      --bg-card: #FFFFFF;
      --bg-card-subtle: #F1F4EC;
      --bg-obsidian: #0E1310;
      --bg-lime-card: #DEFF7B;
      --text-main: #0F172A;
      --text-sec: #475569;
      --text-muted: #8291A5;
      --border: #E5EAE0;
      --lime: #C6FF33;
      --lime-strong: #9AE600;
      --emerald: #10B981;
      --violet: #4F35FF;
      --amber: #F59E0B;
      --blue: #3B82F6;
      --coral: #EF4444;
      --cyan: #06B6D4;
      --shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
    }
    :root[data-theme="dark"] {
      --bg-outer: #06090D;
      --bg-canvas: #0B0F14;
      --bg-sidebar: #0F151D;
      --bg-card: #131B24;
      --bg-card-subtle: #1A2431;
      --bg-obsidian: #080C10;
      --bg-lime-card: #1B2D14;
      --text-main: #F8FAFC;
      --text-sec: #CBD5E1;
      --text-muted: #64748B;
      --border: #223042;
      --lime: #C6FF33;
      --lime-strong: #C6FF33;
      --emerald: #10B981;
      --violet: #6366F1;
      --amber: #F59E0B;
      --blue: #3B82F6;
      --coral: #EF4444;
      --cyan: #06B6D4;
      --shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-canvas);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      overflow-x: hidden;
    }

    /* Sidebar (InsightOS faithful adaptation) */
    .sidebar {
      width: 242px;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      padding: 22px 16px;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px 18px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .brand-logo {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #0E1310;
      display: grid;
      place-items: center;
      position: relative;
      box-shadow: 0 0 12px rgba(198,255,51,0.35);
    }
    .brand-logo::after {
      content: "";
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 3px solid #C6FF33;
      border-right-color: transparent;
    }
    .brand-title {
      font-weight: 800;
      font-size: 16px;
      letter-spacing: -0.02em;
    }
    .nav-section {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      padding: 8px 10px 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 13px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-sec);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.16s ease;
      margin-bottom: 3px;
    }
    .nav-btn:hover {
      background: var(--bg-card-subtle);
      color: var(--text-main);
    }
    .nav-btn.active {
      background: linear-gradient(125deg, #0D120F 45%, #3A5F14 100%);
      color: #FFFFFF;
      border-color: rgba(198, 255, 51, 0.45);
      box-shadow: 0 6px 18px rgba(58, 95, 20, 0.28);
    }
    .nav-spacer { flex: 1; }

    /* Main Workspace */
    .workspace {
      flex: 1;
      padding: 20px 26px 36px;
      min-width: 0;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .search-pill {
      display: flex;
      align-items: center;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 8px 6px 16px;
      gap: 10px;
      width: min(440px, 100%);
      box-shadow: var(--shadow);
    }
    .search-pill input {
      border: none;
      outline: none;
      background: transparent;
      color: var(--text-main);
      font-size: 13px;
      flex: 1;
    }
    .kbd-badge {
      background: #E2F89C;
      color: #1A2E05;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 11px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .theme-switch {
      display: inline-flex;
      align-items: center;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px;
      gap: 4px;
      cursor: pointer;
    }
    .theme-switch span {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 13px;
    }
    .theme-switch span.active {
      background: #C6FF33;
      color: #0B0F14;
      box-shadow: 0 2px 8px rgba(198,255,51,0.5);
    }
    .chip-btn {
      background: var(--bg-card);
      color: var(--text-main);
      border: 1px solid var(--border);
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }
    .chip-btn:hover { border-color: var(--lime-strong); }
    .chip-btn.lime {
      background: #C6FF33;
      color: #0B0F14;
      border-color: #C6FF33;
    }

    .board-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .board-header h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.03em;
    }
    .sub-tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    /* Views */
    .view-panel { display: none; }
    .view-panel.active { display: block; animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    /* InsightOS Bento Grid */
    .insight-grid {
      display: grid;
      grid-template-columns: minmax(0, 2.05fr) minmax(300px, 0.95fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    @media (max-width: 1100px) {
      .insight-grid { grid-template-columns: 1fr; }
    }
    .left-bento {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .obsidian-hero {
      background: radial-gradient(circle at 80% 115%, rgba(132, 204, 22, 0.42), transparent 52%),
                  radial-gradient(circle at 20% 110%, rgba(16, 185, 129, 0.25), transparent 45%),
                  #0A0E0C;
      color: #FFFFFF;
      border-radius: 24px;
      padding: 22px;
      border: 1px solid rgba(198, 255, 51, 0.22);
      box-shadow: var(--shadow);
    }
    .obsidian-hero h2 { font-size: 19px; font-weight: 600; margin-bottom: 5px; }
    .obsidian-hero p { font-size: 12.5px; color: #94A3B8; margin-bottom: 18px; }
    .hero-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    @media (max-width: 760px) { .hero-kpis { grid-template-columns: 1fr; } }
    .glass-kpi {
      background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(198,255,51,0.06));
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 15px;
    }
    .glass-kpi .label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #E2E8F0;
      margin-bottom: 12px;
    }
    .glass-kpi .icon-box {
      width: 26px; height: 26px; border-radius: 8px;
      background: rgba(255,255,255,0.09);
      display: grid; place-items: center; font-size: 12px;
    }
    .glass-kpi .val {
      font-size: 27px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .glass-kpi .val small { font-size: 14px; color: #94A3B8; font-weight: 500; }

    .mid-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 820px) { .mid-cards { grid-template-columns: 1fr; } }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 22px;
      padding: 20px;
      box-shadow: var(--shadow);
    }
    .card.lime-surface {
      background: var(--bg-lime-card);
      border-color: rgba(163, 230, 53, 0.55);
    }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .card-head h3 {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .mini-pill {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.75);
      color: #0F172A;
      font-weight: 600;
      border: 1px solid rgba(0,0,0,0.07);
    }
    :root[data-theme="dark"] .mini-pill {
      background: rgba(15, 23, 42, 0.75);
      color: #E2E8F0;
      border-color: rgba(255,255,255,0.1);
    }

    .donut-wrap {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 14px;
      padding: 6px 0;
    }
    .legend-list { display: flex; flex-direction: column; gap: 10px; font-size: 12.5px; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }

    /* Deal / Format blocks inside Lime card */
    .deal-columns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      align-items: end;
      height: 178px;
      padding-top: 16px;
    }
    .deal-col { display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
    .speech-tag {
      background: #FFFFFF;
      color: #0F172A;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 9px;
      border-radius: 8px;
      white-space: nowrap;
      box-shadow: 0 4px 10px rgba(0,0,0,0.08);
    }
    .block-striped {
      width: 100%;
      height: 118px;
      border-radius: 12px;
      background: repeating-linear-gradient(
        -45deg,
        #9EF01A,
        #9EF01A 6px,
        #C6FF33 6px,
        #C6FF33 12px
      );
    }
    .block-obsidian {
      width: 100%;
      height: 58px;
      border-radius: 12px;
      background: linear-gradient(145deg, #27272A, #09090B);
    }
    .block-soft {
      width: 100%;
      height: 98px;
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.45));
    }

    /* Pulse AI Right Panel (Bostie AI adaptation) */
    .pulse-panel {
      background: radial-gradient(circle at 50% 36%, rgba(16, 185, 129, 0.22), transparent 55%),
                  #0B0F0E;
      color: #FFFFFF;
      border-radius: 24px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid rgba(198,255,51,0.2);
      box-shadow: var(--shadow);
    }
    .pulse-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 600;
    }
    .circle-icon {
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: #E2E8F0;
      display: grid; place-items: center; cursor: pointer;
    }
    .orb-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 18px 0;
    }
    .neon-orb {
      width: 132px;
      height: 132px;
      border-radius: 50%;
      background:
        radial-gradient(circle at 32% 28%, #FFFFFF 0%, rgba(255,255,255,0.1) 28%, transparent 50%),
        radial-gradient(circle at 68% 68%, #C6FF33 0%, #10B981 48%, #0284C7 85%);
      box-shadow: 0 0 42px rgba(198, 255, 51, 0.42), inset 0 0 22px rgba(255, 255, 255, 0.45);
      animation: pulseFloat 4s ease-in-out infinite;
      margin-bottom: 18px;
    }
    @keyframes pulseFloat {
      0%, 100% { transform: scale(1) translateY(0); }
      50% { transform: scale(1.04) translateY(-4px); }
    }
    .pulse-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .pulse-action-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      padding: 14px 10px;
      color: #F8FAFC;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      transition: border-color 0.15s;
    }
    .pulse-action-btn:hover { border-color: #C6FF33; }
    .pulse-action-btn .ic { color: #C6FF33; font-size: 16px; display: block; margin-bottom: 6px; }
    .pulse-input-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .pulse-input-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 999px;
      padding: 8px 12px;
    }
    .pulse-input-wrap input {
      flex: 1; background: transparent; border: none; outline: none; color: #FFF; font-size: 12px;
    }
    .pulse-send {
      background: #C6FF33; color: #0B0F14; border: none; width: 28px; height: 28px;
      border-radius: 50%; font-weight: 800; cursor: pointer;
    }

    /* Tables & Segmented Health Bars */
    .data-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 8px;
      font-size: 13px;
    }
    .data-table th {
      text-align: left;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 11.5px;
      padding: 8px 12px;
    }
    .data-table td {
      background: var(--bg-card-subtle);
      padding: 12px;
    }
    .data-table tr td:first-child { border-radius: 12px 0 0 12px; font-weight: 600; }
    .data-table tr td:last-child { border-radius: 0 12px 12px 0; }
    .seg-bars {
      display: inline-flex;
      gap: 3px;
      vertical-align: middle;
    }
    .seg-bars i {
      width: 4px;
      height: 15px;
      border-radius: 2px;
      background: rgba(148,163,184,0.28);
      display: inline-block;
    }
    .seg-bars i.on { background: #84CC16; }

    /* Founder Stack Adapted Dashboards */
    .kpi-row-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }
    .metric-tile {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px 18px;
    }
    .metric-tile .m-lbl { font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.06em; }
    .metric-tile .m-val { font-size: 28px; font-weight: 800; margin: 6px 0 4px; }
    .metric-tile .m-delta { font-size: 11.5px; font-weight: 600; }

    .two-col-charts {
      display: grid;
      grid-template-columns: 1.6fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    @media (max-width: 960px) { .two-col-charts { grid-template-columns: 1fr; } }

    .fleet-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 11px 14px;
      border-radius: 12px;
      background: var(--bg-card-subtle);
      margin-bottom: 8px;
      font-size: 12.5px;
    }
    .healthy-pill {
      background: rgba(16, 185, 129, 0.16);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }

    /* Downloader & Transcript Forms */
    .form-row {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .input-ctrl, select.input-ctrl, textarea.input-ctrl {
      background: var(--bg-card-subtle);
      color: var(--text-main);
      border: 1px solid var(--border);
      border-radius: 11px;
      padding: 10px 14px;
      font-size: 13px;
      outline: none;
    }
    .input-ctrl:focus { border-color: var(--lime-strong); }
    .btn-primary {
      background: #C6FF33;
      color: #0B0F14;
      border: none;
      border-radius: 11px;
      padding: 10px 18px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-sec {
      background: var(--bg-card-subtle);
      color: var(--text-main);
      border: 1px solid var(--border);
      border-radius: 11px;
      padding: 10px 15px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }

    /*Changelog badges*/
    .cl-item {
      border: 1px solid var(--border);
      background: var(--bg-card);
      border-radius: 14px;
      padding: 15px 18px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .cl-tag {
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      margin-right: 8px;
    }
    .cl-NEW { background: rgba(6,182,212,0.18); color: #06B6D4; }
    .cl-IMPROVED { background: rgba(16,185,129,0.18); color: #10B981; }
    .cl-FIX { background: rgba(239,68,68,0.18); color: #EF4444; }

    /* IDM-Style Floating Mini-Taskbar Overlay (Bottom-Right near System Clock) */
    .mini-taskbar-popup {
      position: fixed;
      right: 22px;
      bottom: 22px;
      width: 384px;
      background: linear-gradient(145deg, rgba(11, 15, 20, 0.96), rgba(18, 30, 24, 0.96));
      color: #F8FAFC;
      border: 1.5px solid rgba(198, 255, 51, 0.72);
      border-radius: 18px;
      padding: 14px 16px 12px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55), 0 0 24px rgba(198, 255, 51, 0.18);
      z-index: 9999;
      display: none;
      backdrop-filter: blur(14px);
    }
    .mini-taskbar-popup.visible { display: block; animation: slideUp 0.24s ease; }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .mini-head {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 11px; font-weight: 700; color: #C6FF33; margin-bottom: 10px;
    }
    .mini-body { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
    .mini-thumb {
      width: 92px; height: 56px; border-radius: 9px; background: #18222F;
      border: 1px solid #2C3E55; display: grid; place-items: center;
      font-size: 20px; color: #C6FF33; flex-shrink: 0; overflow: hidden;
    }
    .mini-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .mini-countdown {
      height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;
    }
    .mini-countdown > div {
      height: 100%; background: #10B981; width: 100%; transition: width 0.1s linear;
    }
  </style>
</head>
<body>
  <!-- Left Sidebar -->
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-logo"></div>
      <div>
        <div class="brand-title">VDownloader OS</div>
        <div style="font-size:10.5px;color:var(--text-muted);font-weight:600;">InsightDL Desktop v2.4</div>
      </div>
    </div>

    <div class="nav-section">Main</div>
    <button class="nav-btn active" data-view="insight">📊 Analytical Board</button>
    <button class="nav-btn" data-view="downloader">⬇ Video Downloader</button>
    <button class="nav-btn" data-view="transcript">📝 Transcript Studio</button>

    <div class="nav-section">Adapted Dashboards</div>
    <button class="nav-btn" data-view="live-metrics">📈 Live Metrics (01/05)</button>
    <button class="nav-btn" data-view="sources-hub">🌐 Sources Hub (03/06)</button>
    <button class="nav-btn" data-view="engine-health">🛡 Engine Health (06/07)</button>
    <button class="nav-btn" data-view="ui-perf">⚡ UI &amp; Bridge Perf (07/07)</button>
    <button class="nav-btn" data-view="changelog">🚀 Live Changelog (02/07)</button>

    <div class="nav-spacer"></div>
    <div class="nav-section">Architecture &amp; Ops</div>
    <button class="nav-btn" data-view="docs">📐 6 Engineering Docs</button>
    <button class="nav-btn" data-view="logs">📋 Operation Logs</button>
    <button class="nav-btn" data-view="settings">⚙ Settings</button>
  </aside>

  <!-- Main Workspace -->
  <main class="workspace">
    <!-- Top Header -->
    <header class="topbar">
      <div class="search-pill">
        <span>🔍</span>
        <input id="globalUrlInput" type="text" placeholder="Paste stream URL or press Enter to inspect..." />
        <span class="kbd-badge">⌘ + Space</span>
      </div>
      <div class="topbar-right">
        <button class="chip-btn lime" id="triggerMiniBtn" title="Simulate Browser Extension <video> Detection">
          🪟 Pop IDM Mini-Taskbar
        </button>
        <span class="chip-btn" id="wsBadge">● WS Bridge :8765</span>
        <div class="theme-switch" id="themeToggle" title="Switch Light / Dark Theme">
          <span id="moonIcon">🌙</span>
          <span id="sunIcon" class="active">☀️</span>
        </div>
      </div>
    </header>

    <!-- VIEW 1: InsightOS Analytical Board -->
    <section class="view-panel active" id="view-insight">
      <div class="board-header">
        <h1>Your Analytical Media Board</h1>
        <div style="display:flex;gap:8px;">
          <span class="chip-btn">📅 Real-Time SQLite Telemetry</span>
          <button class="chip-btn" onclick="switchView('downloader')">+ New Download</button>
        </div>
      </div>

      <div class="insight-grid">
        <div class="left-bento">
          <!-- Obsidian Hero Card -->
          <div class="obsidian-hero">
            <h2>Smart Stream &amp; Caption Distribution</h2>
            <p>yt-dlp + FFmpeg enhanced media metrics showing library volume, extraction success ROI, and timestamped transcripts.</p>
            <div class="hero-kpis">
              <div class="glass-kpi">
                <div class="label"><span class="icon-box">💾</span> Total Media Saved</div>
                <div class="val" id="kpiTotalSaved">3.17 GB</div>
              </div>
              <div class="glass-kpi">
                <div class="label"><span class="icon-box">🎯</span> Extraction ROI</div>
                <div class="val" id="kpiSuccessRoi">+100 <small>%</small></div>
              </div>
              <div class="glass-kpi">
                <div class="label"><span class="icon-box">💬</span> Transcript Cues</div>
                <div class="val" id="kpiTotalCues">324</div>
              </div>
            </div>
          </div>

          <!-- Two Mid Analysis Cards -->
          <div class="mid-cards">
            <div class="card">
              <div class="card-head">
                <h3>🎯 Platform Analysis</h3>
                <span class="mini-pill">All Sources ▾</span>
              </div>
              <div class="donut-wrap">
                <svg id="insightDonutSvg" width="160" height="160" viewBox="0 0 160 160"></svg>
                <div class="legend-list" id="insightDonutLegend"></div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">
                ⓘ Aggregated across YouTube, TikTok, Facebook, and Anime extractors
              </div>
            </div>

            <div class="card lime-surface">
              <div class="card-head">
                <h3 style="color:#0F172A;">📊 Stream &amp; Caption Analysis</h3>
                <span class="mini-pill">Live Queue ▾</span>
              </div>
              <div class="deal-columns">
                <div class="deal-col">
                  <span class="speech-tag" id="tagHdSaved">HD Saved 7</span>
                  <div class="block-striped"></div>
                </div>
                <div class="deal-col">
                  <span class="speech-tag" id="tagRetried">Failed 0</span>
                  <div class="block-obsidian"></div>
                </div>
                <div class="deal-col">
                  <span class="speech-tag" id="tagSubbed">Subtitled 8</span>
                  <div class="block-soft"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Pulse AI Panel (adapted from Bostie AI) -->
        <div class="pulse-panel">
          <div class="pulse-top">
            <span class="circle-icon" onclick="simulateExtensionEvent()">−</span>
            <span>Pulse Stream AI</span>
            <span class="circle-icon" onclick="switchView('downloader')">+</span>
          </div>
          <div class="orb-stage">
            <div class="neon-orb"></div>
            <div style="font-size:14px;color:#E2E8F0;font-weight:500;">How can I extract your stream today?</div>
          </div>
          <div>
            <div class="pulse-actions">
              <button class="pulse-action-btn" onclick="pulseQuickAction('downloader')">
                <span class="ic">🎬</span>
                144p–8K Matrix
              </button>
              <button class="pulse-action-btn" onclick="pulseQuickAction('transcript')">
                <span class="ic">📋</span>
                Instant Transcript
              </button>
            </div>
            <div class="pulse-input-row">
              <div class="pulse-input-wrap">
                <input id="pulseUrlInput" type="text" placeholder="Paste YouTube / Anime / TikTok URL..." />
                <button class="pulse-send" onclick="pulseQuickAction('downloader')">➤</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Table: Top Downloads & Stream Health -->
      <div class="card">
        <div class="card-head">
          <h3>⚡ Recent Streams &amp; Extraction Health</h3>
          <span class="mini-pill">SQLite History ▾</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Stream Title</th>
                <th>Platform</th>
                <th>Resolution</th>
                <th>Stream Health</th>
                <th>Throughput</th>
                <th>Size / Status</th>
              </tr>
            </thead>
            <tbody id="insightRecentBody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- VIEW 2: Video Downloader & Queue -->
    <section class="view-panel" id="view-downloader">
      <div class="board-header">
        <div>
          <div class="sub-tag" style="color:var(--emerald);">YT-DLP + FFMPEG ENGINE</div>
          <h1>Universal Video &amp; Audio Downloader</h1>
        </div>
        <span class="chip-btn" id="detectedPlatformChip">● Platform: Auto-Detect Ready</span>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="form-row">
          <input id="dlUrlInput" class="input-ctrl" style="flex:1;min-width:260px;"
            placeholder="Paste YouTube, Facebook, TikTok, Crunchyroll, HiAnime, Twitch, or X URL..." />
          <button class="btn-sec" id="fetchInfoBtn" onclick="fetchStreamMetadata()">🔍 Fetch Formats</button>
          <button class="btn-primary" onclick="enqueueDownload()">⬇ Download Stream</button>
        </div>

        <div id="dlInfoBanner" style="font-size:12.5px;color:var(--text-sec);margin-bottom:14px;">
          Supports 144p to 8K UHD video+audio merging via bundled FFmpeg, MP3/M4A audio extraction, and soft/hardcoded subtitles.
        </div>

        <div class="form-row">
          <label style="font-size:12.5px;font-weight:600;">Quality / Format:</label>
          <select id="dlFormatSelect" class="input-ctrl" style="min-width:290px;">
            <option value="bestvideo+bestaudio/best|mp4|Best">Best Available (Up to 8K Video + Audio)</option>
            <option value="bestvideo[height<=4320]+bestaudio/best|mkv|4320p">8K UHD (4320p MKV/MP4)</option>
            <option value="bestvideo[height<=2160]+bestaudio/best|mp4|2160p">4K UHD (2160p MP4)</option>
            <option value="bestvideo[height<=1440]+bestaudio/best|mp4|1440p">2K QHD (1440p MP4)</option>
            <option value="bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best|mp4|1080p">1080p Full HD (MP4)</option>
            <option value="bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best|mp4|720p">720p HD (MP4)</option>
            <option value="bestvideo[height<=480]+bestaudio/best|mp4|480p">480p SD (MP4)</option>
            <option value="bestvideo[height<=144]+bestaudio/best|mp4|144p">144p Data Saver (MP4)</option>
            <option value="bestaudio/best|mp3|Audio MP3|mp3">Audio Only — MP3 (320 kbps)</option>
            <option value="bestaudio[ext=m4a]/bestaudio/best|m4a|Audio M4A|m4a">Audio Only — M4A (AAC)</option>
          </select>

          <label style="font-size:12.5px;font-weight:600;">Subtitle Lang:</label>
          <input id="dlSubLang" class="input-ctrl" value="en" style="width:82px;" />
        </div>

        <div class="form-row" style="font-size:12.5px;gap:18px;">
          <label><input type="checkbox" id="chkEmbedSubs" /> Embed subtitles (soft track)</label>
          <label><input type="checkbox" id="chkHardcodeSubs" /> Hardcode / burn into video (FFmpeg)</label>
          <label><input type="checkbox" id="chkSeparateSubs" /> Save separate .srt/.vtt</label>
          <label><input type="checkbox" id="chkAutoSubs" checked /> Auto-generated captions</label>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3>📥 Active &amp; Queued Downloads</h3>
          <button class="btn-sec" onclick="refreshQueue()">↻ Refresh Queue</button>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th><th>Source</th><th>Quality</th><th>Progress</th><th>Speed</th><th>ETA</th><th>Status</th>
            </tr>
          </thead>
          <tbody id="queueTableBody">
            <tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No queued downloads yet — paste a URL above to begin.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- VIEW 3: Transcript Studio (youtubetotranscript.com style) -->
    <section class="view-panel" id="view-transcript">
      <div class="board-header">
        <div>
          <div class="sub-tag" style="color:var(--cyan);">CAPTION &amp; VTT DEDUPLICATOR</div>
          <h1>Instant Transcript Extractor</h1>
        </div>
        <button class="chip-btn" onclick="loadSampleVttDemo()">✨ Load Sample YouTube Auto-Caption VTT</button>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="form-row">
          <input id="trUrlInput" class="input-ctrl" style="flex:1;min-width:260px;"
            placeholder="Paste YouTube or streaming video URL to fetch subtitles without downloading video..." />
          <input id="trLangInput" class="input-ctrl" value="en" style="width:76px;" title="Subtitle language" />
          <label style="font-size:12.5px;"><input type="checkbox" id="trAutoChk" checked /> Auto-captions</label>
          <button class="btn-primary" onclick="extractLiveTranscript()">Extract Transcript</button>
        </div>
        <div id="trStatusMsg" style="font-size:12.5px;color:var(--emerald);margin-bottom:10px;">
          Ready — extracts subtitles via yt-dlp (--skip-download) or try the instant WebVTT rolling-caption parser demo!
        </div>

        <div class="form-row" style="justify-content:space-between;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-sec" onclick="copyTranscript(false)">📋 Copy Plain Text</button>
            <button class="btn-primary" onclick="copyTranscript(true)">⏱ Copy with Timestamps</button>
            <button class="btn-sec" onclick="downloadTranscriptFile('txt')">💾 Save .txt</button>
            <button class="btn-sec" onclick="downloadTranscriptFile('srt')">🎬 Save .srt</button>
          </div>
          <label style="font-size:12.5px;">
            <input type="checkbox" id="trShowTsChk" checked onchange="renderTranscriptBox()" />
            Display timestamps
          </label>
        </div>

        <textarea id="trOutputBox" class="input-ctrl" rows="13" readonly
          style="width:100%;font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.6;"
          placeholder="[00:00] Clean deduplicated transcript lines will appear here..."></textarea>
      </div>
    </section>

    <!-- VIEW 4: Live Metrics Dashboard (Adapted Greta 01/05) -->
    <section class="view-panel" id="view-live-metrics">
      <div class="board-header">
        <div>
          <div class="sub-tag" style="color:#10B981;">DASHBOARD 01 / 05 • REAL-TIME KPIS AT A GLANCE</div>
          <h1>Live Metrics Dashboard</h1>
        </div>
        <span class="healthy-pill">● LIVE TELEMETRY</span>
      </div>
      <div class="kpi-row-4" id="liveMetricsKpis"></div>
      <div class="two-col-charts">
        <div class="card">
          <div class="card-head"><h3>Download Throughput Trend (MB/s)</h3></div>
          <svg id="liveSpeedSvg" width="100%" height="220" viewBox="0 0 560 220"></svg>
        </div>
        <div class="card">
          <div class="card-head"><h3>Streams by Resolution Tier</h3></div>
          <svg id="liveResBarsSvg" width="100%" height="220" viewBox="0 0 360 220"></svg>
        </div>
      </div>
    </section>

    <!-- VIEW 5: Sources & Channels Hub (Adapted Greta 03/06 Clients Dashboard) -->
    <section class="view-panel" id="view-sources-hub">
      <div class="board-header">
        <div>
          <div class="sub-tag" style="color:#F59E0B;">DASHBOARD 02 / 05 • EVERY PLATFORM, ONE PLACE</div>
          <h1>Sources &amp; Channels Dashboard</h1>
        </div>
      </div>
      <div class="kpi-row-4" id="sourcesKpis"></div>
      <div class="two-col-charts">
        <div class="card">
          <div class="card-head"><h3>Recent Extractor &amp; Bridge Activity</h3></div>
          <div id="sourcesActivityList"></div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Streams by Source Category</h3></div>
          <div class="donut-wrap">
            <svg id="sourcesDonutSvg" width="160" height="160" viewBox="0 0 160 160"></svg>
            <div class="legend-list" id="sourcesDonutLegend"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- VIEW 6: Engine Health Monitor (Adapted Greta 06/07 Backend Health) -->
    <section class="view-panel" id="view-engine-health">
      <div class="board-header">
        <div>
          <div class="sub-tag" style="color:#EF4444;">DASHBOARD 03 / 05 • CATCHES EXTRACTOR &amp; FFMPEG ISSUES EARLY</div>
          <h1>Engine &amp; Bridge Health Monitor</h1>
        </div>
      </div>
      <div class="kpi-row-4" id="engineHealthKpis"></div>
      <div class="two-col-charts">
        <div class="card">
          <div class="card-head"><h3>Extractor Worker Load — Last 24 Intervals</h3></div>
          <svg id="engineLoadSvg" width="100%" height="210" viewBox="0 0 560 210"></svg>
        </div>
        <div class="card">
          <div class="card-head"><h3>Subsystem Fleet</h3></div>
          <div id="engineFleetList"></div>
        </div>
      </div>
    </section>

    <!-- VIEW 7: UI & Extension Performance (Adapted Greta 07/07 Frontend Performance) -->
    <section class="view-panel" id="view-ui-perf">
      <div class="board-header">
        <div>
          <div class="sub-tag" style="color:#3B82F6;">DASHBOARD 04 / 05 • KEEPS DESKTOP GUI &amp; MINI-TASKBAR FAST</div>
          <h1>UI &amp; Extension Performance</h1>
        </div>
      </div>
      <div class="kpi-row-4" id="uiPerfKpis"></div>
      <div class="card">
        <div class="card-head"><h3>Metadata &amp; Caption Probe Time — Last 14 Requests (Seconds)</h3></div>
        <svg id="uiLatencySvg" width="100%" height="210" viewBox="0 0 720 210"></svg>
      </div>
    </section>

    <!-- VIEW 8: Live Changelog (Adapted Greta 02/07 Live Changelog) -->
    <section class="view-panel" id="view-changelog">
      <div class="board-header">
        <div>
          <div class="sub-tag" style="color:#06B6D4;">DASHBOARD 05 / 05 • PROVES CONTINUOUS SHIPPING</div>
          <h1>Live Changelog — What's New</h1>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="chip-btn" onclick="filterChangelog('ALL')">All</button>
          <button class="chip-btn" onclick="filterChangelog('NEW')">New</button>
          <button class="chip-btn" onclick="filterChangelog('IMPROVED')">Improved</button>
          <button class="chip-btn" onclick="filterChangelog('FIX')">Fixes</button>
        </div>
      </div>
      <div id="changelogList"></div>
    </section>

    <!-- VIEW 9: 6 Engineering Docs Viewer -->
    <section class="view-panel" id="view-docs">
      <div class="board-header">
        <div>
          <div class="sub-tag" style="color:#F59E0B;">ENGINEERING BLUEPRINT SUITE</div>
          <h1>6 Architecture &amp; Product Specification Docs</h1>
        </div>
      </div>
      <div class="form-row" id="docButtonsRow"></div>
      <div class="card">
        <pre id="docContentBox" style="white-space:pre-wrap;font-family:'Inter',sans-serif;font-size:13px;line-height:1.65;color:var(--text-sec);"></pre>
      </div>
    </section>

    <!-- VIEW 10: Operation Logs -->
    <section class="view-panel" id="view-logs">
      <div class="board-header">
        <h1>Application &amp; WebSocket Logs</h1>
        <button class="btn-sec" onclick="loadLogs()">↻ Refresh Logs</button>
      </div>
      <div class="card">
        <pre id="logsBox" style="white-space:pre-wrap;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.55;max-height:520px;overflow-y:auto;"></pre>
      </div>
    </section>

    <!-- VIEW 11: Settings -->
    <section class="view-panel" id="view-settings">
      <div class="board-header"><h1>Settings &amp; Configuration</h1></div>
      <div class="card" style="max-width:680px;">
        <div class="form-row"><label style="width:210px;font-weight:600;">Download Folder:</label><input id="cfgDownloadDir" class="input-ctrl" style="flex:1;" /></div>
        <div class="form-row"><label style="width:210px;font-weight:600;">Default Subtitle Language:</label><input id="cfgSubLang" class="input-ctrl" style="width:120px;" /></div>
        <div class="form-row"><label style="width:210px;font-weight:600;">WebSocket Bridge Port:</label><input id="cfgWsPort" type="number" class="input-ctrl" style="width:120px;" /></div>
        <div class="form-row"><label style="width:210px;font-weight:600;">Mini-Taskbar Timeout (sec):</label><input id="cfgMiniTimeout" type="number" class="input-ctrl" style="width:120px;" /></div>
        <div class="form-row"><label style="width:210px;font-weight:600;">Enable Floating Mini-Taskbar:</label><input id="cfgMiniEnabled" type="checkbox" checked /></div>
        <div class="form-row"><label style="width:210px;font-weight:600;">Enable Clipboard Fallback:</label><input id="cfgClipEnabled" type="checkbox" checked /></div>
        <button class="btn-primary" onclick="saveSettings()">Save Configuration</button>
        <span id="cfgSavedToast" style="margin-left:12px;color:var(--emerald);font-size:12.5px;font-weight:600;"></span>
      </div>
    </section>
  </main>

  <!-- IDM-Style Floating Mini-Taskbar near System Clock -->
  <div class="mini-taskbar-popup" id="miniTaskbarPopup">
    <div class="mini-head">
      <span id="miniPlatformText">● YouTube • Video Stream Detected</span>
      <span id="miniTimerText" style="color:#94A3B8;">15s</span>
    </div>
    <div class="mini-body">
      <div class="mini-thumb" id="miniThumbBox">▶</div>
      <div style="flex:1;min-width:0;">
        <div id="miniTitleText" style="font-size:12.5px;font-weight:600;margin-bottom:9px;line-height:1.35;">
          Big Buck Bunny 60fps 4K Master Stream
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-primary" style="padding:6px 13px;font-size:12px;" onclick="acceptMiniTaskbar()">⬇ Download</button>
          <button class="btn-sec" style="padding:6px 12px;font-size:12px;background:#1E293B;color:#E2E8F0;border-color:#334155;" onclick="dismissMiniTaskbar()">Dismiss</button>
        </div>
      </div>
    </div>
    <div class="mini-countdown"><div id="miniCountdownFill"></div></div>
  </div>

  <script>
    let latestSnapshot = null;
    let currentTranscript = null;
    let currentChangelogFilter = "ALL";
    let miniInterval = null;
    let miniCurrentUrl = "";

    function switchView(name) {
      document.querySelectorAll(".view-panel").forEach(el => el.classList.remove("active"));
      document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === name);
      });
      const panel = document.getElementById(`view-${name}`);
      if (panel) panel.classList.add("active");
      if (name === "logs") loadLogs();
      if (name === "docs") loadEngineeringDocs();
      if (name === "downloader") refreshQueue();
    }

    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    // Theme switching
    document.getElementById("themeToggle").addEventListener("click", () => {
      const root = document.documentElement;
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      document.getElementById("moonIcon").classList.toggle("active", next === "dark");
      document.getElementById("sunIcon").classList.toggle("active", next === "light");
    });

    // Global URL shortcut
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.code === "Space") {
        e.preventDefault();
        document.getElementById("globalUrlInput").focus();
      }
    });
    document.getElementById("globalUrlInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.value.trim()) {
        document.getElementById("dlUrlInput").value = e.target.value.trim();
        switchView("downloader");
        detectUrlPlatform(e.target.value.trim());
      }
    });

    document.getElementById("dlUrlInput").addEventListener("input", (e) => {
      detectUrlPlatform(e.target.value.trim());
    });

    async function detectUrlPlatform(url) {
      const chip = document.getElementById("detectedPlatformChip");
      if (!url) {
        chip.textContent = "● Platform: Auto-Detect Ready";
        return;
      }
      const res = await fetch("api/detect-url", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url})
      });
      const data = await res.json();
      chip.textContent = data.is_supported
        ? `● Source: ${data.display_name} (${data.extractor_name})`
        : "⚠ Invalid / Unsupported URL";
    }

    function renderDonut(svgId, legendId, items, centerVal, centerSub) {
      const svg = document.getElementById(svgId);
      const leg = document.getElementById(legendId);
      if (!svg || !leg) return;
      const total = items.reduce((acc, it) => acc + it.value, 0) || 1;
      const r = 56, cx = 80, cy = 80, circ = 2 * Math.PI * r;
      let offset = 0;
      let circles = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="22"/>`;
      items.forEach(it => {
        const len = (it.value / total) * circ;
        circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}"
          stroke-width="22" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}"
          transform="rotate(-90 ${cx} ${cy})" />`;
        offset += len;
      });
      circles += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" fill="currentColor" font-size="18" font-weight="800">${centerVal}</text>`;
      circles += `<text x="${cx}" y="${cy + 15}" text-anchor="middle" fill="#8291A5" font-size="10">${centerSub}</text>`;
      svg.innerHTML = circles;
      leg.innerHTML = items.map(it =>
        `<div class="legend-item"><span class="dot" style="background:${it.color}"></span><b>${it.value}</b> <span style="color:var(--text-sec)">${it.label}</span></div>`
      ).join("");
    }

    function renderAreaChart(svgId, values, color) {
      const svg = document.getElementById(svgId);
      if (!svg || !values.length) return;
      const w = 560, h = 220, pad = 26;
      const maxV = Math.max(...values, 1) * 1.15;
      const pts = values.map((v, i) => {
        const x = pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
        const y = h - pad - (v / maxV) * (h - pad * 2);
        return [x, y];
      });
      const poly = pts.map(p => p.join(",")).join(" ");
      const area = `${pts[0][0]},${h - pad} ${poly} ${pts[pts.length - 1][0]},${h - pad}`;
      svg.innerHTML = `
        <defs>
          <linearGradient id="ag_${svgId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.42"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        <polygon points="${area}" fill="url(#ag_${svgId})" />
        <polyline points="${poly}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
        ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${color}"/>`).join("")}
      `;
    }

    function renderBars(svgId, entries, color, width = 560) {
      const svg = document.getElementById(svgId);
      if (!svg || !entries.length) return;
      const h = 210, padX = 16, padBot = entries.length <= 6 ? 28 : 14, padTop = 16;
      const maxV = Math.max(...entries.map(e => e.value), 1);
      const slot = (width - padX * 2) / entries.length;
      const bw = Math.max(6, slot * 0.72);
      svg.innerHTML = entries.map((e, i) => {
        const bh = Math.max(6, (e.value / maxV) * (h - padTop - padBot));
        const x = padX + i * slot + (slot - bw) / 2;
        const y = h - padBot - bh;
        const lbl = entries.length <= 6 && e.label
          ? `<text x="${x + bw / 2}" y="${h - 8}" text-anchor="middle" fill="#8291A5" font-size="10.5">${e.label}</text>`
          : "";
        return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${color}" opacity="0.9"/>${lbl}`;
      }).join("");
    }

    async function loadSnapshot() {
      const res = await fetch("api/snapshot");
      const snap = await res.json();
      latestSnapshot = snap;

      document.getElementById("wsBadge").textContent = `● WS Bridge :${snap.ws_port}`;
      const b = snap.insight_board;
      document.getElementById("kpiTotalSaved").textContent = b.total_media_saved;
      document.getElementById("kpiSuccessRoi").innerHTML = `+${b.success_rate_pct} <small>%</small>`;
      document.getElementById("kpiTotalCues").textContent = b.total_transcript_cues.toLocaleString();

      renderDonut("insightDonutSvg", "insightDonutLegend", [
        {label: "YouTube", value: b.platform_donut.youtube, color: "#4F35FF"},
        {label: "TikTok & Social", value: b.platform_donut.social, color: "#94A3B8"},
        {label: "Anime & Streaming", value: b.platform_donut.anime_and_other, color: "#84CC16"}
      ], b.total_downloads, "Saved Streams");

      document.getElementById("tagHdSaved").textContent = `HD Saved ${b.format_deal_cards.hd_completed}`;
      document.getElementById("tagRetried").textContent = `Failed ${b.format_deal_cards.retried_or_failed}`;
      document.getElementById("tagSubbed").textContent = `Subtitled ${b.format_deal_cards.subtitle_enriched}`;

      document.getElementById("insightRecentBody").innerHTML = b.recent_downloads.map(r => {
        const onCnt = Math.max(1, Math.min(10, Math.round(r.health_score / 10)));
        const segs = Array.from({length: 10}, (_, idx) => `<i class="${idx < onCnt ? 'on' : ''}"></i>`).join("");
        return `<tr>
          <td>${r.title}</td>
          <td>${r.platform}</td>
          <td><b>${r.resolution}</b></td>
          <td><span class="seg-bars">${segs}</span> <span style="font-size:11.5px;margin-left:6px;">${r.health_score}%</span></td>
          <td>${r.speed_mbps}</td>
          <td><b>${r.size_human}</b> • ${r.status}</td>
        </tr>`;
      }).join("");

      // Live Metrics
      const lm = snap.live_metrics;
      document.getElementById("liveMetricsKpis").innerHTML = [
        ["Library Bandwidth", lm.total_volume_human, "+18.4% vs last week", "#10B981"],
        ["Completed Videos", lm.completed_streams, "yt-dlp verified", "#10B981"],
        ["Avg Speed", `${lm.avg_speed_mbps} MB/s`, "Multi-fragment HLS", "#10B981"],
        ["Subtitle Conversion", `${lm.subtitle_conversion_pct}%`, "SRT / VTT clean", "#10B981"]
      ].map(([l, v, d, c]) => `<div class="metric-tile"><div class="m-lbl">${l}</div><div class="m-val">${v}</div><div class="m-delta" style="color:${c}">${d}</div></div>`).join("");
      renderAreaChart("liveSpeedSvg", lm.speed_trend_mbps, "#10B981");
      renderBars("liveResBarsSvg", Object.entries(lm.resolution_bars).map(([k, v]) => ({label: k, value: v})), "#10B981", 360);

      // Sources Hub
      const sh = snap.sources_hub;
      document.getElementById("sourcesKpis").innerHTML = [
        ["Supported Sites", sh.supported_extractors.toLocaleString(), "Active yt-dlp extractors", "#F59E0B"],
        ["Tracked Channels", sh.tracked_channels, "Unique creators", "#F59E0B"],
        ["Media Volume", sh.library_volume_human, "Saved offline", "#F59E0B"],
        ["Open Queue Jobs", sh.active_queue_jobs, "Worker pool", "#F59E0B"]
      ].map(([l, v, d, c]) => `<div class="metric-tile"><div class="m-lbl">${l}</div><div class="m-val">${v}</div><div class="m-delta" style="color:${c}">${d}</div></div>`).join("");
      document.getElementById("sourcesActivityList").innerHTML = sh.recent_activity.map(a =>
        `<div class="fleet-row"><div><b>${a.headline}</b><div style="font-size:11.5px;color:var(--text-muted)">${a.detail}</div></div><span class="mini-pill">${a.type}</span></div>`
      ).join("");
      const pb = sh.platform_breakdown;
      renderDonut("sourcesDonutSvg", "sourcesDonutLegend", [
        {label: "YouTube", value: pb["YouTube"] || 0, color: "#F59E0B"},
        {label: "Anime Sites", value: pb["Anime Sites"] || 0, color: "#F97316"},
        {label: "TikTok & Social", value: pb["TikTok & Social"] || 0, color: "#EAB308"},
        {label: "Other Portals", value: pb["Other Portals"] || 0, color: "#78716C"}
      ], Object.values(pb).reduce((a, b) => a + b, 0), "Sources");

      // Engine Health
      const eh = snap.engine_health;
      document.getElementById("engineHealthKpis").innerHTML = [
        ["Bridge Uptime", `${eh.ws_uptime_pct}%`, "● stable", "#10B981"],
        ["Avg Probe Time", `${eh.avg_extractor_ms}ms`, "▼ fast metadata", "#10B981"],
        ["Error Rate", `${eh.error_rate_pct}%`, "Exponential retry active", "#10B981"]
      ].map(([l, v, d, c]) => `<div class="metric-tile"><div class="m-lbl">${l}</div><div class="m-val">${v}</div><div class="m-delta" style="color:${c}">${d}</div></div>`).join("");
      renderBars("engineLoadSvg", eh.engine_load_24.map(v => ({label: "", value: v})), "#EF4444", 560);
      document.getElementById("engineFleetList").innerHTML = eh.fleet.map(f =>
        `<div class="fleet-row"><div><b>${f.name}</b><div style="font-size:11px;color:var(--text-muted)">${f.detail}</div></div><span class="healthy-pill">● Healthy</span></div>`
      ).join("");

      // UI Performance
      const up = snap.ui_performance;
      document.getElementById("uiPerfKpis").innerHTML = [
        ["Responsiveness Score", up.responsiveness_score, "▲ +3pts vs baseline", "#10B981"],
        ["Metadata Fetch (P50)", `${up.metadata_fetch_p50_sec}s`, "Non-blocking QThread", "#10B981"],
        ["Mini-Taskbar Jitter", `${up.mini_taskbar_jitter_sec}s`, "● zero focus-steal", "#10B981"]
      ].map(([l, v, d, c]) => `<div class="metric-tile"><div class="m-lbl">${l}</div><div class="m-val">${v}</div><div class="m-delta" style="color:${c}">${d}</div></div>`).join("");
      renderBars("uiLatencySvg", up.latency_bars_14.map(v => ({label: "", value: v})), "#3B82F6", 720);

      renderChangelog();
    }

    function filterChangelog(tag) {
      currentChangelogFilter = tag;
      renderChangelog();
    }

    function renderChangelog() {
      if (!latestSnapshot) return;
      const items = latestSnapshot.changelog.filter(c => currentChangelogFilter === "ALL" || c.tag === currentChangelogFilter);
      document.getElementById("changelogList").innerHTML = items.map(c => `
        <div class="cl-item">
          <div>
            <div style="margin-bottom:5px;"><span class="cl-tag cl-${c.tag}">${c.tag}</span><b>${c.version} — ${c.title}</b></div>
            <div style="font-size:12.5px;color:var(--text-sec);">${c.description}</div>
          </div>
          <span style="font-size:11.5px;color:var(--text-muted);white-space:nowrap;">${c.released_label}</span>
        </div>
      `).join("");
    }

    function pulseQuickAction(targetView) {
      const url = document.getElementById("pulseUrlInput").value.trim();
      if (targetView === "downloader") {
        if (url) document.getElementById("dlUrlInput").value = url;
        switchView("downloader");
      } else {
        if (url) document.getElementById("trUrlInput").value = url;
        switchView("transcript");
      }
    }

    // Downloader API actions
    async function fetchStreamMetadata() {
      const url = document.getElementById("dlUrlInput").value.trim();
      if (!url) return;
      const banner = document.getElementById("dlInfoBanner");
      banner.textContent = "Querying yt-dlp extractor for resolutions & subtitle tracks...";
      const res = await fetch("api/fetch-info", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url})
      });
      const data = await res.json();
      if (!data.ok) {
        banner.textContent = `⚠ ${data.error}`;
        return;
      }
      const m = data.metadata;
      banner.textContent = `✓ ${m.title} • ${m.uploader} (${m.duration_human}) • ${m.formats.length} format options (${m.fetch_elapsed_sec}s)`;
      const sel = document.getElementById("dlFormatSelect");
      sel.innerHTML = m.formats.map(f =>
        `<option value="${f.ydl_format}|${f.container}|${f.resolution}|${f.audio_only}">${f.label}</option>`
      ).join("");
      loadSnapshot();
    }

    async function enqueueDownload() {
      const url = document.getElementById("dlUrlInput").value.trim();
      if (!url) return;
      const parts = document.getElementById("dlFormatSelect").value.split("|");
      await fetch("api/enqueue", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          url,
          ydl_format: parts[0] || "bestvideo+bestaudio/best",
          container: parts[1] || "mp4",
          resolution: parts[2] || "Best",
          audio_only: parts[3] || "",
          subtitle_lang: document.getElementById("dlSubLang").value || "en",
          embed_subtitles: document.getElementById("chkEmbedSubs").checked,
          hardcode_subtitles: document.getElementById("chkHardcodeSubs").checked,
          save_separate_subtitles: document.getElementById("chkSeparateSubs").checked,
          include_auto_subtitles: document.getElementById("chkAutoSubs").checked
        })
      });
      refreshQueue();
    }

    async function refreshQueue() {
      const res = await fetch("api/queue");
      const data = await res.json();
      const tbody = document.getElementById("queueTableBody");
      if (!data.tasks.length) return;
      tbody.innerHTML = data.tasks.map(t => `
        <tr>
          <td>${t.title}</td>
          <td>${t.platform_name}</td>
          <td><b>${t.resolution_label}</b></td>
          <td><b>${t.progress.percent}%</b></td>
          <td>${t.progress.speed_human}</td>
          <td>${t.progress.eta_human}</td>
          <td>${t.progress.message || t.progress.status}</td>
        </tr>
      `).join("");
    }

    // Transcript Studio actions
    async function loadSampleVttDemo() {
      const res = await fetch("api/parse-vtt-demo", {method: "POST"});
      const data = await res.json();
      currentTranscript = data.transcript;
      document.getElementById("trStatusMsg").textContent =
        `✓ Parsed ${currentTranscript.cue_count} clean cues (${currentTranscript.word_count} words) — rolling duplicate auto-caption lines removed!`;
      renderTranscriptBox();
      loadSnapshot();
    }

    async function extractLiveTranscript() {
      const url = document.getElementById("trUrlInput").value.trim();
      if (!url) {
        loadSampleVttDemo();
        return;
      }
      const msg = document.getElementById("trStatusMsg");
      msg.textContent = "Fetching captions via yt-dlp (--skip-download)...";
      const res = await fetch("api/transcript", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          url,
          lang: document.getElementById("trLangInput").value || "en",
          include_auto: document.getElementById("trAutoChk").checked
        })
      });
      const data = await res.json();
      if (!data.ok) {
        msg.textContent = `⚠ ${data.error}`;
        return;
      }
      currentTranscript = data.transcript;
      msg.textContent = `✓ ${currentTranscript.video_title} • ${currentTranscript.cue_count} cues (${currentTranscript.fetch_elapsed_sec}s)`;
      renderTranscriptBox();
      loadSnapshot();
    }

    function renderTranscriptBox() {
      if (!currentTranscript) return;
      const withTs = document.getElementById("trShowTsChk").checked;
      document.getElementById("trOutputBox").value = withTs
        ? currentTranscript.timestamped_text
        : currentTranscript.plain_text;
    }

    async function copyTranscript(withTs) {
      if (!currentTranscript) await loadSampleVttDemo();
      const text = withTs ? currentTranscript.timestamped_text : currentTranscript.plain_text;
      await navigator.clipboard.writeText(text);
      document.getElementById("trStatusMsg").textContent =
        `✓ Copied ${withTs ? "timestamped" : "plain"} transcript (${text.length} chars) to clipboard!`;
    }

    async function downloadTranscriptFile(ext) {
      if (!currentTranscript) await loadSampleVttDemo();
      const content = ext === "srt" ? currentTranscript.srt_text : currentTranscript.timestamped_text;
      const blob = new Blob([content], {type: "text/plain;charset=utf-8"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `transcript.${ext}`;
      a.click();
    }

    // IDM-Style Mini-Taskbar Simulation (round-trips through ExtensionWebSocketServer!)
    document.getElementById("triggerMiniBtn").addEventListener("click", simulateExtensionEvent);

    async function simulateExtensionEvent() {
      const samples = [
        {url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", title: "Big Buck Bunny 60fps 4K UHD — YouTube Watch Stream"},
        {url: "https://www.crunchyroll.com/watch/G6NQ5DWZ6/episode-1", title: "Solo Leveling Ep.08 (1080p Simulcast Sub) — Crunchyroll"},
        {url: "https://www.tiktok.com/@designsystems/video/739201928371", title: "Modern Bento UI Breakdown — TikTok Creator Video"}
      ];
      const pick = samples[Math.floor(Math.random() * samples.length)];
      const res = await fetch("api/simulate-extension", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(pick)
      });
      const data = await res.json();
      showMiniPopup(pick.url, pick.title, data.platform ? data.platform.display_name : "YouTube");
      loadSnapshot();
    }

    function showMiniPopup(url, title, platformName) {
      miniCurrentUrl = url;
      document.getElementById("miniPlatformText").textContent = `● ${platformName} • Stream Detected`;
      document.getElementById("miniTitleText").textContent = title;
      const popup = document.getElementById("miniTaskbarPopup");
      popup.classList.add("visible");

      let remainingMs = 15000;
      if (miniInterval) clearInterval(miniInterval);
      miniInterval = setInterval(() => {
        remainingMs -= 100;
        if (remainingMs <= 0) {
          dismissMiniTaskbar();
          return;
        }
        document.getElementById("miniCountdownFill").style.width = `${(remainingMs / 15000) * 100}%`;
        document.getElementById("miniTimerText").textContent = `${Math.ceil(remainingMs / 1000)}s`;
      }, 100);
    }

    function dismissMiniTaskbar() {
      if (miniInterval) clearInterval(miniInterval);
      document.getElementById("miniTaskbarPopup").classList.remove("visible");
    }

    function acceptMiniTaskbar() {
      const target = miniCurrentUrl;
      dismissMiniTaskbar();
      document.getElementById("dlUrlInput").value = target;
      switchView("downloader");
      detectUrlPlatform(target);
    }

    // Engineering Docs & Logs & Settings
    async function loadEngineeringDocs(docName = "") {
      const res = await fetch(`api/docs${docName ? '?name=' + encodeURIComponent(docName) : ''}`);
      const data = await res.json();
      document.getElementById("docButtonsRow").innerHTML = data.files.map(f =>
        `<button class="chip-btn ${f === data.selected ? 'lime' : ''}" onclick="loadEngineeringDocs('${f}')">${f}</button>`
      ).join("");
      document.getElementById("docContentBox").textContent = data.content;
    }

    async function loadLogs() {
      const res = await fetch("api/logs");
      const data = await res.json();
      document.getElementById("logsBox").textContent = data.lines.join("\n");
    }

    async function loadSettings() {
      const res = await fetch("api/config");
      const cfg = await res.json();
      document.getElementById("cfgDownloadDir").value = cfg.download_dir;
      document.getElementById("cfgSubLang").value = cfg.default_subtitle_lang;
      document.getElementById("cfgWsPort").value = cfg.websocket_port;
      document.getElementById("cfgMiniTimeout").value = cfg.mini_taskbar_timeout_sec;
      document.getElementById("cfgMiniEnabled").checked = cfg.mini_taskbar_enabled;
      document.getElementById("cfgClipEnabled").checked = cfg.clipboard_monitor_enabled;
    }

    async function saveSettings() {
      await fetch("api/config", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          download_dir: document.getElementById("cfgDownloadDir").value,
          default_subtitle_lang: document.getElementById("cfgSubLang").value,
          websocket_port: Number(document.getElementById("cfgWsPort").value),
          mini_taskbar_timeout_sec: Number(document.getElementById("cfgMiniTimeout").value),
          mini_taskbar_enabled: document.getElementById("cfgMiniEnabled").checked,
          clipboard_monitor_enabled: document.getElementById("cfgClipEnabled").checked
        })
      });
      document.getElementById("cfgSavedToast").textContent = "✓ Saved to config.json!";
      setTimeout(() => { document.getElementById("cfgSavedToast").textContent = ""; }, 2500);
    }

    loadSnapshot();
    loadSettings();
    setInterval(refreshQueue, 3000);
  </script>
</body>
</html>
"""

# #4 Design Brief Document

## 1. Overview
This document defines the visual design direction for **VDownloader OS**, synthesizing the **InsightOS Analytical Bento UI** (crisp light/dark contrast, neon lime accents, glowing AI orb) with the **Founder Telemetry Dashboard Stack** (emerald live metrics, gold sources hub, coral/emerald fleet health, electric-blue latency bars, and cyan changelog tags).

## 2. Brand Identity
A tactile, high-precision analytical workstation aesthetic that treats video downloading, caption extraction, and stream diagnostics like a first-class observability product rather than a cluttered utility window.

## 3. Color Palette

| Token Role | Dark Mode Hex | Light Mode Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#0B0F14` | `#F4F6F1` | Root window & scroll workspace background |
| **Elevated Surface** | `#131B24` | `#FFFFFF` | Bento cards, queue tables, and forms |
| **Obsidian Hero** | `#080B0F` | `#0E1311` | Smart Distribution KPI card, Pulse AI panel & Mini-Taskbar |
| **Primary Neon Lime** | `#C6FF33` | `#A3E635` | Primary CTA buttons, active sidebar border, Mini-Taskbar ring |
| **Emerald Success** | `#10B981` | `#059669` | Live Metrics trend chart, progress bars, `● Healthy` pills |
| **Warm Amber** | `#F59E0B` | `#D97706` | Sources & Channels Hub KPIs and category rings |
| **Electric Blue** | `#3B82F6` | `#2563EB` | UI & Extension Performance 14-bar latency series |
| **Coral Alert** | `#EF4444` | `#DC2626` | Engine worker load bars, `FIX` badge, and error banners |

## 4. Typography
- **Primary UI Font**: `Inter` / `SF Pro Display` / `Segoe UI`
  - **H1 Page Title**: `26–28px`, Bold (`700`), `-0.03em` tracking
  - **KPI Numerals**: `24–28px`, ExtraBold (`800`), tabular alignment
  - **Card Headers**: `14–16px`, Bold (`700`)
  - **Body & Controls**: `12.5–13px`, Medium/SemiBold (`500–600`)
- **Monospace Font**: `JetBrains Mono` / `Consolas` (`12–13px`) for timestamped transcripts (`[01:24]`) and real-time operation logs.

## 5. Signature UI Components
- **Active Sidebar Pill**: Dark obsidian-to-lime gradient pill with crisp white label.
- **Segmented Stream Health Bar**: 10-segment neon green bar (`▮▮▮▮▮▮▮▮▮▯ 96%`) inside recent download rows.
- **Pulse Stream Orb**: Multi-stop radial gradient orb (`#FFFFFF -> #C6FF33 -> #10B981 -> #0284C7`) for quick URL inspection.
- **Floating IDM Mini-Taskbar**: `384x138px` translucent obsidian glass popup with rounded thumbnail, source dot, primary lime `⬇ Download` button, `Dismiss` button, and a 4px emerald countdown bar.

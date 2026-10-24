# Portfolio build plan — two master catalogues → working apps

**Status: in progress (started 2026-10-24).** Source catalogues: *Python Software
Engineering & Product Development Ecosystem* (25 projects) and *Python
Cybersecurity Engineering Lab* (20 projects). This document maps every catalogue
entry to a working app in `apps/` and records honest build status.

## Principles applied

- **Preserve existing work (§24):** where an app in this repository already
  delivers a catalogue concept, it is reused, not rebuilt.
- **Interface follows the project's level (per the catalogues):** beginner
  projects are CLI applications (the spec explicitly prefers this and forbids
  overengineering them); multi-user, realtime, e-commerce and AI products are
  web applications (FastAPI + React, matching the suite conventions).
- **Honesty rules (standing):** simulated data labelled; heuristics never
  presented as proof; ML predictions ≠ verified truth; no invented metrics,
  URLs, dates or credentials; screenshots pending capture.

## Engineering catalogue (25)

| # | Catalogue project | App | Interface | Status |
| --- | --- | --- | --- | --- |
| 1 | Student Grade Management | `gradeflow` | CLI + JSON | planned |
| 2 | Personal Expense Tracker | `budgetbook` | CLI + JSON | planned |
| 3 | Number Guessing Game | `guessmaster` | CLI | planned |
| 4 | Quiz Application | `quizbox` | CLI + JSON bank | planned |
| 5 | Secure Password Generator | `passforge` | CLI | planned |
| 6 | Personal Task Manager | `taskdeck` | CLI + JSON | planned |
| 7 | University Management System | `unicore` | CLI + SQLite | planned |
| 8 | File Organizer | `tidyfiles` | CLI | planned |
| 9 | Library Management System | `shelfwise` | CLI + SQLite | planned |
| 10 | Flashcard Learning Application | `flashkit` | CLI + SQLite | planned |
| 11 | Weather Application | `skycast` | CLI + provider adapter | planned |
| 12 | Chess Game Analyzer | **`chessscope`** (existing) | Web + Stockfish | **reused** |
| 13 | Electrical Engineering Calculator | **`circuitlab-calc`** (existing) | Web | **reused** |
| 14 | Data Analysis Dashboard | `datadesk` | CLI + HTML reports | planned |
| 15 | Personal Knowledge Management | `notekit` | CLI + SQLite | planned |
| 16 | Real-Time Multiplayer Quiz | `quizarena` | FastAPI + WebSocket web | planned |
| 17 | AI Study Assistant | `prepwise` | FastAPI web (RAG) | planned |
| 18 | E-Commerce Application | `shopdeck` | FastAPI web | planned |
| 19 | Automated Web Data Collection | `webwatch` | CLI + SQLite | planned |
| 20 | AI Content Assistant for Creators | `creadesk` | FastAPI web | planned |
| 21 | Smart University Management Platform | **`campusflow`** (existing) | Web (multi-role) | **reused** |
| 22 | Engineering Simulation Toolkit | `simforge` | CLI + NumPy/SymPy | planned |
| 23 | Home Energy Monitoring | `wattwise` | CLI + SQLite | planned |
| 24 | Personal AI Knowledge Assistant | `docsage` | FastAPI web (RAG) | planned |
| 25 | Original Software Product | `stockmate` (SME inventory tracker) | FastAPI web | planned |

## Cybersecurity catalogue (20)

| # | Catalogue project | App | Interface | Status |
| --- | --- | --- | --- | --- |
| 1 | Secure Password Generator | **`passforge`** (shared with Eng 5) | CLI | planned |
| 2 | File Hashing & Integrity Checker | **`fileguard`** (existing) | Web | **reused** |
| 3 | Password Strength Analyzer | `passmeter` | CLI | planned |
| 4 | File Encryption/Decryption Tool | `fileseal` | CLI | planned |
| 5 | Cybersecurity Log Analyzer | **`sentinellog`** (existing) | Web | **reused** |
| 6 | Phishing Email Analyzer | `phishlens` | CLI | planned |
| 7 | File Integrity Monitoring System | **`fileguard`** (existing) | Web | **reused** |
| 8 | Secret & API-Key Scanner | `secretscan` | CLI | planned |
| 9 | Dependency Vulnerability Auditor | **`dependsecure`** (existing) | Web | **reused** |
| 10 | HTTP Security Headers Checker | `headercheck` | CLI | planned |
| 11 | Network Traffic Analyzer | `netscope` | CLI | planned |
| 12 | Suspicious Login Detection | `loginsense` | CLI | planned |
| 13 | Mini SIEM | **`sentinelcore`** (existing) | Web | **reused** |
| 14 | Digital Forensics Evidence Analyzer | `incidentflow` | CLI + SQLite | planned |
| 15 | Secure Login System with MFA | `authgate` | FastAPI web + TOTP | planned |
| 16 | Web Application Security Testing Lab | `secweblab` | pytest runner + fixture app | planned |
| 17 | Threat Intelligence Lookup/Enrichment | `threatintel-desk` | CLI + SQLite | planned |
| 18 | Endpoint Security Monitoring | `hostwatch` | CLI | planned |
| 19 | Phishing URL Detection Model | `urlshield` | CLI (scikit-learn) | planned |
| 20 | Python Security Automation Dashboard | `secops-dash` | FastAPI web (integration) | planned |

Notes:

- `phishlens`, `netscope`, `threatintel-desk`, `incidentflow` deliberately reuse
  the Tamuzi/Velaqori catalogue slugs so the platform case-study records can
  later flip to verified built evidence.
- External networks are largely unreachable in the build environment:
  network-facing tools ship **offline-first** with fixture data and configurable
  provider/target adapters that are explicitly scoped and never silently used.
  This is documented per app, not hidden.
- ChatGPT/Claude-style AI features use a **labelled demo mode** (prepared,
  deterministic outputs grounded in supplied material) with an optional
  provider adapter — never fabricated "live model" claims.

## Status legend

planned → in progress → **built** (tests executed green) → committed → merged.

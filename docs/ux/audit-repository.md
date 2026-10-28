# UX audit · repository

41 projects · 22 defects across 99 occurrences · 0 P0 · 0 P1 · 0 P2 · 22 P3

Produced by the Northstar UX Engine from source analysis. Every finding names a file and a line;
nothing here was observed in a browser, and no screenshot is implied. Checks that need rendering
are listed under “Not checked” in the project docs.

## Top three

### 1. Table header without `scope` — apps/campusflow

- **Severity:** P3
- **Where:** `src/pages.tsx:134` (15 occurrences)
- **Pattern:** P63
- **Why it matters:** Without `scope`, a screen reader cannot say which column a cell belongs to, and the table degrades to a stream of numbers.
- **Fix:** Add `scope="col"` to column headers and `scope="row"` to row headers.
- **Evidence:** `<th className="th">Enrollment no.</th>`

### 2. Table header without `scope` — apps/dependsecure

- **Severity:** P3
- **Where:** `src/pages.tsx:256` (12 occurrences)
- **Pattern:** P63
- **Why it matters:** Without `scope`, a screen reader cannot say which column a cell belongs to, and the table degrades to a stream of numbers.
- **Fix:** Add `scope="col"` to column headers and `scope="row"` to row headers.
- **Evidence:** `<th className="th">File</th>`

### 3. Table header without `scope` — apps/fileguard

- **Severity:** P3
- **Where:** `src/pages.tsx:261` (11 occurrences)
- **Pattern:** P63
- **Why it matters:** Without `scope`, a screen reader cannot say which column a cell belongs to, and the table degrades to a stream of numbers.
- **Fix:** Add `scope="col"` to column headers and `scope="row"` to row headers.
- **Evidence:** `<th className="th">Name</th>`

## Per project

| Project | Kind | Files | Defects | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [projects/cbu-assignments/tenantcore](projects/cbu-assignments/tenantcore/) | react-spa | 21 | 6 | 0 | 0 | 0 | 6 |
| [apps/frontpage](apps/frontpage/) | react-spa | 28 | 4 | 0 | 0 | 0 | 4 |
| [apps/campusflow](apps/campusflow/) | react-spa | 6 | 2 | 0 | 0 | 0 | 2 |
| [apps/dependsecure](apps/dependsecure/) | react-spa | 6 | 2 | 0 | 0 | 0 | 2 |
| [apps/fileguard](apps/fileguard/) | react-spa | 6 | 2 | 0 | 0 | 0 | 2 |
| [apps/sentinelcore](apps/sentinelcore/) | react-spa | 6 | 2 | 0 | 0 | 0 | 2 |
| [.](./) | react-spa | 68 | 2 | 0 | 0 | 0 | 2 |
| [apps/pathwise](apps/pathwise/) | react-spa | 6 | 1 | 0 | 0 | 0 | 1 |
| [vocal-separator](vocal-separator/) | react-spa | 7 | 1 | 0 | 0 | 0 | 1 |
| [apps/authgate](apps/authgate/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [apps/chessscope](apps/chessscope/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/circuitlab-calc](apps/circuitlab-calc/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/classconnect](apps/classconnect/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/creadesk](apps/creadesk/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [apps/docsage](apps/docsage/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [apps/eduaccess](apps/eduaccess/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/learnbridge](apps/learnbridge/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/learnpulse](apps/learnpulse/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/openlearn-commons](apps/openlearn-commons/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/prepwise](apps/prepwise/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [apps/quizarena](apps/quizarena/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [apps/reachlearn](apps/reachlearn/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/secops-dash](apps/secops-dash/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [apps/sentinellog](apps/sentinellog/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/shopdeck](apps/shopdeck/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [apps/stockmate](apps/stockmate/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [apps/teachcraft](apps/teachcraft/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [apps/tessera](apps/tessera/) | react-spa | 25 | 0 | 0 | 0 | 0 | 0 |
| [apps/tutorspring](apps/tutorspring/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [company-platform](company-platform/) | next-app | 53 | 0 | 0 | 0 | 0 | 0 |
| [workniche](workniche/) | next-app | 49 | 0 | 0 | 0 | 0 | 0 |
| [projects/assetwatch](projects/assetwatch/) | react-spa | 11 | 0 | 0 | 0 | 0 | 0 |
| [projects/cyberaware-lab](projects/cyberaware-lab/) | react-spa | 9 | 0 | 0 | 0 | 0 | 0 |
| [projects/hashsight](projects/hashsight/) | react-spa | 10 | 0 | 0 | 0 | 0 | 0 |
| [projects/incidentflow](projects/incidentflow/) | react-spa | 9 | 0 | 0 | 0 | 0 | 0 |
| [projects/netscope](projects/netscope/) | react-spa | 8 | 0 | 0 | 0 | 0 | 0 |
| [projects/phishlens](projects/phishlens/) | react-spa | 9 | 0 | 0 | 0 | 0 | 0 |
| [projects/securecode-workbench](projects/securecode-workbench/) | react-spa | 9 | 0 | 0 | 0 | 0 | 0 |
| [projects/threatintel-desk](projects/threatintel-desk/) | react-spa | 8 | 0 | 0 | 0 | 0 | 0 |
| [projects/transcriptwise](projects/transcriptwise/) | react-spa | 25 | 0 | 0 | 0 | 0 | 0 |
| [projects/mysul/mwangala-portfolio](projects/mysul/mwangala-portfolio/) | react-spa | 48 | 0 | 0 | 0 | 0 | 0 |

## P0 · blocks the task or breaks for a whole user group (0)

None found from source.

## P1 · violates WCAG 2.2 AA or loses data (0)

None found from source.

## P2 · costs the user time or confidence (0)

None found from source.

## P3 · polish, consistency, or craft (22)

| Project | Where | Defect | Pattern | Evidence | Fix |
| --- | --- | --- | --- | --- | --- |
| apps/campusflow | `src/pages.tsx:134` | Table header without `scope` ×15 | P63 | <th className="th">Enrollment no.</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| apps/dependsecure | `src/pages.tsx:256` | Table header without `scope` ×12 | P63 | <th className="th">File</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| apps/fileguard | `src/pages.tsx:261` | Table header without `scope` ×11 | P63 | <th className="th">Name</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| apps/sentinelcore | `src/pages.tsx:128` | Table header without `scope` ×9 | P63 | <th className="th">Occurred</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| projects/cbu-assignments/tenantcore | `src/pages/SettingsPage.tsx:37` | Table header without `scope` ×6 | P63 | {tab === 'keys' && isAdmin && <div><div className="mb-5 flex justify-end"><Button onClick={() => setKeyOpen(true)}><Plus size={16} />Create API key</Button></d… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| projects/cbu-assignments/tenantcore | `src/pages/TasksPage.tsx:37` | Table header without `scope` ×6 | P63 | {query.isLoading ? <LoadingRows /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data && <><div className="table-w… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| . | `src/components/ux-engine/StateMatrixView.tsx:188` | Table header without `scope` ×5 | P63 | <th className="px-4 py-3">State</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| apps/pathwise | `src/pages.tsx:195` | Table header without `scope` ×5 | P63 | <th className="th">Skill</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| projects/cbu-assignments/tenantcore | `src/pages/MembersPage.tsx:34` | Table header without `scope` ×5 | P63 | {query.isLoading ? <LoadingRows /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data && <><div className="table-w… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| projects/cbu-assignments/tenantcore | `src/pages/ProjectsPage.tsx:38` | Table header without `scope` ×5 | P63 | <div className="table-wrap">{query.data.items.length ? <table className="table"><thead><tr><th>Project</th><th>Status</th><th>Created</th><th>Tenant binding</t… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| projects/cbu-assignments/tenantcore | `src/pages/PlatformPage.tsx:43` | Table header without `scope` ×4 | P63 | {tenants.isLoading ? <LoadingRows /> : tenants.error ? <ErrorState error={tenants.error} onRetry={() => tenants.refetch()} /> : tenants.data && <><div classNam… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| apps/dependsecure | `src/pages.tsx:272` | Numeric cell without tabular figures or right alignment ×3 | P63 | <td className="td">{m.package_count}</td> | Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`). |
| apps/frontpage | `src/components/Shell.tsx:46` | Icon-only control likely below the 24×24px minimum target ×3 | P42 | icon-btn menu-btn | Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+. |
| apps/frontpage | `src/components/Reader.tsx:70` | Icon-only control likely below the 24×24px minimum target ×2 | P42 | icon-btn | Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+. |
| . | `src/styles/apps.css:2` | More than five distinct literal border radii in one stylesheet | P72 | 9 values: 7px, 11px, 20px, 10px, 12px, 9px, 6px, 8px | Commit to a named scale in `:root` (2 · 4 · 8 · 12 · 16) and reference the tokens everywhere, so a new component picks a step instead of a number. |
| apps/campusflow | `src/pages.tsx:149` | Numeric cell without tabular figures or right alignment | P63 | <td className="td">{s.enrolled_sections.length}</td> | Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`). |
| apps/fileguard | `src/pages.tsx:364` | Numeric cell without tabular figures or right alignment | P63 | <td className="td">{b.entry_count}</td> | Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`). |
| apps/frontpage | `src/components/common.tsx:126` | Icon-only control likely below the 24×24px minimum target | P42 | icon-btn dialog-close | Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+. |
| apps/frontpage | `src/components/Sidebar.tsx:51` | Icon-only control likely below the 24×24px minimum target | P42 | icon-btn drawer-close | Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+. |
| apps/sentinelcore | `src/pages.tsx:530` | Numeric cell without tabular figures or right alignment | P63 | <td className="td whitespace-nowrap text-slate-400">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td> | Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`). |
| projects/cbu-assignments/tenantcore | `src/components/Layout.tsx:25` | Raw colour literal in a component class list | P69 | return <div className="min-h-screen bg-[#f5f7fb]"> | Use the semantic token (`bg-surface`, `text-ink-muted`) or a theme value, not `bg-[#…]`. |
| vocal-separator | `src/styles.css:112` | More than five distinct literal border radii in one stylesheet | P72 | 10 values: 15px, 999px, 12px, 10px, 16px, 20px, 14px, 18px | Commit to a named scale in `:root` (2 · 4 · 8 · 12 · 16) and reference the tokens everywhere, so a new component picks a step instead of a number. |

## By pattern

| Pattern | Defects |
| --- | --- |
| P63 | 15 |
| P42 | 4 |
| P72 | 2 |
| P69 | 1 |

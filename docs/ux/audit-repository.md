# UX audit · repository

41 projects · 22 defects across 99 occurrences · 0 P0 · 0 P1 · 0 P2 · 22 P3

Produced by the Northstar UX Engine from source analysis. Every finding names a file and a line;
nothing here was observed in a browser, and no screenshot is implied. Checks that need rendering
are listed under “Not checked” in the project docs.

## Top three

### 1. Table header without `scope` — companies/tamuzi/campusflow

- **Severity:** P3
- **Where:** `src/pages.tsx:134` (15 occurrences)
- **Pattern:** P63
- **Why it matters:** Without `scope`, a screen reader cannot say which column a cell belongs to, and the table degrades to a stream of numbers.
- **Fix:** Add `scope="col"` to column headers and `scope="row"` to row headers.
- **Evidence:** `<th className="th">Enrollment no.</th>`

### 2. Table header without `scope` — companies/velaqori/dependsecure

- **Severity:** P3
- **Where:** `src/pages.tsx:256` (12 occurrences)
- **Pattern:** P63
- **Why it matters:** Without `scope`, a screen reader cannot say which column a cell belongs to, and the table degrades to a stream of numbers.
- **Fix:** Add `scope="col"` to column headers and `scope="row"` to row headers.
- **Evidence:** `<th className="th">File</th>`

### 3. Table header without `scope` — companies/velaqori/fileguard

- **Severity:** P3
- **Where:** `src/pages.tsx:261` (11 occurrences)
- **Pattern:** P63
- **Why it matters:** Without `scope`, a screen reader cannot say which column a cell belongs to, and the table degrades to a stream of numbers.
- **Fix:** Add `scope="col"` to column headers and `scope="row"` to row headers.
- **Evidence:** `<th className="th">Name</th>`

## Per project

| Project | Kind | Files | Defects | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [coursework/cbu-assignments/tenantcore](coursework/cbu-assignments/tenantcore/) | react-spa | 21 | 6 | 0 | 0 | 0 | 6 |
| [companies/velaqori/frontpage](companies/velaqori/frontpage/) | react-spa | 28 | 4 | 0 | 0 | 0 | 4 |
| [companies/tamuzi/campusflow](companies/tamuzi/campusflow/) | react-spa | 6 | 2 | 0 | 0 | 0 | 2 |
| [companies/velaqori/dependsecure](companies/velaqori/dependsecure/) | react-spa | 6 | 2 | 0 | 0 | 0 | 2 |
| [companies/velaqori/fileguard](companies/velaqori/fileguard/) | react-spa | 6 | 2 | 0 | 0 | 0 | 2 |
| [companies/velaqori/sentinelcore](companies/velaqori/sentinelcore/) | react-spa | 6 | 2 | 0 | 0 | 0 | 2 |
| [.](./) | react-spa | 68 | 2 | 0 | 0 | 0 | 2 |
| [companies/tamuzi/pathwise](companies/tamuzi/pathwise/) | react-spa | 6 | 1 | 0 | 0 | 0 | 1 |
| [vocal-separator](vocal-separator/) | react-spa | 7 | 1 | 0 | 0 | 0 | 1 |
| [companies/velaqori/authgate](companies/velaqori/authgate/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/chessscope](companies/velaqori/chessscope/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/circuitlab-calc](companies/velaqori/circuitlab-calc/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/classconnect](companies/tamuzi/classconnect/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/creadesk](companies/velaqori/creadesk/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/docsage](companies/velaqori/docsage/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/eduaccess](companies/tamuzi/eduaccess/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/learnbridge](companies/tamuzi/learnbridge/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/learnpulse](companies/tamuzi/learnpulse/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/openlearn-commons](companies/tamuzi/openlearn-commons/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/prepwise](companies/tamuzi/prepwise/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/quizarena](companies/tamuzi/quizarena/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/reachlearn](companies/tamuzi/reachlearn/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/secops-dash](companies/velaqori/secops-dash/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/sentinellog](companies/velaqori/sentinellog/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/shopdeck](companies/velaqori/shopdeck/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/stockmate](companies/velaqori/stockmate/) | server-rendered | 1 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/teachcraft](companies/tamuzi/teachcraft/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/tessera](companies/tamuzi/tessera/) | react-spa | 25 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/tutorspring](companies/tamuzi/tutorspring/) | react-spa | 6 | 0 | 0 | 0 | 0 | 0 |
| [company-platform](company-platform/) | next-app | 53 | 0 | 0 | 0 | 0 | 0 |
| [workniche](workniche/) | next-app | 49 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/assetwatch](companies/velaqori/assetwatch/) | react-spa | 11 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/cyberaware-lab](companies/tamuzi/cyberaware-lab/) | react-spa | 9 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/hashsight](companies/velaqori/hashsight/) | react-spa | 10 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/incidentflow](companies/velaqori/incidentflow/) | react-spa | 9 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/netscope](companies/velaqori/netscope/) | react-spa | 8 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/phishlens](companies/velaqori/phishlens/) | react-spa | 9 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/securecode-workbench](companies/velaqori/securecode-workbench/) | react-spa | 9 | 0 | 0 | 0 | 0 | 0 |
| [companies/velaqori/threatintel-desk](companies/velaqori/threatintel-desk/) | react-spa | 8 | 0 | 0 | 0 | 0 | 0 |
| [companies/tamuzi/transcriptwise](companies/tamuzi/transcriptwise/) | react-spa | 25 | 0 | 0 | 0 | 0 | 0 |
| [sites/portfolio](sites/portfolio/) | react-spa | 48 | 0 | 0 | 0 | 0 | 0 |

## P0 · blocks the task or breaks for a whole user group (0)

None found from source.

## P1 · violates WCAG 2.2 AA or loses data (0)

None found from source.

## P2 · costs the user time or confidence (0)

None found from source.

## P3 · polish, consistency, or craft (22)

| Project | Where | Defect | Pattern | Evidence | Fix |
| --- | --- | --- | --- | --- | --- |
| companies/tamuzi/campusflow | `src/pages.tsx:134` | Table header without `scope` ×15 | P63 | <th className="th">Enrollment no.</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| companies/velaqori/dependsecure | `src/pages.tsx:256` | Table header without `scope` ×12 | P63 | <th className="th">File</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| companies/velaqori/fileguard | `src/pages.tsx:261` | Table header without `scope` ×11 | P63 | <th className="th">Name</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| companies/velaqori/sentinelcore | `src/pages.tsx:128` | Table header without `scope` ×9 | P63 | <th className="th">Occurred</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| coursework/cbu-assignments/tenantcore | `src/pages/SettingsPage.tsx:37` | Table header without `scope` ×6 | P63 | {tab === 'keys' && isAdmin && <div><div className="mb-5 flex justify-end"><Button onClick={() => setKeyOpen(true)}><Plus size={16} />Create API key</Button></d… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| coursework/cbu-assignments/tenantcore | `src/pages/TasksPage.tsx:37` | Table header without `scope` ×6 | P63 | {query.isLoading ? <LoadingRows /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data && <><div className="table-w… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| . | `src/components/ux-engine/StateMatrixView.tsx:188` | Table header without `scope` ×5 | P63 | <th className="px-4 py-3">State</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| companies/tamuzi/pathwise | `src/pages.tsx:195` | Table header without `scope` ×5 | P63 | <th className="th">Skill</th> | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| coursework/cbu-assignments/tenantcore | `src/pages/MembersPage.tsx:34` | Table header without `scope` ×5 | P63 | {query.isLoading ? <LoadingRows /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data && <><div className="table-w… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| coursework/cbu-assignments/tenantcore | `src/pages/ProjectsPage.tsx:38` | Table header without `scope` ×5 | P63 | <div className="table-wrap">{query.data.items.length ? <table className="table"><thead><tr><th>Project</th><th>Status</th><th>Created</th><th>Tenant binding</t… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| coursework/cbu-assignments/tenantcore | `src/pages/PlatformPage.tsx:43` | Table header without `scope` ×4 | P63 | {tenants.isLoading ? <LoadingRows /> : tenants.error ? <ErrorState error={tenants.error} onRetry={() => tenants.refetch()} /> : tenants.data && <><div classNam… | Add `scope="col"` to column headers and `scope="row"` to row headers. |
| companies/velaqori/dependsecure | `src/pages.tsx:272` | Numeric cell without tabular figures or right alignment ×3 | P63 | <td className="td">{m.package_count}</td> | Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`). |
| companies/velaqori/frontpage | `src/components/Shell.tsx:46` | Icon-only control likely below the 24×24px minimum target ×3 | P42 | icon-btn menu-btn | Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+. |
| companies/velaqori/frontpage | `src/components/Reader.tsx:70` | Icon-only control likely below the 24×24px minimum target ×2 | P42 | icon-btn | Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+. |
| . | `src/styles/apps.css:2` | More than five distinct literal border radii in one stylesheet | P72 | 9 values: 7px, 11px, 20px, 10px, 12px, 9px, 6px, 8px | Commit to a named scale in `:root` (2 · 4 · 8 · 12 · 16) and reference the tokens everywhere, so a new component picks a step instead of a number. |
| companies/tamuzi/campusflow | `src/pages.tsx:149` | Numeric cell without tabular figures or right alignment | P63 | <td className="td">{s.enrolled_sections.length}</td> | Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`). |
| companies/velaqori/fileguard | `src/pages.tsx:364` | Numeric cell without tabular figures or right alignment | P63 | <td className="td">{b.entry_count}</td> | Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`). |
| companies/velaqori/frontpage | `src/components/common.tsx:126` | Icon-only control likely below the 24×24px minimum target | P42 | icon-btn dialog-close | Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+. |
| companies/velaqori/frontpage | `src/components/Sidebar.tsx:51` | Icon-only control likely below the 24×24px minimum target | P42 | icon-btn drawer-close | Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+. |
| companies/velaqori/sentinelcore | `src/pages.tsx:530` | Numeric cell without tabular figures or right alignment | P63 | <td className="td whitespace-nowrap text-slate-400">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td> | Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`). |
| coursework/cbu-assignments/tenantcore | `src/components/Layout.tsx:25` | Raw colour literal in a component class list | P69 | return <div className="min-h-screen bg-[#f5f7fb]"> | Use the semantic token (`bg-surface`, `text-ink-muted`) or a theme value, not `bg-[#…]`. |
| vocal-separator | `src/styles.css:112` | More than five distinct literal border radii in one stylesheet | P72 | 10 values: 15px, 999px, 12px, 10px, 16px, 20px, 14px, 18px | Commit to a named scale in `:root` (2 · 4 · 8 · 12 · 16) and reference the tokens everywhere, so a new component picks a step instead of a number. |

## By pattern

| Pattern | Defects |
| --- | --- |
| P63 | 15 |
| P42 | 4 |
| P72 | 2 |
| P69 | 1 |

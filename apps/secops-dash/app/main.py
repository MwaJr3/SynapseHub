"""FastAPI triage dashboard: offline events, incidents, playbooks, provenance."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.ingest import load_events
from app.triage import build_incident

app = FastAPI(title="SecOps Dash", docs_url=None, redoc_url=None)

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>{title} · SecOps Dash</title>
<style>body{{font-family:ui-monospace,monospace;max-width:56rem;margin:2rem auto;padding:0 1rem;color:#1b2430}}
a{{color:#0f4c75}}table{{width:100%;border-collapse:collapse}}td,th{{border:1px solid #cfd8e3;padding:.45rem;text-align:left}}
button,input,select{{padding:.5rem;border:1px solid #9db2c7;border-radius:6px}}button{{background:#0f4c75;color:#fff;border:0;cursor:pointer}}
.sev{{padding:.15rem .5rem;border-radius:4px;font-size:.8rem}}.s5{{background:#f8d7da}}.s4{{background:#ffe5cc}}.s3{{background:#fff3cd}}.s2{{background:#e2f0d9}}.s1{{background:#e9ecef}}
.note{{background:#eef3f8;padding:.6rem;border-radius:6px;font-size:.85rem}}</style>
</head><body><header><strong><a href="/" style="color:#1b2430;text-decoration:none">SecOps Dash</a></strong> · offline triage console (simulated data)</header>
<main>{body}</main><footer style="margin-top:2.5rem;font-size:.8rem;color:#5c6b7a">Offline-first triage from local fixture data. Playbooks are manual
runbook steps — this tool does not contain or remediate anything. Findings are discussion starting points, not proof. Timestamps reflect collection
time only (integrity since collection).</footer></body></html>"""


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(PAGE.format(title=title, body=body))


STATE = {"events": [], "rejected": [], "incidents": [], "assets": {}}


def _load() -> None:
    if not STATE["events"]:
        STATE["events"], STATE["rejected"] = load_events("data/events.json")
        STATE["assets"] = {a["asset"]: a["criticality"]
                           for a in json.loads(Path("data/assets.json").read_text())["assets"]}


@app.get("/", response_class=HTMLResponse)
async def index():
    _load()
    rows = "".join(
        f"<tr><td>{e.event_id}</td><td>{e.asset}</td><td>{e.category}</td>"
        f"<td><span class='sev s{e.severity}'>S{e.severity}</span></td><td>{e.summary}</td>"
        f"<td>{e.collected_at[:19]}</td></tr>" for e in STATE["events"])
    rejected = "".join(f"<li>#{r['index']}: {'; '.join(r['reasons'])}</li>" for r in STATE["rejected"]) or "<li>none</li>"
    body = ("<div class='note'>Simulated security events from local fixtures. No live telemetry is collected; "
            "this is an offline triage training surface.</div>")
    body += f"<h1>Events ({len(STATE['events'])})</h1><table><tr><th>id</th><th>asset</th><th>category</th><th>sev</th><th>summary</th><th>collected at</th></tr>{rows}</table>"
    body += f"<h2>Ingest validation</h2><p>Rejected rows (with reasons, never silently dropped):</p><ul>{rejected}</ul>"
    body += ("<h2>Open an incident</h2><form method='post' action='/incident/new'>"
             "<input name='event_ids' placeholder='event ids, comma-separated' required>"
             "<input name='analyst' placeholder='analyst name' required><button>Create incident</button></form>"
             "<p><a href='/incidents'>Incidents</a> · <a href='/provenance'>Data provenance</a></p>")
    return page("events", body)


@app.post("/incident/new")
async def new_incident(request: Request):
    _load()
    form = await request.form()
    ids = [x.strip() for x in str(form.get("event_ids", "")).split(",") if x.strip()]
    selected = [e for e in STATE["events"] if e.event_id in ids]
    if not selected:
        resp = page("error", "<p>No matching events; incident not created.</p><p><a href='/'>Back</a></p>")
        resp.status_code = 422
        return resp
    dicts = [{"event_id": e.event_id, "asset": e.asset, "category": e.category,
              "severity": e.severity, "summary": e.summary, "collected_at": e.collected_at}
             for e in selected]
    incident = build_incident(f"INC-{len(STATE['incidents']) + 1:03d}", dicts, STATE["assets"])
    incident.timeline.insert(0, {"at": dicts[0]["collected_at"], "event_id": "—",
                                 "summary": f"Incident opened by {str(form.get('analyst', 'analyst'))}", "severity": 0})
    STATE["incidents"].append(incident)
    return RedirectResponse(f"/incident/{incident.incident_id}", status_code=303)


@app.get("/incidents", response_class=HTMLResponse)
async def incidents():
    _load()
    rows = "".join(f"<tr><td><a href='/incident/{i.incident_id}'>{i.incident_id}</a></td><td>{i.score}</td>"
                   f"<td>{', '.join(i.assets)}</td><td>{', '.join(i.categories)}</td><td>{i.status}</td></tr>"
                   for i in STATE["incidents"]) or "<tr><td colspan=5>no incidents</td></tr>"
    return page("incidents", f"<h1>Incidents</h1><table><tr><th>id</th><th>score</th><th>assets</th><th>categories</th><th>status</th></tr>{rows}</table>")


@app.get("/incident/{incident_id}", response_class=HTMLResponse)
async def incident_page(incident_id: str):
    _load()
    incident = next((i for i in STATE["incidents"] if i.incident_id == incident_id), None)
    if incident is None:
        return page("incident", "<p>Not found.</p>"), 404
    timeline = "".join(f"<tr><td>{t['at'][:19]}</td><td>{t['event_id']}</td><td>{t['summary']}</td></tr>"
                       for t in incident.timeline)
    body = (f"<h1>{incident.incident_id} <span class='sev s3'>score {incident.score}</span></h1>"
            f"<p>status: <strong>{incident.status}</strong> · assets: {', '.join(incident.assets)} · "
            f"categories: {', '.join(incident.categories)}</p>"
            f"<p class='note'>Score = Σ severity × (1 + criticality weight). Criticality from the local asset inventory.</p>")
    body += "<h2>Timeline (collection timestamps)</h2><table><tr><th>at</th><th>event</th><th>summary</th></tr>" + timeline + "</table>"
    body += ("<h2>Response playbook (manual runbook)</h2><ol>" +
             "".join(f"<li>{step}</li>" for step in incident.playbook) + "</ol>"
             "<p class='note'>Playbook steps are manual. This dashboard performs no containment or remediation.</p>")
    body += ("<h2>Advance status (human decision)</h2><p>" +
             "".join(f"<form style='display:inline' method='post' action='/incident/{incident_id}/status'>"
                     f"<input type='hidden' name='status' value='{st}'><button>{st}</button></form> "
                     for st in ("triaged", "contained", "closed")) + "</p>")
    body += f"<p><a href='/incident/{incident_id}/export'>Export JSON</a> · <a href='/incidents'>Back</a></p>"
    return page(incident_id, body)


@app.post("/incident/{incident_id}/status")
async def set_status(incident_id: str, request: Request):
    _load()
    incident = next((i for i in STATE["incidents"] if i.incident_id == incident_id), None)
    form = await request.form()
    if incident is None:
        return page("error", "<p>Not found.</p>"), 404
    target = str(form.get("status", ""))
    allowed = {"new": {"triaged"}, "triaged": {"contained"}, "contained": {"closed"}}
    if target not in allowed.get(incident.status, set()):
        resp = page("error", f"<p>Illegal status change {incident.status} -> {target} "
                             f"(allowed: {sorted(allowed.get(incident.status, set())) or 'none'}). "
                             "Status changes are human decisions.</p>")
        resp.status_code = 409
        return resp
    incident.status = target
    return RedirectResponse(f"/incident/{incident_id}", status_code=303)


@app.get("/incident/{incident_id}/export")
async def export(incident_id: str):
    _load()
    incident = next((i for i in STATE["incidents"] if i.incident_id == incident_id), None)
    if incident is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return JSONResponse({
        "incident_id": incident.incident_id, "score": incident.score, "status": incident.status,
        "assets": incident.assets, "event_ids": incident.event_ids,
        "categories": incident.categories, "playbook": incident.playbook,
        "timeline": incident.timeline,
        "integrity_note": "Timestamps reflect collection time only; integrity since collection is NOT proof of chronology."})


@app.get("/provenance", response_class=HTMLResponse)
async def provenance():
    _load()
    files = sorted({e.source_file for e in STATE["events"]})
    body = "<h1>Data provenance</h1><ul>"
    for f in files:
        n = sum(1 for e in STATE["events"] if e.source_file == f)
        body += f"<li><code>{f}</code> — {n} events (simulated fixtures)</li>"
    body += "</ul><p class='note'>All events come from local fixture files. Collected-at timestamps are set at ingest. "
    body += "Integrity since collection only — not proof of chronology.</p>"
    return page("provenance", body)


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "secops-dash"}

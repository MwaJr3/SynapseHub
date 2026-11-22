"""FastAPI dashboard: register/login (MFA-ready), role-based admin page."""
from __future__ import annotations

import base64
import hmac
import time

import pyotp
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.passwords import check_password
from app.security import RateLimiter, security_headers
from app.store import Store, verify_password

app = FastAPI(title="AuthGate", docs_url=None, redoc_url=None)
store = Store("authgate.db")
login_limiter = RateLimiter(max_per_window=10, window_seconds=60)

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>{title} · AuthGate</title>
<style>
label{{display:block;margin:.35rem 0;font-size:.9rem}}label>input,label>select,label>textarea{{display:block;width:100%;margin-top:.15rem;box-sizing:border-box}}
:focus-visible{{outline:2px solid #14213d;outline-offset:2px}}
body{{font-family:system-ui,sans-serif;max-width:44rem;margin:2rem auto;padding:0 1rem;color:#14213d}}
form{{display:grid;gap:.6rem;max-width:22rem}}input,button{{padding:.55rem;border:1px solid #b8c1ec;border-radius:6px}}
button{{background:#14213d;color:#fff;border:0;cursor:pointer}}.err{{color:#c1121f}}.ok{{color:#2a9d8f}}
table{{width:100%;border-collapse:collapse}}td,th{{border:1px solid #dfe7ff;padding:.45rem;text-align:left}}
.flash{{background:#fff3cd;padding:.6rem;border-radius:6px}}code{{background:#f1f3f9;padding:.15rem .35rem;border-radius:4px}}</style>
</head><body><header><strong><a href="/" style="color:#14213d;text-decoration:none">AuthGate</a></strong>
 · demo dashboard</header><main>{body}</main>
<footer style="margin-top:2rem;font-size:.85rem;color:#5c6473">Security headers (CSP, frame deny, nosniff, no-referrer)
are set on every response. Passwords are stored as PBKDF2-SHA256 ({iters} iterations) with per-user salts.
Generic login errors avoid username enumeration. HSTS requires HTTPS — see README.</footer></body></html>"""


def page(title: str, body: str) -> HTMLResponse:
    html = PAGE.format(title=title, body=body, iters="200,000")
    return HTMLResponse(html, headers=security_headers())


@app.middleware("http")
async def add_headers(request: Request, call_next):
    response = await call_next(request)
    for k, v in security_headers().items():
        response.headers.setdefault(k, v)
    return response


def _current(request: Request):
    token = request.cookies.get("ag_session", "")
    session = store.get_session(token) if token else None
    if session is None:
        return None, None, token
    user = store.conn.execute("SELECT * FROM users WHERE id=?", (session["user_id"],)).fetchone()
    return user, session, token


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    user, session, _ = _current(request)
    if user is None:
        return page("home", "<h1>AuthGate</h1><p>Authentication &amp; authorization demo.</p>"
                    "<p><a href='/login'>Sign in</a> · <a href='/register'>Register</a> · <a href='/api/health'>/api/health</a></p>")
    admin = " · <a href='/admin'>Admin</a>" if user["role"] == "admin" else ""
    return page("home", f"<h1>Hello, {user['username']}</h1><p>Role: <code>{user['role']}</code>{admin}</p>"
                "<p><a href='/profile'>Profile &amp; MFA</a> · <a href='/logout'>Sign out</a></p>")


@app.get("/register", response_class=HTMLResponse)
async def register_form(request: Request):
    return page("register", "<h1>Register</h1><form method='post' action='/register'>"
                "<label>Username<input name='username' placeholder='username' required></label>"
                "<label>Password<input name='password' type='password' autocomplete='current-password' placeholder='password' required></label>"
                "<input name='csrf' type='hidden' value='" + request.cookies.get("ag_anon", "") + "'>"
                "<button>Create account</button></form>"
                "<p>Policy: ≥12 chars with upper, lower, digit, symbol; no username reuse; no bundled common passwords.</p>")


@app.post("/register")
async def register(request: Request):
    form = await request.form()
    username = str(form.get("username", "")).strip()
    password = str(form.get("password", ""))
    problems = check_password(password, username)
    if not username or len(username) < 3:
        problems.append("username must be at least 3 characters")
    if problems:
        return page("register", f"<p class='err'>Rejected: {'; '.join(problems)}</p><p><a href='/register'>Try again</a></p>")
    if store.get_user(username):
        return page("register", "<p class='err'>Registration failed.</p><p><a href='/register'>Try again</a></p>")
    store.create_user(username, password, role="user")
    return page("registered", f"<p class='ok'>Account created.</p><p><a href='/login'>Sign in</a></p>")


@app.get("/login", response_class=HTMLResponse)
async def login_form():
    return page("login", "<h1>Sign in</h1><form method='post' action='/login'>"
                "<label>Username<input name='username' placeholder='username' required></label>"
                "<label>Password<input name='password' type='password' autocomplete='current-password' placeholder='password' required></label>"
                "<label>MFA code<input name='otp' autocomplete='one-time-code' inputmode='numeric' placeholder='MFA code (if enabled)'></label>"
                "<button>Sign in</button></form>")


@app.post("/login")
async def login(request: Request):
    form = await request.form()
    username = str(form.get("username", "")).strip()
    password = str(form.get("password", ""))
    otp = str(form.get("otp", "")).strip()
    ip = request.client.host if request.client else "unknown"
    if not login_limiter.allow(f"ip:{ip}") or not login_limiter.allow(f"user:{username}"):
        limited = page("login", "<p class='err'>Too many attempts. Try again later.</p>")
        limited.status_code = 429
        return limited
    # Generic failure message regardless of which factor failed (no enumeration).
    failure = page("login", "<p class='err'>Sign-in failed.</p><p><a href='/login'>Try again</a></p>")
    if store.is_locked(username):
        return failure
    user = store.get_user(username)
    if user is None or not verify_password(password, user["password_hash"], user["salt"]):
        store.register_failed(username)
        return failure
    if user["mfa_secret"]:
        try:
            if not pyotp.TOTP(user["mfa_secret"]).verify(otp, valid_window=1):
                store.register_failed(username)
                return failure
        except Exception:
            store.register_failed(username)
            return failure
    store.clear_failures(username)
    session = store.create_session(user["id"], ip=ip)
    response = RedirectResponse("/", status_code=303)
    response.set_cookie("ag_session", session["token"], httponly=True, samesite="lax", max_age=3600)
    return response


@app.get("/logout")
async def logout(request: Request):
    _, _, token = _current(request)
    if token:
        store.drop_session(token)
    response = RedirectResponse("/", status_code=303)
    response.delete_cookie("ag_session")
    return response


@app.get("/profile", response_class=HTMLResponse)
async def profile(request: Request):
    user, session, _ = _current(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)
    mfa = "enabled" if user["mfa_secret"] else "not enabled"
    body = f"<h1>Profile</h1><p>User: <code>{user['username']}</code> · role <code>{user['role']}</code> · MFA: {mfa}</p>"
    if not user["mfa_secret"]:
        secret = pyotp.random_base32()
        body += ("<h2>Enable TOTP MFA</h2><p>Secret (demo): <code>" + secret + "</code></p>"
                 "<form method='post' action='/mfa/enable'><label>Shared secret<input name='secret' value='" + secret + "' readonly></label>"
                 "<label>Code<input name='code' placeholder='6-digit code' required></label><button>Enable MFA</button></form>")
    else:
        body += "<form method='post' action='/mfa/disable'><label>Code<input name='code' placeholder='6-digit code' required></label><button>Disable MFA</button></form>"
    body += "<p><a href='/'>Home</a></p>"
    return page("profile", body)


@app.post("/mfa/enable")
async def mfa_enable(request: Request):
    user, _, _ = _current(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)
    form = await request.form()
    secret = str(form.get("secret", ""))
    code = str(form.get("code", ""))
    if pyotp.TOTP(secret).verify(code, valid_window=1):
        store.conn.execute("UPDATE users SET mfa_secret=? WHERE id=?", (secret, user["id"]))
        store.conn.commit()
        return page("profile", "<p class='ok'>MFA enabled.</p><p><a href='/profile'>Back</a></p>")
    return page("profile", "<p class='err'>Invalid code; MFA not enabled.</p><p><a href='/profile'>Back</a></p>")


@app.post("/mfa/disable")
async def mfa_disable(request: Request):
    user, _, _ = _current(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)
    form = await request.form()
    code = str(form.get("code", ""))
    if user["mfa_secret"] and pyotp.TOTP(user["mfa_secret"]).verify(code, valid_window=1):
        store.conn.execute("UPDATE users SET mfa_secret='' WHERE id=?", (user["id"]))
        store.conn.commit()
        return page("profile", "<p class='ok'>MFA disabled.</p><p><a href='/profile'>Back</a></p>")
    return page("profile", "<p class='err'>Invalid code; MFA unchanged.</p><p><a href='/profile'>Back</a></p>")


@app.get("/admin", response_class=HTMLResponse)
async def admin(request: Request):
    user, session, _ = _current(request)
    if user is None:
        return RedirectResponse("/login", status_code=303)
    if user["role"] != "admin":
        return JSONResponse({"error": "forbidden"}, status_code=403, headers=security_headers())
    rows = store.conn.execute("SELECT username, role, failed_attempts, locked_until, created_at FROM users ORDER BY username").fetchall()
    trs = "".join(f"<tr><td>{r['username']}</td><td>{r['role']}</td><td>{r['failed_attempts']}</td><td>{r['locked_until'] or '—'}</td></tr>" for r in rows)
    return page("admin", f"<h1>Admin</h1><p>Role-based access: this page requires <code>admin</code>.</p>"
                f"<table><tr><th scope='col'>user</th><th scope='col'>role</th><th scope='col'>failed</th><th scope='col'>locked until</th></tr>{trs}</table>")


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "authgate", "note": "Demo service. Configure your own users and secrets."}

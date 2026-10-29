"""Contact-form delivery endpoint.

Runs as a Vercel Python serverless function at ``POST /api/contact``. The browser
form posts here when ``VITE_CONTACT_ENDPOINT`` is set to ``/api/contact``.

Design notes
------------
* **Recipients are fixed server-side.** The two inboxes are read from
  ``CONTACT_TO`` (comma-separated) or default to the nominated addresses below.
  A visitor can never redirect a message to an arbitrary address, so this
  endpoint cannot be turned into an open relay.
* **Two transports, chosen by environment.** ``RESEND_API_KEY`` sends through
  Resend's HTTPS API; otherwise ``SMTP_HOST``/``SMTP_PORT``/``SMTP_USER``/
  ``SMTP_PASSWORD`` send over SMTP. With neither configured the function returns
  ``503 not_configured`` and the frontend falls back to the honest mailto
  hand-off — it never claims a delivery it did not make.
* **Standard library only.** No third-party imports means nothing to install in
  the function bundle and nothing to keep patched.
* **Limits, not promises.** Payload size, field lengths and a honeypot are
  enforced here. Real rate limiting belongs at the edge/host level and is
  documented as a limitation rather than pretended.
"""

from __future__ import annotations

import json
import os
import re
import smtplib
import ssl
import urllib.error
import urllib.request
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler

MAX_BODY_BYTES = 16_000
MAX_NAME = 120
MAX_EMAIL = 254
MAX_SUBJECT = 200
MAX_MESSAGE = 5_000
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

DEFAULT_RECIPIENTS = ("mwangalamackjrv2@gmail.com", "mackjrv2@gmail.com")


def recipients() -> list[str]:
    raw = os.environ.get("CONTACT_TO", "").strip()
    if not raw:
        return list(DEFAULT_RECIPIENTS)
    parsed = [value.strip() for value in raw.split(",") if value.strip()]
    valid = [value for value in parsed if EMAIL_RE.match(value)]
    return valid or list(DEFAULT_RECIPIENTS)


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.end_headers()
    handler.wfile.write(body)


def validate(data: dict) -> tuple[dict | None, str | None]:
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    subject = str(data.get("subject", "")).strip()
    message = str(data.get("message", "")).strip()
    honeypot = str(data.get("honeypot", "")).strip()

    if honeypot:
        return None, "spam_detected"
    if not name or len(name) > MAX_NAME:
        return None, "invalid_name"
    if not email or len(email) > MAX_EMAIL or not EMAIL_RE.match(email):
        return None, "invalid_email"
    if not subject or len(subject) > MAX_SUBJECT:
        return None, "invalid_subject"
    if not message or len(message) > MAX_MESSAGE:
        return None, "invalid_message"
    return {"name": name, "email": email, "subject": subject, "message": message}, None


def build_message(fields: dict) -> EmailMessage:
    to = recipients()
    sender = os.environ.get("CONTACT_FROM", "").strip() or to[0]
    message = EmailMessage()
    message["From"] = f"Website enquiry <{sender}>"
    message["To"] = ", ".join(to)
    message["Reply-To"] = f"{fields['name']} <{fields['email']}>"
    message["Subject"] = f"[Website] {fields['subject']}"
    message.set_content(
        "{name} <{email}> wrote:\n\n{body}\n\n--\nSent from the company website contact form.".format(
            name=fields["name"], email=fields["email"], body=fields["message"]
        )
    )
    return message


def send_via_resend(fields: dict) -> str | None:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        return None
    to = recipients()
    sender = os.environ.get("CONTACT_FROM", "").strip()
    if not sender:
        raise RuntimeError("CONTACT_FROM must be set when using RESEND_API_KEY")
    payload = json.dumps(
        {
            "from": sender,
            "to": to,
            "reply_to": fields["email"],
            "subject": f"[Website] {fields['subject']}",
            "text": "{} <{}> wrote:\n\n{}\n\n--\nSent from the company website contact form.".format(
                fields["name"], fields["email"], fields["message"]
            ),
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:  # noqa: S310 - fixed https host
        if not 200 <= response.status < 300:
            raise RuntimeError(f"resend responded {response.status}")
    return "resend"


def send_via_smtp(fields: dict) -> str | None:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        return None
    port = int(os.environ.get("SMTP_PORT", "465") or 465)
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "")
    message = build_message(fields)

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=20, context=context) as client:
            if user:
                client.login(user, password)
            client.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=20) as client:
            client.starttls(context=context)
            if user:
                client.login(user, password)
            client.send_message(message)
    return "smtp"


class handler(BaseHTTPRequestHandler):
    """Vercel serverless entry point."""

    server_version = "SynapseHubContact/1.0"

    def log_message(self, format: str, *args) -> None:  # noqa: A002 - stdlib signature
        # Keep request logs free of message bodies and addresses.
        super().log_message("%s", format % args)

    def do_GET(self) -> None:
        json_response(
            self,
            200,
            {
                "service": "contact",
                "method": "POST",
                "configured": bool(
                    os.environ.get("RESEND_API_KEY") or os.environ.get("SMTP_HOST")
                ),
                "note": "Send JSON {name,email,subject,message}. Recipients are fixed server-side.",
            },
        )

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            json_response(self, 400, {"ok": False, "error": "bad_content_length"})
            return

        if length <= 0 or length > MAX_BODY_BYTES:
            json_response(self, 413, {"ok": False, "error": "payload_too_large"})
            return

        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("body must be an object")
        except (ValueError, UnicodeDecodeError):
            json_response(self, 400, {"ok": False, "error": "invalid_json"})
            return

        fields, error = validate(data)
        if error == "spam_detected":
            # Answer 200 so scripted spam does not learn it was filtered.
            json_response(self, 200, {"ok": True, "delivered": False})
            return
        if error or fields is None:
            json_response(self, 400, {"ok": False, "error": error})
            return

        try:
            provider = send_via_resend(fields) or send_via_smtp(fields)
        except Exception:  # noqa: BLE001 - never leak provider internals to the browser
            json_response(self, 502, {"ok": False, "error": "delivery_failed"})
            return

        if provider is None:
            json_response(
                self,
                503,
                {
                    "ok": False,
                    "error": "not_configured",
                    "detail": "No email transport is configured on the server.",
                },
            )
            return

        json_response(self, 200, {"ok": True, "delivered": True, "provider": provider})

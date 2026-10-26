"""Synthetic feeds for tests and the offline demo. All publishers, people and articles are fictional."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from xml.sax.saxutils import escape


def rfc822(dt: datetime) -> str:
    return format_datetime(dt.astimezone(timezone.utc))


def now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def rss2(title: str, entries: list[dict], *, link: str = "https://example.test/", description: str = "A fictional test feed.") -> bytes:
    items = []
    for e in entries:
        parts = [f"<title>{e['title']}</title>"]
        if e.get("link"):
            parts.append(f"<link>{e['link']}</link>")
        if e.get("guid"):
            parts.append(f"<guid isPermaLink=\"false\">{e['guid']}</guid>")
        if e.get("date"):
            parts.append(f"<pubDate>{e['date']}</pubDate>")
        if e.get("author"):
            parts.append(f"<dc:creator>{e['author']}</dc:creator>")
        if e.get("description") is not None:
            parts.append(f"<description><![CDATA[{e['description']}]]></description>")
        if e.get("content"):
            parts.append(f"<content:encoded><![CDATA[{e['content']}]]></content:encoded>")
        if e.get("image"):
            parts.append(f'<media:thumbnail url="{e["image"]}"/>')
        items.append("<item>" + "".join(parts) + "</item>")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" '
        'xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">'
        f"<channel><title>{title}</title><link>{link}</link><description>{description}</description>"
        + "".join(items)
        + "</channel></rss>"
    ).encode("utf-8")


def atom(title: str, entries: list[dict], *, link: str = "https://example.test/") -> bytes:
    out = []
    for e in entries:
        content = f'<content type="html"><![CDATA[{e["content"]}]]></content>' if e.get("content") else ""
        summary = f'<summary><![CDATA[{e["summary"]}]]></summary>' if e.get("summary") else ""
        out.append(
            f"<entry><title>{e['title']}</title><id>{e.get('id', e.get('link', e['title']))}</id>"
            f'<link rel="alternate" type="text/html" href="{e.get("link", "")}"/>'
            f"<updated>{e.get('date', '')}</updated>"
            + (f"<published>{e['published']}</published>" if e.get("published") else "")
            + (f"<author><name>{e['author']}</name></author>" if e.get("author") else "")
            + summary + content + "</entry>"
        )
    return (
        '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom">'
        f'<title>{title}</title><subtitle>Atom test feed</subtitle><link rel="alternate" href="{link}"/>'
        f'<link rel="self" href="{link}atom.xml"/>' + "".join(out) + "</feed>"
    ).encode("utf-8")


def rdf(title: str, entries: list[dict]) -> bytes:
    items = "".join(
        f'<item rdf:about="{e["link"]}"><title>{e["title"]}</title><link>{e["link"]}</link>'
        f'<description>{e.get("description", "")}</description><dc:date>{e["date"]}</dc:date></item>'
        for e in entries
    )
    return (
        '<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" '
        'xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">'
        f"<channel><title>{title}</title><link>https://rdf.example.test/</link><description>RDF feed</description></channel>"
        + items + "</rdf:RDF>"
    ).encode("utf-8")


def generated_entries(source: str, count: int = 6, *, hours_apart: float = 5.0) -> list[dict]:
    base = now()
    slug = source.lower().replace(" ", "-").replace(".", "")
    return [
        {
            "title": f"{source}: fictional article {i + 1}",
            "link": f"https://{slug}.example.test/posts/{i + 1}",
            "guid": f"{slug}-{i + 1}",
            "date": rfc822(base - timedelta(hours=hours_apart * i + 1)),
            "author": "Fiction Writer",
            "description": f"A short fictional summary for article {i + 1} from {source}.",
            "content": f"<p>Fictional body for article {i + 1}. " + ("Lorem ipsum dolor sit amet. " * 40) + "</p><h2>Section</h2><pre><code>print('hello')</code></pre>",
        }
        for i in range(count)
    ]

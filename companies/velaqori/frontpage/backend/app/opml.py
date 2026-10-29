"""OPML import (tolerant) and export (category structure preserved)."""
from __future__ import annotations

from dataclasses import dataclass
from xml.sax.saxutils import quoteattr

from lxml import etree

from . import parser
from .models import Category, Feed


@dataclass
class OpmlEntry:
    url: str | None
    title: str
    category: str | None
    site_url: str | None = None
    problem: str | None = None


def _attr(node: etree._Element, *names: str) -> str:
    lowered = {k.lower(): v for k, v in node.attrib.items()}
    for name in names:
        value = lowered.get(name.lower())
        if value and value.strip():
            return value.strip()
    return ""


def parse_opml(data: bytes) -> list[OpmlEntry]:
    """Flatten nested outlines; attribute names are case-insensitive; ``type`` is optional."""
    text = parser.decode_bytes(data)
    text = parser._XML_DECL_TEXT.sub("", text, count=1)
    text = parser._fix_entities(text)
    xml = etree.XMLParser(recover=True, resolve_entities=False, no_network=True)
    root = etree.fromstring(text.encode("utf-8"), parser=xml)
    if root is None or parser._local(root.tag) != "opml":
        raise ValueError("This file is not an OPML subscription list.")
    body = next((c for c in root if parser._local(c.tag) == "body"), None)
    if body is None:
        raise ValueError("The OPML file has no <body>.")
    entries: list[OpmlEntry] = []

    def walk(node: etree._Element, path: list[str]) -> None:
        for child in node:
            if parser._local(child.tag) != "outline":
                continue
            title = _attr(child, "text", "title")
            url = _attr(child, "xmlUrl", "xmlurl", "url", "feedUrl")
            has_children = any(parser._local(c.tag) == "outline" for c in child)
            if url:
                label = path[-1] if path else None
                entries.append(OpmlEntry(url=url, title=title, category=label, site_url=_attr(child, "htmlUrl") or None))
            elif has_children:
                walk(child, path + ([title] if title else []))
            elif title:
                entries.append(OpmlEntry(url=None, title=title, category=path[-1] if path else None, problem="No feed URL on this entry."))

    walk(body, [])
    return entries


def export_opml(title: str, categories: list[Category], feeds: list[Feed]) -> str:
    by_category: dict[int | None, list[Feed]] = {}
    for feed in feeds:
        by_category.setdefault(feed.category_id, []).append(feed)

    def outline(feed: Feed, indent: str) -> str:
        name = quoteattr(feed.custom_title or feed.title or feed.url)
        parts = [f'{indent}<outline type="rss" text={name} title={name} xmlUrl={quoteattr(feed.url)}']
        if feed.site_url:
            parts.append(f" htmlUrl={quoteattr(feed.site_url)}")
        return "".join(parts) + "/>"

    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<opml version="2.0">', f"  <head><title>{quoteattr(title)[1:-1]}</title></head>", "  <body>"]
    for category in sorted(categories, key=lambda c: c.position):
        members = by_category.get(category.id, [])
        if not members:
            continue
        lines.append(f"    <outline text={quoteattr(category.name)} title={quoteattr(category.name)}>")
        lines.extend(outline(f, "      ") for f in members)
        lines.append("    </outline>")
    lines.extend(outline(f, "    ") for f in by_category.get(None, []))
    lines.extend(["  </body>", "</opml>", ""])
    return "\n".join(lines)

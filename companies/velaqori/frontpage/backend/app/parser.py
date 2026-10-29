"""Tolerant RSS 2.0 / Atom 1.0 / RSS 1.0 (RDF) parser with real-world normalisation.

Handles: wrong or missing encoding declarations (UTF-8, ISO-8859-1, Windows-1252, UTF-16),
HTML named entities that are not legal XML (``&mdash;``), double-escaped titles, missing optional
fields, many date formats, full-content vs summary-only entries and partially malformed XML.
"""
from __future__ import annotations

import hashlib
import html
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.entities import name2codepoint
from urllib.parse import urljoin, urlparse

import lxml.html
import nh3
from lxml import etree

from . import config


class FeedParseError(Exception):
    """Raised when a document cannot be interpreted as a feed at all."""

    def __init__(self, message: str, *, looks_like_html: bool = False):
        super().__init__(message)
        self.looks_like_html = looks_like_html


@dataclass
class ParsedItem:
    guid: str
    url: str | None
    title: str
    author: str | None
    summary: str
    content_html: str
    has_full_content: bool
    image_url: str | None
    published_at: datetime | None


@dataclass
class ParsedFeed:
    format: str
    title: str
    site_url: str | None
    description: str
    icon_url: str | None
    items: list[ParsedItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------------------------
# Decoding
# ---------------------------------------------------------------------------------------------

_XML_DECL_TEXT = re.compile(r"^\s*<\?xml[^>]*\?>", re.I)
_DECL_ENCODING = re.compile(rb"""encoding\s*=\s*["']([A-Za-z0-9_.:-]+)["']""", re.I)
_XML_ENTITIES = {"amp", "lt", "gt", "quot", "apos"}
_NAMED_ENTITY = re.compile(r"&([A-Za-z][A-Za-z0-9]{1,31});")


def _charset_from_header(content_type: str | None) -> str | None:
    if not content_type:
        return None
    match = re.search(r"charset\s*=\s*[\"']?([A-Za-z0-9_.:-]+)", content_type, re.I)
    return match.group(1) if match else None


def decode_bytes(body: bytes, content_type: str | None = None) -> str:
    """Return text, preferring (BOM) > declared > header > UTF-8 > Windows-1252."""
    if body.startswith(b"\xef\xbb\xbf"):
        return body[3:].decode("utf-8", errors="replace")
    if body.startswith((b"\xff\xfe", b"\xfe\xff")):
        return body.decode("utf-16", errors="replace")
    declared = None
    match = _DECL_ENCODING.search(body[:200])
    if match:
        declared = match.group(1).decode("ascii", "ignore")
    candidates: list[str] = []
    for name in (declared, _charset_from_header(content_type), "utf-8"):
        if name and name.lower() not in [c.lower() for c in candidates]:
            candidates.append(name)
    for name in candidates:
        lowered = name.lower().replace("_", "-")
        if lowered in ("iso-8859-1", "latin-1", "latin1", "us-ascii", "ascii"):
            name = "cp1252"  # Windows-1252 is the de-facto superset browsers use
        try:
            return body.decode(name)
        except (LookupError, UnicodeDecodeError):
            continue
    return body.decode("cp1252", errors="replace")


def _fix_entities(text: str) -> str:
    """Turn HTML named entities (illegal in XML) into numeric references."""

    def repl(m: re.Match[str]) -> str:
        name = m.group(1)
        if name in _XML_ENTITIES:
            return m.group(0)
        code = name2codepoint.get(name)
        return f"&#{code};" if code else m.group(0)

    return _NAMED_ENTITY.sub(repl, text)


# ---------------------------------------------------------------------------------------------
# Text and date normalisation
# ---------------------------------------------------------------------------------------------

_TAGS = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")
_ZERO_WIDTH = re.compile(r"[​‌‍﻿]")


def clean_text(value: str | None, limit: int | None = None) -> str:
    """Strip tags, decode entities (twice for double-escaped feeds), collapse whitespace."""
    if not value:
        return ""
    text = value
    for _ in range(2):
        unescaped = html.unescape(text)
        if unescaped == text:
            break
        text = unescaped
    text = _TAGS.sub(" ", text)
    text = html.unescape(text)
    text = _ZERO_WIDTH.sub("", text)
    text = _WS.sub(" ", text).strip()
    if limit and len(text) > limit:
        cut = text[:limit].rsplit(" ", 1)[0].rstrip(",.;:- ")
        text = f"{cut}…"
    return text


_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y/%m/%d %H:%M:%S",
    "%Y/%m/%d",
    "%Y-%m-%d",
    "%d %b %Y %H:%M:%S",
    "%d %B %Y %H:%M:%S",
    "%d %b %Y",
    "%d %B %Y",
    "%b %d, %Y",
    "%B %d, %Y",
    "%a, %d %b %Y",
    "%d/%m/%Y",
)


def parse_date(value: str | None, now: datetime | None = None) -> datetime | None:
    """Parse ISO 8601, RFC 822/2822 and common non-standard dates to aware UTC; None if hopeless."""
    if not value:
        return None
    raw = _WS.sub(" ", value).strip()
    if not raw:
        return None
    parsed: datetime | None = None
    try:
        parsed = parsedate_to_datetime(raw)
    except (TypeError, ValueError, IndexError):
        parsed = None
    if parsed is None:
        iso = raw.replace("Z", "+00:00").replace("z", "+00:00")
        iso = re.sub(r"([+-]\d{2})(\d{2})$", r"\1:\2", iso)
        try:
            parsed = datetime.fromisoformat(iso)
        except ValueError:
            parsed = None
    if parsed is None:
        stripped = re.sub(r"\s+(UTC|GMT|Z)$", "", raw, flags=re.I)
        for fmt in _DATE_FORMATS:
            try:
                parsed = datetime.strptime(stripped, fmt)
                break
            except ValueError:
                continue
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    parsed = parsed.astimezone(timezone.utc)
    if parsed.year < 1990:
        return None
    current = now or datetime.now(timezone.utc)
    if parsed > current + timedelta(days=1):
        return current  # scheduled/misconfigured: never sort above "now"
    return parsed


# ---------------------------------------------------------------------------------------------
# HTML sanitising for the reader view
# ---------------------------------------------------------------------------------------------

_ALLOWED_TAGS = {
    "a", "abbr", "b", "blockquote", "br", "caption", "cite", "code", "dd", "del", "details", "dfn",
    "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i",
    "img", "ins", "kbd", "li", "mark", "ol", "p", "picture", "pre", "q", "s", "samp", "small",
    "source", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "tfoot", "th",
    "thead", "time", "tr", "u", "ul", "var", "video", "audio",
}
_ALLOWED_ATTRS = {
    "a": {"href", "title"},
    "img": {"src", "alt", "title", "width", "height", "srcset", "sizes"},
    "source": {"src", "srcset", "type", "media", "sizes"},
    "video": {"src", "poster", "controls", "width", "height", "preload"},
    "audio": {"src", "controls", "preload"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan", "scope"},
    "time": {"datetime"},
    "code": {"class"},
    "pre": {"class"},
    "span": {"class"},
    "div": {"class"},
    "ol": {"start"},
    "abbr": {"title"},
}
_DROP_CONTENT = {"script", "style", "iframe", "object", "embed", "form", "noscript", "svg", "nav", "footer", "aside"}
_SOCIAL_NOISE = re.compile(r"(share|sharedaddy|jp-relatedposts|subscribe|newsletter|advert|adsbygoogle)", re.I)
_URL_SCHEMES = {"http", "https", "mailto"}


def sanitize_html(raw: str, base_url: str | None = None) -> str:
    """Make feed HTML safe and tidy: absolute URLs, no scripts/ads/tracking pixels, lazy images."""
    if not raw or not raw.strip():
        return ""
    try:
        fragment = lxml.html.fragment_fromstring(raw, create_parent="div")
    except (etree.ParserError, ValueError):
        return nh3.clean(raw, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, url_schemes=_URL_SCHEMES)

    for element in list(fragment.iter()):
        if element is fragment or not isinstance(element.tag, str):
            continue
        classes = f"{element.get('class', '')} {element.get('id', '')}"
        if element.tag in _DROP_CONTENT or (_SOCIAL_NOISE.search(classes) and element.tag in {"div", "ul", "section", "p"}):
            element.drop_tree()
            continue
        if element.tag == "img":
            width = (element.get("width") or "").strip()
            height = (element.get("height") or "").strip()
            if width in {"0", "1"} or height in {"0", "1"}:
                element.drop_tree()  # tracking pixel
                continue
            if not element.get("src") and element.get("data-src"):
                element.set("src", element.get("data-src"))

    if base_url:
        fragment.make_links_absolute(base_url, resolve_base_href=False)
    inner = "".join(
        [fragment.text or ""]
        + [lxml.html.tostring(child, encoding="unicode") for child in fragment]
    )
    cleaned = nh3.clean(
        inner,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        url_schemes=_URL_SCHEMES,
        link_rel="noopener noreferrer nofollow",
        strip_comments=True,
    )
    cleaned = re.sub(r"<img\b(?![^>]*\bloading=)", '<img loading="lazy" decoding="async"', cleaned)
    cleaned = re.sub(r"<a\b([^>]*\bhref=)", r'<a target="_blank"\1', cleaned)
    return cleaned


_FIRST_IMG = re.compile(r"""<img[^>]+src\s*=\s*["']([^"']+)["']""", re.I)


# ---------------------------------------------------------------------------------------------
# XML helpers
# ---------------------------------------------------------------------------------------------


def _local(tag: object) -> str:
    if not isinstance(tag, str):
        return ""
    return tag.rsplit("}", 1)[-1].lower() if "}" in tag else tag.lower()


def _ns(tag: object) -> str:
    if isinstance(tag, str) and tag.startswith("{"):
        return tag[1:].split("}", 1)[0]
    return ""


def _children(node: etree._Element, *names: str) -> list[etree._Element]:
    wanted = {n.lower() for n in names}
    return [c for c in node if _local(c.tag) in wanted]


def _first(node: etree._Element, *names: str) -> etree._Element | None:
    found = _children(node, *names)
    return found[0] if found else None


def _text(node: etree._Element | None) -> str:
    if node is None:
        return ""
    # itertext also picks up inline XHTML in Atom (type="xhtml") content.
    return "".join(node.itertext()).strip()


def _inner_markup(node: etree._Element | None) -> str:
    """Markup of an Atom/RSS content element: escaped HTML text, CDATA or inline XHTML."""
    if node is None:
        return ""
    if len(node) and (node.get("type") or "").lower() == "xhtml":
        parts = [node.text or ""]
        for child in node:
            for sub in child.iter():
                if isinstance(sub.tag, str) and "}" in sub.tag:
                    sub.tag = sub.tag.rsplit("}", 1)[-1]
            parts.append(etree.tostring(child, encoding="unicode", with_tail=True))
        return "".join(parts)
    text = node.text or ""
    if len(node):  # unescaped HTML directly inside the element
        text += "".join(etree.tostring(c, encoding="unicode", with_tail=True) for c in node)
    return text.strip()


def _guid_hash(guid: str) -> str:
    return hashlib.sha1(guid.encode("utf-8", "replace")).hexdigest()


# ---------------------------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------------------------


def parse_feed(body: bytes, content_type: str | None = None, source_url: str | None = None) -> ParsedFeed:
    if not body or not body.strip():
        raise FeedParseError("The response was empty.")
    text = decode_bytes(body, content_type)
    head = text[:2000].lstrip("﻿ \t\r\n").lower()
    if head.startswith("<!doctype html") or head.startswith("<html") or (
        "<rss" not in head and "<feed" not in head and "<rdf" not in head and "<html" in head
    ):
        raise FeedParseError("This URL returns a web page, not a feed.", looks_like_html=True)

    text = _XML_DECL_TEXT.sub("", text, count=1)
    text = _fix_entities(text)
    # Illegal control characters make libxml2 stop early.
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    parser = etree.XMLParser(
        recover=True, resolve_entities=False, no_network=True, huge_tree=False, remove_blank_text=False
    )
    try:
        root = etree.fromstring(text.encode("utf-8"), parser=parser)
    except etree.XMLSyntaxError as exc:
        raise FeedParseError(f"The feed XML is malformed and could not be recovered ({exc}).") from exc
    if root is None:
        raise FeedParseError("The feed XML is malformed and nothing could be recovered.")

    kind = _local(root.tag)
    warnings: list[str] = []
    if parser.error_log:
        warnings.append("The feed XML had errors; the readable part was recovered.")
    if kind == "rss":
        channel = _first(root, "channel")
        if channel is None:
            raise FeedParseError("RSS document has no <channel>.")
        feed = _parse_rss(channel, source_url, "rss2")
    elif kind == "rdf":
        channel = _first(root, "channel")
        feed = _parse_rss(channel if channel is not None else root, source_url, "rss1", rdf_root=root)
    elif kind == "feed":
        feed = _parse_atom(root, source_url)
    else:
        raise FeedParseError(f"This document is <{kind or 'unknown'}>, not an RSS or Atom feed.")
    feed.warnings = warnings
    return feed


def _resolve(base: str | None, link: str | None) -> str | None:
    link = (link or "").strip()
    if not link:
        return None
    absolute = urljoin(base, link) if base else link
    return absolute if urlparse(absolute).scheme in ("http", "https") else None


def _build_item(
    *, guid: str | None, link: str | None, title: str, author: str | None, summary_raw: str,
    content_raw: str, image: str | None, published: datetime | None, base: str | None,
) -> ParsedItem:
    page_url = _resolve(base, link)
    summary_text = clean_text(summary_raw or content_raw, config.EXCERPT_CHARS)
    content_html = sanitize_html(content_raw or summary_raw, page_url or base)
    content_text_len = len(clean_text(content_html))
    summary_len = len(clean_text(summary_raw)) if summary_raw else 0
    has_full = bool(content_raw) and content_text_len > max(summary_len * 1.3, 600) or (
        not summary_raw and content_text_len > 600
    )
    if not content_html and summary_text:
        content_html = f"<p>{html.escape(summary_text)}</p>"
    if image is None:
        match = _FIRST_IMG.search(content_raw or summary_raw or "")
        image = match.group(1) if match else None
    image = _resolve(page_url or base, image)
    clean_title = clean_text(title, 500) or clean_text(summary_text, 90) or "Untitled"
    stable = (guid or page_url or f"{clean_title}|{published.isoformat() if published else ''}").strip()
    return ParsedItem(
        guid=stable,
        url=page_url,
        title=clean_title,
        author=clean_text(author, 200) or None,
        summary=summary_text,
        content_html=content_html,
        has_full_content=has_full,
        image_url=image,
        published_at=published,
    )


def _media_image(node: etree._Element) -> str | None:
    for child in node:
        name = _local(child.tag)
        if name in {"thumbnail", "content"} and ("mrss" in _ns(child.tag) or "media" in _ns(child.tag)):
            url = child.get("url")
            kind = (child.get("type") or child.get("medium") or "image").lower()
            if url and kind.startswith("image"):
                return url
        if name == "enclosure" and (child.get("type") or "").lower().startswith("image"):
            return child.get("url")
        if name == "image" and child.get("href"):
            return child.get("href")
    return None


def _parse_rss(channel: etree.Element, source_url: str | None, fmt: str, rdf_root: etree.Element | None = None) -> ParsedFeed:
    title = clean_text(_text(_first(channel, "title")), 300)
    site = _resolve(source_url, _text(_first(channel, "link")))
    description = clean_text(_text(_first(channel, "description")), 600)
    icon = None
    image = _first(channel, "image") or (_first(rdf_root, "image") if rdf_root is not None else None)
    if image is not None:
        icon = _resolve(source_url, _text(_first(image, "url")) or image.get(f"{{{_ns(image.tag)}}}resource"))
    items_parent = rdf_root if rdf_root is not None else channel
    nodes = _children(items_parent, "item") or _children(channel, "item")
    result = ParsedFeed(format=fmt, title=title, site_url=site, description=description, icon_url=icon)
    base = site or source_url
    for node in nodes:
        guid_node = _first(node, "guid")
        link = _text(_first(node, "link")) or (
            _text(guid_node) if guid_node is not None and guid_node.get("isPermaLink", "true").lower() != "false" else ""
        )
        link = link or node.get(f"{{{_ns(node.tag)}}}about") or ""
        author = (
            _text(_first(node, "creator"))
            or _text(_first(node, "author"))
            or None
        )
        date_text = _text(_first(node, "pubdate")) or _text(_first(node, "date")) or _text(_first(node, "published")) or _text(_first(node, "updated"))
        result.items.append(
            _build_item(
                guid=_text(guid_node) or None,
                link=link,
                title=_text(_first(node, "title")),
                author=author,
                summary_raw=_text(_first(node, "description")) or _text(_first(node, "summary")),
                content_raw=_inner_markup(_first(node, "encoded")) or _inner_markup(_first(node, "content")),
                image=_media_image(node),
                published=parse_date(date_text),
                base=base,
            )
        )
    return result


def _atom_link(node: etree._Element, base: str | None, *, rel: str = "alternate") -> str | None:
    chosen = None
    for link in _children(node, "link"):
        link_rel = (link.get("rel") or "alternate").lower()
        if link_rel == rel and (link.get("type") in (None, "", "text/html", "application/xhtml+xml") or rel != "alternate"):
            chosen = link.get("href")
            break
    if chosen is None:
        for link in _children(node, "link"):
            if (link.get("rel") or "alternate").lower() == rel:
                chosen = link.get("href")
                break
    return _resolve(base, chosen)


def _parse_atom(root: etree.Element, source_url: str | None) -> ParsedFeed:
    xml_base = root.get("{http://www.w3.org/XML/1998/namespace}base")
    base = _resolve(source_url, xml_base) if xml_base else source_url
    title = clean_text(_text(_first(root, "title")), 300)
    site = _atom_link(root, base)
    description = clean_text(_text(_first(root, "subtitle")) or _text(_first(root, "tagline")), 600)
    icon = _resolve(base, _text(_first(root, "icon")) or _text(_first(root, "logo"))) or None
    result = ParsedFeed(format="atom", title=title, site_url=site, description=description, icon_url=icon)
    feed_author = _text(_first(_first(root, "author") or root, "name")) if _first(root, "author") is not None else ""
    for entry in _children(root, "entry"):
        entry_base = _resolve(base, entry.get("{http://www.w3.org/XML/1998/namespace}base")) or site or base
        author_node = _first(entry, "author")
        author = _text(_first(author_node, "name")) if author_node is not None else ""
        link = _atom_link(entry, entry_base)
        if link is None:
            ident = _text(_first(entry, "id"))
            link = ident if ident.startswith("http") else None
        date_text = _text(_first(entry, "published")) or _text(_first(entry, "updated")) or _text(_first(entry, "issued")) or _text(_first(entry, "modified")) or _text(_first(entry, "date"))
        content_node = _first(entry, "content")
        summary_node = _first(entry, "summary")
        result.items.append(
            _build_item(
                guid=_text(_first(entry, "id")) or None,
                link=link,
                title=_text(_first(entry, "title")),
                author=author or feed_author or _text(_first(entry, "creator")) or None,
                summary_raw=_inner_markup(summary_node),
                content_raw=_inner_markup(content_node),
                image=_media_image(entry),
                published=parse_date(date_text),
                base=entry_base,
            )
        )
    return result


def guid_hash(guid: str) -> str:
    return _guid_hash(guid)


def discover_feed_links(html_text: str, base_url: str) -> list[str]:
    """Find <link rel="alternate" type="application/rss+xml|atom+xml"> in an HTML page."""
    try:
        document = lxml.html.fromstring(html_text)
    except (etree.ParserError, ValueError):
        return []
    found: list[str] = []
    for link in document.iter("link"):
        rel = (link.get("rel") or "").lower()
        kind = (link.get("type") or "").lower()
        if "alternate" in rel and ("rss" in kind or "atom" in kind or kind == "application/xml" or kind == "text/xml"):
            href = _resolve(base_url, link.get("href"))
            if href and href not in found:
                found.append(href)
    return found

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app import parser

from . import feedfixtures as fx


def test_rss2_basic_fields():
    feed = parser.parse_feed(fx.rss2("My Blog", fx.generated_entries("My Blog", 3), link="https://blog.example.test/"))
    assert feed.format == "rss2"
    assert feed.title == "My Blog"
    assert feed.site_url == "https://blog.example.test/"
    assert len(feed.items) == 3
    first = feed.items[0]
    assert first.title == "My Blog: fictional article 1"
    assert first.url == "https://my-blog.example.test/posts/1"
    assert first.author == "Fiction Writer"
    assert first.published_at is not None and first.published_at.tzinfo is not None
    assert first.has_full_content  # content:encoded is much longer than the description


def test_atom_basic_fields_and_xhtml_content():
    body = b"""<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Atom Blog</title>
    <link href="https://a.example.test/" rel="alternate"/>
    <entry><title>Hello</title><id>tag:a,1</id><link href="/posts/1"/><updated>2024-01-15T10:30:00Z</updated>
    <author><name>Ada</name></author>
    <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>Inline <b>XHTML</b> body</p></div></content></entry></feed>"""
    feed = parser.parse_feed(body, source_url="https://a.example.test/atom.xml")
    assert feed.format == "atom"
    item = feed.items[0]
    assert item.url == "https://a.example.test/posts/1"
    assert item.author == "Ada"
    assert item.published_at == datetime(2024, 1, 15, 10, 30, tzinfo=timezone.utc)
    assert "<b>XHTML</b>" in item.content_html


def test_rdf_rss1():
    feed = parser.parse_feed(fx.rdf("RDF Site", [{"title": "One", "link": "https://rdf.example.test/1", "date": "2024-03-01T12:00:00+02:00", "description": "d"}]))
    assert feed.format == "rss1"
    assert feed.items[0].title == "One"
    assert feed.items[0].published_at == datetime(2024, 3, 1, 10, 0, tzinfo=timezone.utc)


def test_iso_8859_1_declared_encoding():
    body = '<?xml version="1.0" encoding="ISO-8859-1"?><rss version="2.0"><channel><title>Café</title><item><title>Crème brûlée</title><link>https://x.test/1</link></item></channel></rss>'.encode("latin-1")
    feed = parser.parse_feed(body)
    assert feed.title == "Café"
    assert feed.items[0].title == "Crème brûlée"


def test_windows_1252_smart_quotes_with_wrong_utf8_declaration():
    body = b'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>T</title><item><title>It\x92s \x93quoted\x94 \x96 fine</title></item></channel></rss>'
    feed = parser.parse_feed(body)
    assert feed.items[0].title == "It’s “quoted” – fine"


def test_charset_from_http_header_when_undeclared():
    body = '<rss version="2.0"><channel><title>Ünï</title></channel></rss>'.encode("latin-1")
    assert parser.parse_feed(body, "application/rss+xml; charset=iso-8859-1").title == "Ünï"


def test_html_entities_are_normalised_even_when_not_valid_xml():
    body = b'<rss version="2.0"><channel><title>A &amp; B</title><item><title>Dash&mdash;and&nbsp;it&#8217;s &hellip;</title></item></channel></rss>'
    feed = parser.parse_feed(body)
    assert feed.title == "A & B"
    assert feed.items[0].title == "Dash—and it’s …"


def test_double_escaped_title_and_tags_are_cleaned():
    body = b'<rss version="2.0"><channel><title>x</title><item><title>&amp;lt;b&amp;gt;Rock &amp;amp; Roll&amp;lt;/b&amp;gt;</title></item></channel></rss>'
    assert parser.parse_feed(body).items[0].title == "Rock & Roll"


def test_missing_optional_fields():
    body = b'<rss version="2.0"><channel><title>Sparse</title><item><title>Only a title</title></item><item><link>https://s.test/x</link></item></channel></rss>'
    feed = parser.parse_feed(body)
    a, b = feed.items
    assert a.author is None and a.summary == "" and a.published_at is None and a.url is None
    assert b.title == "Untitled" and b.url == "https://s.test/x"
    assert a.guid != b.guid


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Mon, 15 Jan 2024 10:30:00 GMT", datetime(2024, 1, 15, 10, 30, tzinfo=timezone.utc)),
        ("Mon, 15 Jan 2024 10:30:00 +0200", datetime(2024, 1, 15, 8, 30, tzinfo=timezone.utc)),
        ("Mon, 15 Jan 2024 10:30:00 EST", datetime(2024, 1, 15, 15, 30, tzinfo=timezone.utc)),
        ("2024-01-15T10:30:00Z", datetime(2024, 1, 15, 10, 30, tzinfo=timezone.utc)),
        ("2024-01-15T10:30:00-0500", datetime(2024, 1, 15, 15, 30, tzinfo=timezone.utc)),
        ("2024-01-15 10:30:00", datetime(2024, 1, 15, 10, 30, tzinfo=timezone.utc)),
        ("2024-01-15", datetime(2024, 1, 15, tzinfo=timezone.utc)),
        ("15 January 2024", datetime(2024, 1, 15, tzinfo=timezone.utc)),
        ("Jan 15, 2024", datetime(2024, 1, 15, tzinfo=timezone.utc)),
    ],
)
def test_date_formats(raw, expected):
    assert parser.parse_date(raw) == expected


def test_unparseable_and_future_dates():
    assert parser.parse_date("sometime last week") is None
    assert parser.parse_date("") is None
    now = datetime.now(timezone.utc)
    future = parser.parse_date((now + timedelta(days=30)).isoformat(), now)
    assert future == now  # never sorts above "now"


def test_summary_only_vs_full_content():
    short = parser.parse_feed(fx.rss2("S", [{"title": "t", "link": "https://s.test/1", "description": "Just an excerpt."}]))
    assert short.items[0].has_full_content is False
    assert "excerpt" in short.items[0].content_html


def test_malformed_xml_partial_recovery():
    body = b'<rss version="2.0"><channel><title>Broken</title><item><title>Good one</title><link>https://b.test/1</link></item><item><title>Cut off mid'
    feed = parser.parse_feed(body)
    assert feed.title == "Broken"
    assert feed.items[0].title == "Good one"
    assert feed.warnings


def test_html_page_is_a_clear_error_with_discovery_hint():
    with pytest.raises(parser.FeedParseError) as err:
        parser.parse_feed(b"<!DOCTYPE html><html><head><title>Site</title></head><body>hi</body></html>")
    assert err.value.looks_like_html


def test_non_feed_xml_and_garbage_raise():
    with pytest.raises(parser.FeedParseError):
        parser.parse_feed(b"<?xml version='1.0'?><sitemap><url/></sitemap>")
    with pytest.raises(parser.FeedParseError):
        parser.parse_feed(b"")
    with pytest.raises(parser.FeedParseError):
        parser.parse_feed(b"\x00\x01\x02 not xml at all")


def test_sanitizer_strips_scripts_pixels_and_resolves_urls():
    dirty = '<p onclick="x()">Hi <a href="/a" onmouseover="y()">link</a></p><script>alert(1)</script><img src="/pic.png" alt="p"><img src="https://t.test/p.gif" width="1" height="1"><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)">bad</a>'
    clean = parser.sanitize_html(dirty, "https://site.test/post/1")
    assert "script" not in clean and "onclick" not in clean and "onmouseover" not in clean and "iframe" not in clean
    assert 'href="https://site.test/a"' in clean
    assert 'src="https://site.test/pic.png"' in clean
    assert "t.test/p.gif" not in clean
    assert "javascript:" not in clean
    assert 'loading="lazy"' in clean
    assert 'rel="noopener' in clean


def test_image_extraction_from_media_and_content():
    body = fx.rss2("I", [{"title": "a", "link": "https://i.test/1", "image": "https://i.test/img.jpg", "description": "x"}, {"title": "b", "link": "https://i.test/2", "content": '<p><img src="/inline.png"></p>'}])
    feed = parser.parse_feed(body, source_url="https://i.test/feed")
    assert feed.items[0].image_url == "https://i.test/img.jpg"
    assert feed.items[1].image_url == "https://i.test/inline.png"


def test_discover_feed_links():
    page = '<html><head><link rel="alternate" type="application/atom+xml" href="/atom.xml"><link rel="stylesheet" href="x.css"></head></html>'
    assert parser.discover_feed_links(page, "https://site.test/blog/") == ["https://site.test/atom.xml"]

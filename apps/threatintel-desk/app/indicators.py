"""Indicator normalisation and validation (IPs, domains, hashes, URLs)."""
from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass
from urllib.parse import urlparse


class IndicatorError(ValueError):
    pass


@dataclass(frozen=True)
class Indicator:
    value: str
    kind: str      # ip | domain | url | hash-md5 | hash-sha1 | hash-sha256


_HASH = re.compile(r"^[0-9a-fA-F]+$")
_DOMAIN = re.compile(r"^(?=.{1,253}$)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$")


def parse_indicator(raw: str) -> Indicator:
    value = raw.strip()
    if not value:
        raise IndicatorError("Indicator must not be empty.")
    try:
        ip = ipaddress.ip_address(value)
        return Indicator(str(ip), "ip")
    except ValueError:
        pass
    if value.lower().startswith(("http://", "https://")):
        parsed = urlparse(value)
        if not parsed.hostname:
            raise IndicatorError(f"URL {value!r} has no host.")
        return Indicator(value, "url")
    if _DOMAIN.fullmatch(value):
        return Indicator(value.lower(), "domain")
    if _HASH.fullmatch(value):
        length = len(value)
        kind = {32: "hash-md5", 40: "hash-sha1", 64: "hash-sha256"}.get(length)
        if kind:
            return Indicator(value.lower(), kind)
        raise IndicatorError(f"Hash {value!r} has an unsupported length {length}.")
    raise IndicatorError(f"{value!r} is not a recognised indicator (ip/domain/url/hash).")

"""Authorization of scan targets. Every scan is validated here first.

Rules (tested):
- A target must match an explicit allowlist entry (exact host/IP or CIDR).
- Non-allowlisted targets are refused — there is no override flag.
- Target count and port count are bounded by configuration.
"""
from __future__ import annotations

import ipaddress
import re

HOSTNAME = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$", re.I)


class AuthorizationError(ValueError):
    pass


def _matches(target: str, entry: str) -> bool:
    if "/" in entry:                                   # CIDR range
        try:
            net = ipaddress.ip_network(entry, strict=False)
            ip = ipaddress.ip_address(target)
            return ip.version == net.version and ip in net
        except ValueError:
            return False
    return target.lower() == entry.lower()             # exact host or IP


def validate_targets(targets: list[str], allowlist: list[str],
                     max_targets: int, max_ports: int, ports: list[int] | None = None) -> list[str]:
    if not targets:
        raise AuthorizationError("no targets supplied")
    if len(targets) > max_targets:
        raise AuthorizationError(f"refused: {len(targets)} targets exceeds the limit of {max_targets}")
    if ports is not None and len(ports) > max_ports:
        raise AuthorizationError(f"refused: {len(ports)} ports exceeds the limit of {max_ports}")
    for target in targets:
        if not (HOSTNAME.match(target) or _ip_ok(target)):
            raise AuthorizationError(f"refused: {target!r} is not a valid hostname or IP")
        if not any(_matches(target, entry) for entry in allowlist):
            raise AuthorizationError(
                f"refused: {target!r} is not on the configured authorization allowlist")
    return targets


def _ip_ok(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False

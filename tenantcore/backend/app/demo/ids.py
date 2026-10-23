import uuid

NAMESPACE = uuid.UUID("4c2f0bf4-62a2-4b0e-a31f-0ed3c48c80fa")


def demo_id(name: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, name)


TENANTS = {slug: demo_id(f"tenant:{slug}") for slug in ("acme", "globex", "novatech")}
USERS = {
    key: demo_id(f"user:{key}")
    for key in (
        "platform",
        "acme_admin",
        "acme_member",
        "globex_admin",
        "globex_member",
        "novatech_admin",
        "novatech_member",
        "multi",
    )
}
PROJECTS = {
    f"{slug}_{letter}": demo_id(f"project:{slug}:{letter}")
    for slug in TENANTS
    for letter in ("a", "b")
}
PLANS = {code: demo_id(f"plan:{code}") for code in ("starter", "growth", "enterprise")}

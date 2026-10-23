import uuid

import pytest
from pydantic import ValidationError

from app.tenants.schemas import MemberInvite, TenantCreate


def test_tenant_slug_is_normalized_and_validated():
    tenant = TenantCreate(name="Example", slug="Example-01", plan_id=uuid.uuid4())
    assert tenant.slug == "example-01"
    with pytest.raises(ValidationError):
        TenantCreate(name="Example", slug="../../other_tenant", plan_id=uuid.uuid4())


def test_member_email_is_normalized():
    invite = MemberInvite(email="  PERSON@EXAMPLE.COM ", full_name="Person")
    assert invite.email == "person@example.com"

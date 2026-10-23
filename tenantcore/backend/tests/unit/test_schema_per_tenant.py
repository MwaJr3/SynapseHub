import uuid

import pytest

from app.tenants.schema_per_tenant import schema_name_for_tenant, validate_schema_name


def test_schema_names_are_uuid_derived_and_validated():
    tenant_id = uuid.uuid4()
    name = schema_name_for_tenant(tenant_id)
    assert name == f"tenant_{tenant_id.hex}"
    validate_schema_name(name)
    with pytest.raises(ValueError):
        schema_name_for_tenant("not-a-uuid")
    with pytest.raises(ValueError):
        validate_schema_name('tenant_x"; DROP TABLE users; --')

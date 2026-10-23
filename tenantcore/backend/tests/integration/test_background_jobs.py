import pytest

from app.demo.ids import PROJECTS, TENANTS
from app.errors import NotFoundError
from app.worker import aggregate_usage, project_report

pytestmark = pytest.mark.postgres


def test_background_job_uses_explicit_correct_tenant():
    result = project_report(str(TENANTS["acme"]), str(PROJECTS["acme_a"]))
    assert result["tenant_id"] == str(TENANTS["acme"])
    assert result["project_id"] == str(PROJECTS["acme_a"])
    assert result["task_count"] >= 1


def test_background_job_cannot_operate_on_other_tenant_resource():
    with pytest.raises(NotFoundError):
        project_report(str(TENANTS["acme"]), str(PROJECTS["globex_a"]))
    with pytest.raises(NotFoundError):
        project_report(str(TENANTS["globex"]), str(PROJECTS["acme_a"]))


def test_usage_aggregation_is_tenant_scoped_and_idempotent():
    first = aggregate_usage(str(TENANTS["acme"]))
    second = aggregate_usage(str(TENANTS["acme"]))
    assert first["tenant_id"] == second["tenant_id"] == str(TENANTS["acme"])
    assert first["projects"] == second["projects"]

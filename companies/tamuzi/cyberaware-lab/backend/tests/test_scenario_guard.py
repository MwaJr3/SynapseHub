import pytest

from app.scenario_guard import BANNER_TEXT, ScenarioRejected, banner_html, validate_scenario

SAFE = ("From: IT Helpdesk <it@training.example>\n"
        "Subject: Password expiry reminder (training)\n"
        "Please visit https://portal.training.example/expired to review.\n"
        "This is a fictional scenario using placeholder names.\n")


def test_safe_scenario_passes_and_banner_rendered():
    validate_scenario(title="Password expiry drill", kind="phishing_email", content=SAFE)
    assert "TRAINING SIMULATION" in BANNER_TEXT
    assert "training-banner" in banner_html() and "role=\"alert\"" in banner_html()


def test_password_fields_rejected():
    for evil in ('<input type="password" name="pass">', 'password: "collect"', "name='user_password'"):
        with pytest.raises(ScenarioRejected, match="password"):
            validate_scenario(title="t", kind="phishing_email", content=SAFE + evil)


def test_real_organizations_rejected():
    for brand in ("PayPal", "Microsoft", "Stanbic", "Zamtel"):
        with pytest.raises(ScenarioRejected, match="fictional"):
            validate_scenario(title="t", kind="phishing_email", content=SAFE + f"Dear {brand} customer")


def test_real_domains_rejected():
    for bad in ("https://accounts.google.com/login", "support@paypal.com", "http://mybank.co.zm"):
        with pytest.raises(ScenarioRejected, match="fictional"):
            validate_scenario(title="t", kind="phishing_email", content=SAFE + bad)


def test_kind_and_size_validated():
    with pytest.raises(ScenarioRejected, match="kind"):
        validate_scenario(title="t", kind="malware_builder", content=SAFE)
    with pytest.raises(ScenarioRejected, match="too large"):
        validate_scenario(title="t", kind="quiz", content="x" * 30_000)

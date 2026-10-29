"""Seed OpenLearn Commons with clearly-labelled SIMULATED demo resources."""
from __future__ import annotations

import uuid

from . import database
from .models import Adaptation, Collection, Resource, Translation, User
from .security import hash_password

DEMO_PASSWORD = "demo-password-123"


def seed() -> dict:
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "demo.contributor@openlearn.example").first()
        if existing:
            return {"skipped": True, "email": existing.email}
        contributor = User(email="demo.contributor@openlearn.example", display_name="Demo Contributor (simulated)",
                           password_hash=hash_password(DEMO_PASSWORD), role="contributor")
        translator = User(email="demo.translator@openlearn.example", display_name="Demo Translator (simulated)",
                          password_hash=hash_password(DEMO_PASSWORD), role="translator")
        reviewer = User(email="demo.reviewer@openlearn.example", display_name="Demo Reviewer (simulated)",
                        password_hash=hash_password(DEMO_PASSWORD), role="reviewer")
        admin = User(email="demo.admin@openlearn.example", display_name="Demo Admin (simulated)",
                     password_hash=hash_password(DEMO_PASSWORD), role="admin")
        db.add_all([contributor, translator, reviewer, admin])
        db.flush()

        r1 = Resource(uid=uuid.uuid4().hex, title="Water Cycle — Grade 5 lesson (simulated)",
                      resource_type="lesson", subject="Science", level="Grade 5", language="en",
                      creator="Demo Creator (fictional)", license="CC BY 4.0",
                      source_url="https://example.invalid/water-cycle", host_status="link_only",
                      review_status="approved", rights_confirmed="yes", uploader_id=contributor.id,
                      description="Simulated demonstration catalogue entry.",
                      body="Water cycles through evaporation, condensation and precipitation. (simulated)")
        r2 = Resource(uid=uuid.uuid4().hex, title="Local Proverbs reader (simulated)",
                      resource_type="reading", subject="Languages", level="Grade 7", language="en",
                      creator="Demo Creator (fictional)", license="CC BY-NC-SA 4.0",
                      host_status="hosted_local", review_status="approved", rights_confirmed="yes",
                      uploader_id=contributor.id,
                      description="Simulated demonstration entry with an unclear-offline reading.")
        r3 = Resource(uid=uuid.uuid4().hex, title="Unlicensed mystery pack (simulated)",
                      resource_type="worksheet", subject="Mixed", level="Adult", language="en",
                      creator="Unknown", license="Unknown", host_status="link_only",
                      review_status="approved", rights_confirmed="yes", uploader_id=contributor.id,
                      description="Demonstrates the unknown-license honesty path.")
        db.add_all([r1, r2, r3])
        db.flush()

        adaptation = Adaptation(source_id=r1.id, title="Water Cycle — localized examples (simulated)",
                                body="Adapted with local river examples. (simulated)", author_id=translator.id,
                                license="CC BY 4.0", status="draft")
        db.add(adaptation)
        db.flush()
        db.add(Translation(adaptation_id=adaptation.id, language="fr",
                           source_text="The water cycle…", target_text="Le cycle de l'eau… (machine draft)",
                           machine="yes", status="draft"))
        db.add(Collection(title="Starter science pack (simulated)", owner_id=contributor.id,
                          items_json=__import__("json").dumps([r1.id, r2.id])))
        db.commit()
        return {"skipped": False, "contributor": contributor.email, "password": DEMO_PASSWORD}
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())

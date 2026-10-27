"""Concepts, relations, notes and sessions — what a learner adds themselves.

Stage 1 let a learner record what an instrument said about them. This module is
where they start producing something of their own: a concept they care about,
the relations they see between ideas, notes for later retrieval, and a record of
a sitting actually done.

Design decisions worth stating, because each one is a place this could go wrong:

**Ownership is a filter, not a field.** A concept with `owner_id` set belongs to
one learner. Every read path in the application — knowledge bank, map,
recommendations, the daily plan, the tutor's retrieval — goes through
`visible_concepts()`. A private concept that leaks into another learner's tutor
answer would be the worst bug this product could have, so there is exactly one
place that decides visibility, and the isolation tests exercise it through HTTP.

**The catalogue is read-only through the API.** Seeded concepts cannot be edited
or deleted: they are shared by every learner, and one person's edit would silently
change everyone's curriculum. The refusal says so.

**Relations are typed and checked.** `prerequisite` is the only relation that
changes behaviour (it gates recommendations), so a learner-authored prerequisite
cycle is rejected — a cycle would make the gate unsatisfiable and the concept
permanently blocked. The other relations are for the learner's own thinking.

**A note is not evidence.** Writing notes feels productive and changes nothing
about what the system believes the learner can do. `concept_states` is untouched
by everything in this module; that separation is the point of the reference gap.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from .models import Concept, ConceptEdge, LearningSession, ReferenceNote, User

#: Relation vocabulary. `prerequisite` is load-bearing; the rest are the learner's
#: own thinking and are shown, never used to gate anything.
RELATIONS: dict[str, dict[str, str]] = {
    "prerequisite": {
        "label": "is a prerequisite of",
        "meaning": "You need this first. Gates recommendations.",
        "gates": "true",
    },
    "contrasts_with": {
        "label": "contrasts with",
        "meaning": "Often confused, and the difference is worth knowing.",
        "gates": "false",
    },
    "example_of": {
        "label": "is an example of",
        "meaning": "A concrete instance of the other idea.",
        "gates": "false",
    },
    "mechanism_behind": {
        "label": "explains how it works",
        "meaning": "The causal story under the other idea.",
        "gates": "false",
    },
    "evidence_for": {
        "label": "is evidence for",
        "meaning": "Supports the other claim.",
        "gates": "false",
    },
    "application_of": {
        "label": "is an application of",
        "meaning": "Where the other idea gets used.",
        "gates": "false",
    },
    "exception_to": {
        "label": "is an exception to",
        "meaning": "The boundary case where the other idea fails.",
        "gates": "false",
    },
    "related_to": {
        "label": "is related to",
        "meaning": "Associated, with no stronger claim made.",
        "gates": "false",
    },
}

GATING_RELATIONS = frozenset(name for name, meta in RELATIONS.items() if meta["gates"] == "true")

#: Session activities, in the order the learning lifecycle suggests. The API
#: accepts any subset: forcing every stage on a fifteen-minute sitting is exactly
#: the overhead the brief warns about.
ACTIVITIES: dict[str, str] = {
    "priming": "Priming — activating what you already know, within a time box.",
    "encoding": "Encoding — turning the material into meaning in your own words.",
    "reference": "Reference — capturing only what is worth looking up again.",
    "retrieval": "Retrieval — recalling it without the notes.",
    "application": "Application — using it on a problem you have not seen.",
    "reflection": "Reflection — what worked, what to change next time.",
}

SESSION_STATUSES = ("open", "completed", "partial", "abandoned")

MAX_TITLE = 200
MAX_SUBJECT = 80
MAX_BODY = 20_000


class LibraryError(ValueError):
    """A request that must not be stored. Routes turn this into a 4xx."""

    def __init__(self, message: str, *, status: int = 422) -> None:
        super().__init__(message)
        self.status = status


class NotFound(LookupError):
    """Nothing visible under that id. Deliberately indistinguishable from 'not yours'."""


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------- visibility


def visible_concepts(db: Session, user: User):
    """Catalogue concepts plus this learner's own. The only visibility rule."""
    return (
        db.query(Concept)
        .filter(or_(Concept.owner_id.is_(None), Concept.owner_id == user.id))
        .order_by(Concept.ordering, Concept.title)
    )


def get_concept(db: Session, user: User, concept_id: str) -> Concept:
    concept = db.get(Concept, concept_id)
    # Another learner's concept is a 404, not a 403: an id alone must not confirm
    # that somebody else's record exists.
    if concept is None or (concept.owner_id is not None and concept.owner_id != user.id):
        raise NotFound("concept not found")
    return concept


def edge_visible(edge: ConceptEdge, concept_ids: set[str], user: User) -> bool:
    if edge.from_concept_id not in concept_ids or edge.to_concept_id not in concept_ids:
        return False
    return edge.owner_id is None or edge.owner_id == user.id


# ------------------------------------------------------------------ concepts


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return cleaned[:40] or "concept"


def create_concept(
    db: Session,
    user: User,
    *,
    title: str,
    subject: str,
    summary: str = "",
    explanation: str = "",
    difficulty: float = 3.0,
) -> Concept:
    title = title.strip()
    subject = subject.strip()
    if len(title) < 2:
        raise LibraryError("a concept needs a title of at least two characters")
    if not subject:
        raise LibraryError("a concept needs a subject, so it can be grouped with related ideas")
    if not (1.0 <= float(difficulty) <= 5.0):
        raise LibraryError("difficulty is a 1–5 estimate; outside that range it stops meaning anything")
    if len(title) > MAX_TITLE or len(subject) > MAX_SUBJECT:
        raise LibraryError("that title or subject is too long")

    # Ids are readable, but must not collide with the catalogue's dotted ids
    # (`py.variables`) or with another learner's concept.
    base = slugify(title)
    concept_id = f"own.{base}"
    suffix = 2
    while db.get(Concept, concept_id) is not None:
        concept_id = f"own.{base}-{suffix}"
        suffix += 1

    last = (
        db.query(Concept)
        .filter(Concept.owner_id == user.id)
        .order_by(Concept.ordering.desc())
        .first()
    )
    concept = Concept(
        id=concept_id,
        owner_id=user.id,
        title=title,
        subject=subject,
        summary=summary.strip(),
        explanation=explanation.strip(),
        difficulty=float(difficulty),
        ordering=(last.ordering + 1) if last is not None else 1000,
    )
    db.add(concept)
    db.commit()
    db.refresh(concept)
    return concept


def update_concept(db: Session, user: User, concept_id: str, changes: dict) -> Concept:
    concept = get_concept(db, user, concept_id)
    if concept.owner_id is None:
        raise LibraryError(
            "this is catalogue material shared by every learner, so it cannot be edited here. "
            "Add your own concept instead.",
            status=403,
        )

    if "title" in changes and changes["title"] is not None:
        title = changes["title"].strip()
        if len(title) < 2:
            raise LibraryError("a concept needs a title of at least two characters")
        concept.title = title[:MAX_TITLE]
    if "subject" in changes and changes["subject"] is not None:
        subject = changes["subject"].strip()
        if not subject:
            raise LibraryError("a concept needs a subject")
        concept.subject = subject[:MAX_SUBJECT]
    if "summary" in changes and changes["summary"] is not None:
        concept.summary = changes["summary"].strip()
    if "explanation" in changes and changes["explanation"] is not None:
        concept.explanation = changes["explanation"].strip()
    if "difficulty" in changes and changes["difficulty"] is not None:
        difficulty = float(changes["difficulty"])
        if not (1.0 <= difficulty <= 5.0):
            raise LibraryError("difficulty is a 1–5 estimate")
        concept.difficulty = difficulty

    db.commit()
    db.refresh(concept)
    return concept


def delete_concept(db: Session, user: User, concept_id: str, *, confirmed: bool) -> dict:
    """Remove a learner's own concept, and say what went with it.

    Destructive and therefore gated on an explicit confirmation, in the same
    spirit as the company platform's handoff: the server refuses and reports what
    *would* be removed, so nothing disappears on a stray click.
    """
    concept = get_concept(db, user, concept_id)
    if concept.owner_id is None:
        raise LibraryError("catalogue concepts are shared; they cannot be deleted here", status=403)

    notes = db.query(ReferenceNote).filter(ReferenceNote.concept_id == concept_id).count()
    sessions = db.query(LearningSession).filter(LearningSession.concept_id == concept_id).count()
    edges = (
        db.query(ConceptEdge)
        .filter(
            or_(ConceptEdge.from_concept_id == concept_id, ConceptEdge.to_concept_id == concept_id)
        )
        .count()
    )
    impact = {"notes": notes, "sessions": sessions, "relations": edges}

    if not confirmed:
        raise LibraryError(
            "deleting this concept also removes "
            f"{notes} note(s), {sessions} session(s) and {edges} relation(s). "
            "Resend with confirm=true if that is what you want.",
            status=409,
        )

    db.delete(concept)
    db.commit()
    return impact


# ----------------------------------------------------------------- relations


def _would_cycle(db: Session, from_id: str, to_id: str, owner_id: str | None) -> bool:
    """Would `from -> to` (a prerequisite edge) close a loop?

    Walks forward from `to`. If `from` is reachable, the new edge would create a
    cycle, and the gate in `recommend.py` would then never open: every concept in
    the loop would wait for another member of it. Only this learner's own
    prerequisite edges count — the catalogue is authored, not learned.
    """
    if from_id == to_id:
        return True
    forward: dict[str, set[str]] = {}
    for edge in db.query(ConceptEdge).filter(ConceptEdge.relation == "prerequisite").all():
        if edge.owner_id is not None and edge.owner_id != owner_id:
            continue
        forward.setdefault(edge.from_concept_id, set()).add(edge.to_concept_id)

    seen: set[str] = set()
    stack = [to_id]
    while stack:
        node = stack.pop()
        if node == from_id:
            return True
        if node in seen:
            continue
        seen.add(node)
        stack.extend(forward.get(node, ()))
    return False


def relate(
    db: Session, user: User, *, from_id: str, to_id: str, relation: str
) -> tuple[ConceptEdge, bool]:
    """Create a typed relation between two concepts the learner can see.

    Returns `(edge, created)`. Repeating the same request returns the existing
    edge rather than a duplicate, because a double-submitted form should not
    produce two arrows.
    """
    if relation not in RELATIONS:
        raise LibraryError(
            f"unknown relation {relation!r}; expected one of: {', '.join(sorted(RELATIONS))}"
        )
    if from_id == to_id:
        raise LibraryError("a concept cannot relate to itself")

    origin = get_concept(db, user, from_id)
    target = get_concept(db, user, to_id)

    existing = (
        db.query(ConceptEdge)
        .filter(
            ConceptEdge.from_concept_id == origin.id,
            ConceptEdge.to_concept_id == target.id,
            ConceptEdge.relation == relation,
            ConceptEdge.owner_id == user.id,
        )
        .first()
    )
    if existing is not None:
        return existing, False

    # A catalogue edge saying the same thing is not duplicated either: the learner
    # would otherwise see one arrow twice.
    catalogue_duplicate = (
        db.query(ConceptEdge)
        .filter(
            ConceptEdge.from_concept_id == origin.id,
            ConceptEdge.to_concept_id == target.id,
            ConceptEdge.relation == relation,
            ConceptEdge.owner_id.is_(None),
        )
        .first()
    )
    if catalogue_duplicate is not None:
        return catalogue_duplicate, False

    if relation in GATING_RELATIONS and _would_cycle(db, origin.id, target.id, user.id):
        raise LibraryError(
            "that would make the prerequisites circular, so neither concept could ever be "
            "unblocked. Check which one genuinely comes first.",
            status=409,
        )

    edge = ConceptEdge(
        owner_id=user.id,
        from_concept_id=origin.id,
        to_concept_id=target.id,
        relation=relation,
    )
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge, True


def unrelate(db: Session, user: User, edge_id: str) -> None:
    edge = db.get(ConceptEdge, edge_id)
    if edge is None or (edge.owner_id is not None and edge.owner_id != user.id):
        raise NotFound("relation not found")
    if edge.owner_id is None:
        raise LibraryError(
            "that relation is part of the catalogue every learner sees, so it cannot be removed here",
            status=403,
        )
    db.delete(edge)
    db.commit()


def relations_for(db: Session, user: User, concept_id: str) -> list[dict]:
    """Every relation touching this concept that the learner can see."""
    visible = {concept.id for concept in visible_concepts(db, user).all()}
    rows = (
        db.query(ConceptEdge)
        .filter(
            or_(ConceptEdge.from_concept_id == concept_id, ConceptEdge.to_concept_id == concept_id)
        )
        .all()
    )
    titles = {
        concept.id: concept.title
        for concept in db.query(Concept).filter(Concept.id.in_(visible)).all()
    }
    out: list[dict] = []
    for edge in rows:
        if not edge_visible(edge, visible, user):
            continue
        out.append(
            {
                "id": edge.id,
                "from_id": edge.from_concept_id,
                "to_id": edge.to_concept_id,
                "from_title": titles.get(edge.from_concept_id, ""),
                "to_title": titles.get(edge.to_concept_id, ""),
                "relation": edge.relation,
                "label": RELATIONS.get(edge.relation, {}).get("label", edge.relation),
                # Editable only if it is this learner's own edge.
                "removable": edge.owner_id == user.id,
            }
        )
    return out


# --------------------------------------------------------------------- notes

STOPWORDS = frozenset(
    "a an the is are was were be been being and or but if then than so of in on at to for with "
    "about into from by as that this these those it its i me my we our you your they them he she "
    "do does did not no yes can could should would will what why how when where which who whom "
    "whose there here also into via just very".split()
)


def search_terms(query: str) -> list[str]:
    """Lower-cased terms worth matching, duplicates removed, order kept."""
    seen: list[str] = []
    for token in re.findall(r"[a-z0-9][a-z0-9'+-]*", query.lower()):
        if len(token) < 2 or token in STOPWORDS or token in seen:
            continue
        seen.append(token)
    return seen


def score_note(query_terms: list[str], title: str, body: str) -> tuple[float, list[str]]:
    """Rank a note by how many of the query's terms it contains.

    Deliberately the same shape as the tutor's retrieval: token overlap, with a
    title hit worth three, and the matched terms returned so the result explains
    itself. No embeddings, no hidden relevance — a learner can see why a note
    matched and correct it by editing the note.
    """
    title_terms = set(re.findall(r"[a-z0-9][a-z0-9'+-]*", title.lower()))
    body_terms = set(re.findall(r"[a-z0-9][a-z0-9'+-]*", body.lower()))
    matched = [term for term in query_terms if term in title_terms or term in body_terms]
    if not matched:
        return 0.0, []
    score = sum(3.0 if term in title_terms else 1.0 for term in matched)
    return score, matched


def create_note(
    db: Session,
    user: User,
    *,
    concept_id: str,
    title: str,
    body: str,
    source_ref: str = "",
) -> ReferenceNote:
    concept = get_concept(db, user, concept_id)
    title = title.strip()
    body = body.strip()
    if not title:
        raise LibraryError("a note needs a title, so it can be found again")
    if not body:
        raise LibraryError("a note needs some content")
    if len(body) > MAX_BODY:
        raise LibraryError("that note is longer than the 20,000-character limit")

    note = ReferenceNote(
        user_id=user.id,
        concept_id=concept.id,
        title=title[:MAX_TITLE],
        body=body,
        source_ref=source_ref.strip()[:300],
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def get_note(db: Session, user: User, note_id: str) -> ReferenceNote:
    note = db.get(ReferenceNote, note_id)
    if note is None or note.user_id != user.id:
        raise NotFound("note not found")
    return note


def update_note(db: Session, user: User, note_id: str, changes: dict) -> ReferenceNote:
    note = get_note(db, user, note_id)
    if changes.get("title") is not None:
        title = str(changes["title"]).strip()
        if not title:
            raise LibraryError("a note needs a title")
        note.title = title[:MAX_TITLE]
    if changes.get("body") is not None:
        body = str(changes["body"]).strip()
        if not body:
            raise LibraryError("a note needs some content")
        if len(body) > MAX_BODY:
            raise LibraryError("that note is longer than the 20,000-character limit")
        note.body = body
    if changes.get("source_ref") is not None:
        note.source_ref = str(changes["source_ref"]).strip()[:300]
    if changes.get("concept_id") is not None:
        # Moving a note re-checks visibility: it cannot be filed under a concept
        # the learner cannot see.
        concept = get_concept(db, user, str(changes["concept_id"]))
        note.concept_id = concept.id
    note.updated_at = utcnow()
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, user: User, note_id: str) -> None:
    note = get_note(db, user, note_id)
    db.delete(note)
    db.commit()


def list_notes(
    db: Session, user: User, *, query: str = "", concept_id: str | None = None, limit: int = 50
) -> list[dict]:
    q = db.query(ReferenceNote).filter(ReferenceNote.user_id == user.id)
    if concept_id:
        # Raises NotFound for somebody else's concept, which is the right answer to
        # "show me the notes on a concept I cannot see".
        q = q.filter(ReferenceNote.concept_id == get_concept(db, user, concept_id).id)

    terms = search_terms(query)
    rows = q.order_by(ReferenceNote.updated_at.desc()).all()
    titles = {concept.id: concept.title for concept in visible_concepts(db, user).all()}

    out: list[dict] = []
    for note in rows:
        if terms:
            score, matched = score_note(terms, note.title, note.body)
            if score <= 0:
                continue
        else:
            score, matched = 0.0, []
        entry = note_payload(note, titles.get(note.concept_id, ""))
        entry["score"] = score
        entry["matched"] = matched
        out.append(entry)

    if terms:
        # Stable ordering: best match first, then most recently edited.
        out.sort(key=lambda item: (-item["score"], item["updated_at"]), reverse=False)
    return out[:limit]


def note_payload(note: ReferenceNote, concept_title: str = "") -> dict:
    return {
        "id": note.id,
        "concept_id": note.concept_id,
        "concept_title": concept_title,
        "title": note.title,
        "body": note.body,
        "source_ref": note.source_ref,
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat(),
    }


# ------------------------------------------------------------------ sessions


def start_session(
    db: Session,
    user: User,
    *,
    concept_id: str,
    objective: str,
    stopping_condition: str,
    planned_minutes: int = 25,
) -> LearningSession:
    concept = get_concept(db, user, concept_id)
    objective = objective.strip()
    stopping_condition = stopping_condition.strip()
    if len(objective) < 3:
        raise LibraryError(
            "a session needs an objective. Time spent without one is not practice, it is just time."
        )
    if len(stopping_condition) < 3:
        raise LibraryError(
            "a session needs a stopping condition, so it ends because you decided it would, "
            "not because you ran out of evening."
        )
    if not (5 <= planned_minutes <= 240):
        raise LibraryError("planned minutes must be between 5 and 240")

    # One open sitting per concept. Two would split the evidence, and the learner
    # already has a session to resume.
    open_session = (
        db.query(LearningSession)
        .filter(
            LearningSession.user_id == user.id,
            LearningSession.concept_id == concept.id,
            LearningSession.status == "open",
        )
        .first()
    )
    if open_session is not None:
        raise LibraryError(
            f"there is already an open session on this concept (started "
            f"{open_session.started_at.date().isoformat()}). Resume it, or finish it first.",
            status=409,
        )

    session = LearningSession(
        user_id=user.id,
        concept_id=concept.id,
        objective=objective,
        stopping_condition=stopping_condition,
        planned_minutes=planned_minutes,
        activities=[],
        status="open",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, user: User, session_id: str) -> LearningSession:
    session = db.get(LearningSession, session_id)
    if session is None or session.user_id != user.id:
        raise NotFound("session not found")
    return session


def _clean_activities(raw: list) -> list[dict]:
    cleaned: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            raise LibraryError("each activity must be an object with a stage")
        stage = str(item.get("stage", "")).strip()
        if stage not in ACTIVITIES:
            raise LibraryError(
                f"unknown activity {stage!r}; expected one of: {', '.join(ACTIVITIES)}"
            )
        note = str(item.get("note", "")).strip()[:500]
        cleaned.append({"stage": stage, "note": note})
    return cleaned


def update_session(db: Session, user: User, session_id: str, changes: dict) -> LearningSession:
    session = get_session(db, user, session_id)
    if session.status != "open":
        raise LibraryError(
            "this session is already closed. A finished session is a record, not a draft — "
            "start a new one rather than editing what happened.",
            status=409,
        )
    if changes.get("activities") is not None:
        session.activities = _clean_activities(list(changes["activities"]))
    if changes.get("reflection") is not None:
        session.reflection = str(changes["reflection"]).strip()
    if changes.get("objective") is not None:
        objective = str(changes["objective"]).strip()
        if len(objective) < 3:
            raise LibraryError("a session needs an objective")
        session.objective = objective
    if changes.get("stopping_condition") is not None:
        condition = str(changes["stopping_condition"]).strip()
        if len(condition) < 3:
            raise LibraryError("a session needs a stopping condition")
        session.stopping_condition = condition
    db.commit()
    db.refresh(session)
    return session


def finish_session(
    db: Session,
    user: User,
    session_id: str,
    *,
    outcome: str,
    reflection: str = "",
    evidence: str = "",
    minutes_spent: int | None = None,
) -> LearningSession:
    session = get_session(db, user, session_id)
    if session.status != "open":
        raise LibraryError("this session is already closed", status=409)
    if outcome not in ("completed", "partial", "abandoned"):
        raise LibraryError("outcome must be completed, partial or abandoned")
    if outcome in ("completed", "partial") and len(reflection.strip()) < 3:
        raise LibraryError(
            "close a session you worked in with one line of reflection. It is the part that "
            "makes the next session different, and it is not optional for a session you claim to have done."
        )
    if minutes_spent is not None and not (0 <= minutes_spent <= 600):
        raise LibraryError("minutes spent must be between 0 and 600")

    session.status = outcome
    session.reflection = reflection.strip()
    session.evidence = evidence.strip()
    session.minutes_spent = minutes_spent
    session.finished_at = utcnow()
    db.commit()
    db.refresh(session)
    return session


def list_sessions(
    db: Session, user: User, *, status: str | None = None, concept_id: str | None = None, limit: int = 50
) -> list[dict]:
    q = db.query(LearningSession).filter(LearningSession.user_id == user.id)
    if status:
        if status not in SESSION_STATUSES:
            raise LibraryError(f"unknown status {status!r}")
        q = q.filter(LearningSession.status == status)
    if concept_id:
        q = q.filter(LearningSession.concept_id == get_concept(db, user, concept_id).id)

    titles = {concept.id: concept.title for concept in visible_concepts(db, user).all()}
    rows = q.order_by(LearningSession.started_at.desc()).limit(limit).all()
    return [session_payload(session, titles.get(session.concept_id, "")) for session in rows]


def session_payload(session: LearningSession, concept_title: str = "") -> dict:
    started = session.started_at
    finished = session.finished_at
    return {
        "id": session.id,
        "concept_id": session.concept_id,
        "concept_title": concept_title,
        "objective": session.objective,
        "stopping_condition": session.stopping_condition,
        "planned_minutes": session.planned_minutes,
        "activities": session.activities or [],
        "reflection": session.reflection,
        "evidence": session.evidence,
        "status": session.status,
        "minutes_spent": session.minutes_spent,
        "started_at": started.isoformat() if started else None,
        "finished_at": finished.isoformat() if finished else None,
        # The trace of the lifecycle the session covered, for the UI to show back.
        "covered": sorted({item.get("stage", "") for item in (session.activities or []) if item.get("stage")}),
    }


def stats(db: Session, user: User) -> dict:
    """Honest counts, not a productivity score.

    Deliberately no "learning score": the product's own rule is that activity is
    not evidence. These numbers exist to answer "did I write anything down this
    week", not to become a target.
    """
    sessions = db.query(LearningSession).filter(LearningSession.user_id == user.id).all()
    notes = db.query(ReferenceNote).filter(ReferenceNote.user_id == user.id).count()
    own_concepts = db.query(Concept).filter(Concept.owner_id == user.id).count()
    finished = [s for s in sessions if s.status in ("completed", "partial")]
    return {
        "concepts_own": own_concepts,
        "notes": notes,
        "sessions_open": sum(1 for s in sessions if s.status == "open"),
        "sessions_finished": len(finished),
        "minutes_recorded": sum(s.minutes_spent or 0 for s in finished),
        "note": "Counts of what you recorded. They are not a measure of what you learned.",
    }


def new_session_id() -> str:
    return uuid.uuid4().hex

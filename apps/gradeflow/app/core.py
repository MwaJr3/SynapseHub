"""Business rules: registration, recording marks, results, ranking."""
from __future__ import annotations

from .config import DEFAULT_BANDS, MARK_MAX, MARK_MIN, GradeBand
from .models import Mark, Result, Student


class GradebookError(ValueError):
    """Base class for user-facing rule violations."""


class DuplicateStudentError(GradebookError):
    pass


class UnknownStudentError(GradebookError):
    pass


class InvalidMarkError(GradebookError):
    pass


class MarkExistsError(GradebookError):
    pass


def letter_for(score: float, bands: tuple[GradeBand, ...] = DEFAULT_BANDS) -> str:
    """Return the letter for a score. Bands are checked highest-first;
    exact boundary values fall in the higher band (75 -> A, 45 -> D)."""
    for band in sorted(bands, key=lambda b: -b.minimum):
        if score >= band.minimum:
            return band.letter
    return "F"


class Gradebook:
    def __init__(self, bands: tuple[GradeBand, ...] = DEFAULT_BANDS) -> None:
        self.bands = bands
        self._students: dict[str, Student] = {}
        self._results: dict[str, Result] = {}

    # -- registration -------------------------------------------------
    def add_student(self, student_id: str, name: str) -> Student:
        sid = (student_id or "").strip()
        if not sid:
            raise GradebookError("Student ID must not be empty.")
        if not (name or "").strip():
            raise GradebookError("Student name must not be empty.")
        if sid in self._students:
            raise DuplicateStudentError(f"Student ID {sid!r} already exists.")
        student = Student(sid, name.strip())
        self._students[sid] = student
        self._results[sid] = Result(student)
        return student

    # -- marks ---------------------------------------------------------
    def add_mark(self, student_id: str, subject: str, score: float, update: bool = False) -> Mark:
        if student_id not in self._students:
            raise UnknownStudentError(f"No student with ID {student_id!r}.")
        subj = (subject or "").strip()
        if not subj:
            raise GradebookError("Subject must not be empty.")
        try:
            value = float(score)
        except (TypeError, ValueError) as exc:
            raise InvalidMarkError(f"Mark {score!r} is not a number.") from exc
        if not MARK_MIN <= value <= MARK_MAX:
            raise InvalidMarkError(f"Mark must be between {MARK_MIN} and {MARK_MAX}.")
        result = self._results[student_id]
        if subj in result.marks and not update:
            raise MarkExistsError(
                f"A mark for {subj!r} already exists for {student_id}; use update=True to replace it."
            )
        result.marks[subj] = round(value, 2)
        return Mark(student_id, subj, round(value, 2))

    # -- results -------------------------------------------------------
    def result_for(self, student_id: str) -> dict:
        if student_id not in self._students:
            raise UnknownStudentError(f"No student with ID {student_id!r}.")
        result = self._results[student_id]
        average = result.average
        return {
            "student_id": student_id,
            "name": result.student.name,
            "marks": dict(sorted(result.marks.items())),
            "total": result.total,
            "average": average,
            "letter": None if average is None else letter_for(average, self.bands),
            "status": "complete" if result.complete else "incomplete (no marks recorded)",
        }

    def top_performers(self) -> list[dict]:
        """Highest average wins; ties are all listed. Students with no marks are
        excluded rather than treated as zero."""
        scored = []
        for sid in self._students:
            avg = self._results[sid].average
            if avg is not None:
                scored.append((avg, sid))
        if not scored:
            return []
        best = max(avg for avg, _ in scored)
        return [self.result_for(sid) for avg, sid in sorted(scored, key=lambda t: t[1]) if avg == best]

    def all_results(self) -> list[dict]:
        return [self.result_for(sid) for sid in sorted(self._students)]

    # -- persistence payloads ------------------------------------------
    def export_data(self) -> dict:
        return {
            "students": [{"student_id": s.student_id, "name": s.name} for s in self._students.values()],
            "marks": [
                {"student_id": sid, "subject": subj, "score": score}
                for sid, result in self._results.items()
                for subj, score in result.marks.items()
            ],
        }

    def import_data(self, data: dict) -> None:
        for s in data.get("students", []):
            self.add_student(s["student_id"], s["name"])
        for m in data.get("marks", []):
            self.add_mark(m["student_id"], m["subject"], m["score"], update=True)

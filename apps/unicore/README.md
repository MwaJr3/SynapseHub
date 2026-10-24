# UniCore — university management system (CLI + SQLite)

Engineering catalogue **Project 7** (Intermediate 3/5).

## Overview
Modular application for core academic operations: student and lecturer
registration, course management, enrolment, grade recording, transcript
generation and student search.

## Architecture (matches the catalogue blueprint)

```
app/
├── models/         student, lecturer, course, enrolment entities
├── services/       student_service, course_service, grade_service
├── repositories/   student/course/enrolment repositories (persistence only)
├── storage/        database.py (SQLite schema + connection)
├── exceptions.py   domain exception hierarchy
└── cli.py          thin presentation layer
```

Domain logic never touches SQL directly; repositories never contain business
rules. The catalogue's "JSON first, then SQLite" progression is documented as
having been **implemented at the SQLite stage** (the target design).

## Business rules (tested)
- Student IDs and course codes are unique (duplicate → clear error).
- Enrolment requires an existing student and course; duplicate enrolment is
  rejected (database UNIQUE constraint backs the rule).
- Grades must be 0–100 and can only be recorded for enrolled students.
- Transcripts state a **documented unweighted mean** — credit weighting is never
  silently approximated.

## Usage
```bash
python3 -m app.cli register-student S-001 "Ada" --programme CS
python3 -m app.cli add-course CS101 "Intro to CS" --credits 3
python3 -m app.cli enrol S-001 CS101
python3 -m app.cli record-grade S-001 CS101 78.5
python3 -m app.cli transcript S-001
```

## Testing
`python3 -m pytest tests/ -q` — duplicate identifiers, course rules, enrolment
rules, grade validation, transcript math (including in-progress courses),
search.

## Limitations
Single-user CLI tool; PostgreSQL, web interface, roles and authentication are
deliberately advanced items (the multi-user platform exists separately as
`campusflow`). Screenshots pending capture.

## Future enhancements
Credit-weighted GPA, transcript exports, attendance/timetable modules.

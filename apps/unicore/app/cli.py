"""Command-line interface over the services layer."""
from __future__ import annotations

import argparse
import json
import sys

from app.exceptions import UnicoreError
from app.repositories.course_repository import CourseRepository
from app.repositories.enrolment_repository import EnrolmentRepository
from app.repositories.student_repository import StudentRepository
from app.services.course_service import CourseService
from app.services.grade_service import GradeService
from app.services.student_service import StudentService
from app.storage.database import connect


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="unicore", description="University management system.")
    parser.add_argument("--db", default="unicore.db")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("register-student"); p.add_argument("student_id"); p.add_argument("name")
    p.add_argument("--email", default=""); p.add_argument("--programme", default="")
    p = sub.add_parser("add-lecturer"); p.add_argument("staff_id"); p.add_argument("name")
    p.add_argument("--department", default="")
    p = sub.add_parser("add-course"); p.add_argument("code"); p.add_argument("title")
    p.add_argument("--credits", type=int, default=3); p.add_argument("--lecturer", type=int)
    p = sub.add_parser("enrol"); p.add_argument("student"); p.add_argument("course")
    p = sub.add_parser("record-grade"); p.add_argument("student"); p.add_argument("course"); p.add_argument("grade", type=float)
    p = sub.add_parser("transcript"); p.add_argument("student")
    p = sub.add_parser("search"); p.add_argument("query")
    args = parser.parse_args(argv)
    try:
        conn = connect(args.db)
        students = StudentRepository(conn)
        courses = CourseRepository(conn)
        enrolments = EnrolmentRepository(conn)
        s_svc = StudentService(students)
        c_svc = CourseService(courses, students, enrolments)
        g_svc = GradeService(students, courses, enrolments)
        if args.command == "register-student":
            s = s_svc.register(args.student_id, args.name, args.email, args.programme)
            print(f"student #{s.id} ({s.student_id})")
        elif args.command == "add-lecturer":
            l = courses.add_lecturer(args.staff_id, args.name, args.department)
            print(f"lecturer #{l.id} ({l.staff_id})")
        elif args.command == "add-course":
            c = c_svc.create_course(args.code, args.title, args.credits, args.lecturer)
            print(f"course #{c.id} ({c.code})")
        elif args.command == "enrol":
            e = c_svc.enrol(args.student, args.course)
            print(f"enrolment #{e.id}")
        elif args.command == "record-grade":
            e = g_svc.record_grade(args.student, args.course, args.grade)
            print(f"grade {e.grade} recorded")
        elif args.command == "transcript":
            print(json.dumps(g_svc.transcript(args.student), indent=2))
        else:
            for s in s_svc.search(args.query):
                print(f"{s.student_id}  {s.name}  {s.programme}")
        return 0
    except UnicoreError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

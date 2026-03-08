from __future__ import annotations

from . import (
    cluster,
    course,
    institution,
    professor_course,
    question,
    session,
    student_course,
    user,
    user_institution,
)

MODEL_DEFS = [
    institution,
    course,
    user,
    user_institution,
    student_course,
    professor_course,
    session,
    question,
    cluster,
]

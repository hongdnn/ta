from __future__ import annotations

from . import (
    cluster,
    cluster_weekly_stats,
    course,
    institution,
    message,
    professor_course,
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
    message,
    cluster,
    cluster_weekly_stats,
]

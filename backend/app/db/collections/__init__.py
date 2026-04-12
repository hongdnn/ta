from __future__ import annotations

from . import (
    cluster,
    cluster_weekly_stats,
    course,
    course_material,
    institution,
    message,
    professor_course,
    session,
    student_course,
    user,
    user_institution,
    weekly_improvements,
)

MODEL_DEFS = [
    institution,
    course,
    course_material,
    user,
    user_institution,
    student_course,
    professor_course,
    session,
    message,
    cluster,
    cluster_weekly_stats,
    weekly_improvements,
]

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException

from app.agents.improvement_tutor import generate_weekly_improvements, rerank_material_chunks
from app.chroma.material_store import ChromaMaterialStore
from app.core.config import settings
from app.repositories.cluster_repository import ClusterRepository
from app.repositories.cluster_weekly_stats_repository import ClusterWeeklyStatsRepository
from app.repositories.course_repository import CourseRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.user_repository import UserRepository
from app.repositories.weekly_improvements_repository import WeeklyImprovementsRepository
from app.schemas.analytics import (
    CourseQuestionsAnalyticsResponse,
    CourseQuestionsQuery,
    PastQuestionItem,
    TopQuestionItem,
    WeeklyImprovementItem,
)


MAX_REVIEW_MATERIALS_PER_IMPROVEMENT = 3


def _parse_utc_iso(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.astimezone(timezone.utc)


def _canonical_week_start(range_start_utc: datetime) -> datetime:
    return range_start_utc


class AnalyticsService:
    def __init__(
        self,
        *,
        course_repo: CourseRepository,
        user_repo: UserRepository,
        cluster_repo: ClusterRepository,
        message_repo: MessageRepository,
        cluster_weekly_stats_repo: ClusterWeeklyStatsRepository,
        weekly_improvements_repo: WeeklyImprovementsRepository,
        chroma_material_store: ChromaMaterialStore,
    ):
        self.course_repo = course_repo
        self.user_repo = user_repo
        self.cluster_repo = cluster_repo
        self.message_repo = message_repo
        self.cluster_weekly_stats_repo = cluster_weekly_stats_repo
        self.weekly_improvements_repo = weekly_improvements_repo
        self.chroma_material_store = chroma_material_store

    def _build_improvement_candidates(
        self,
        *,
        top_items: list[TopQuestionItem],
        past_items: list[PastQuestionItem],
    ) -> list[dict[str, Any]]:
        merged: dict[str, dict[str, Any]] = {}
        for item in top_items[:5]:
            cid = item.cluster_id
            merged[cid] = {
                "cluster_id": cid,
                "question": item.question,
                "asks_this_week": int(item.asks_this_week),
                "asks_before_week": 0,
                "asks_total_until_now": int(item.asks_this_week),
            }
        for item in past_items[:5]:
            cid = item.cluster_id
            current = merged.get(cid)
            if current is None:
                merged[cid] = {
                    "cluster_id": cid,
                    "question": item.question,
                    "asks_this_week": int(item.asks_this_week),
                    "asks_before_week": int(item.asks_before_week),
                    "asks_total_until_now": int(item.asks_total_until_now),
                }
                continue
            current["asks_this_week"] = max(current["asks_this_week"], int(item.asks_this_week))
            current["asks_before_week"] = max(current["asks_before_week"], int(item.asks_before_week))
            current["asks_total_until_now"] = max(current["asks_total_until_now"], int(item.asks_total_until_now))
            if not current.get("question"):
                current["question"] = item.question

        items = list(merged.values())
        items.sort(
            key=lambda x: (int(x.get("asks_total_until_now", 0)), int(x.get("asks_this_week", 0))),
            reverse=True,
        )
        return items[:5]

    def _find_review_materials(
        self,
        *,
        course_id: str,
        question: str,
    ) -> list[dict[str, Any]]:
        if not self.chroma_material_store.enabled or not question.strip():
            print(
                "[BACKEND][materials][search] skipped: "
                f"chroma_enabled={self.chroma_material_store.enabled} question_empty={not question.strip()}",
                flush=True,
            )
            return []

        print(
            "[BACKEND][materials][search] start "
            f"course_id={course_id} n_results=10 question={question[:120]!r}",
            flush=True,
        )
        semantic_matches = self.chroma_material_store.query_relevant_chunks(
            course_id=course_id,
            text=question,
            n_results=10,
        )
        print(
            f"[BACKEND][materials][search] chroma_results={len(semantic_matches)}",
            flush=True,
        )
        candidates: list[dict[str, Any]] = []
        for match in semantic_matches:
            metadata = match.metadata or {}
            print(
                "[BACKEND][materials][search] candidate "
                f"distance={match.distance:.4f} material_id={metadata.get('material_id')} "
                f"file={metadata.get('file_name')} page={metadata.get('page')} chunk={metadata.get('chunk_index')}",
                flush=True,
            )
            material_id = str(metadata.get("material_id", "")).strip()
            file_name = str(metadata.get("file_name", "")).strip()
            try:
                page = int(metadata.get("page", 0) or 0)
            except Exception:
                page = 0
            if not material_id or not file_name:
                continue
            candidates.append(
                {
                    "material_id": material_id,
                    "file_name": file_name,
                    "page": page,
                    "text": match.text,
                }
            )

        if not candidates:
            print("[BACKEND][materials][search] no valid Chroma candidates", flush=True)
            return []

        print(
            f"[BACKEND][materials][search] candidates={len(candidates)}; running Cohere rerank",
            flush=True,
        )
        reranked = rerank_material_chunks(
            question=question,
            chunks=candidates,
        )
        selected: list[dict[str, Any]] = []
        seen: set[tuple[str, int]] = set()
        for item in reranked:
            score = float(item.get("rerank_score", 0.0))
            if score <= settings.chroma_material_rerank_score_threshold:
                print(
                    "[BACKEND][materials][select] rejected "
                    f"score={score:.4f} threshold>{settings.chroma_material_rerank_score_threshold} "
                    f"file={item.get('file_name')} page={item.get('page')}",
                    flush=True,
                )
                continue
            key = (str(item.get("material_id", "")), int(item.get("page", 0) or 0))
            if key in seen:
                continue
            seen.add(key)
            selected.append(
                {
                    "material_id": key[0],
                    "file_name": str(item.get("file_name", "")),
                    "page": key[1],
                    "score": score,
                }
            )
            print(
                "[BACKEND][materials][select] accepted "
                f"score={score:.4f} file={item.get('file_name')} page={key[1]} material_id={key[0]}",
                flush=True,
            )
            if len(selected) >= MAX_REVIEW_MATERIALS_PER_IMPROVEMENT:
                break
        print(f"[BACKEND][materials][select] selected_count={len(selected)}", flush=True)
        return selected

    def _find_review_materials_by_cluster(
        self,
        *,
        course_id: str,
        candidates: list[dict[str, Any]],
    ) -> dict[str, list[dict[str, Any]]]:
        review_materials_by_cluster: dict[str, list[dict[str, Any]]] = {}
        if not candidates:
            return review_materials_by_cluster

        def run_one(item: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
            cluster_id = str(item.get("cluster_id", ""))
            try:
                materials = self._find_review_materials(
                    course_id=course_id,
                    question=str(item.get("question", "")),
                )
            except Exception as exc:  # noqa: BLE001
                print(f"[BACKEND][improvements] material rerank failed cluster={cluster_id}: {exc}", flush=True)
                materials = []
            return cluster_id, materials

        max_workers = min(5, len(candidates))
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for cluster_id, materials in executor.map(run_one, candidates):
                review_materials_by_cluster[cluster_id] = materials
        return review_materials_by_cluster

    def get_course_questions_analytics(
        self,
        *,
        payload: CourseQuestionsQuery,
        user_id: str,
        user_type: str | None,
    ) -> CourseQuestionsAnalyticsResponse:
        if user_type != "professor":
            raise HTTPException(status_code=403, detail="Only professor accounts can access this resource")

        if not ObjectId.is_valid(payload.course_id):
            raise HTTPException(status_code=422, detail="Invalid course_id")
        course_doc = self.course_repo.get_by_id(payload.course_id)
        if not course_doc:
            raise HTTPException(status_code=404, detail="Course not found")

        professor_institutions = set(self.user_repo.list_institution_ids(user_id=user_id, role="professor"))
        course_institution = str(course_doc.get("institution_id"))
        if course_institution not in professor_institutions:
            raise HTTPException(status_code=403, detail="You do not have access to this course")

        try:
            range_start_utc = _parse_utc_iso(payload.range_start_utc)
            range_end_utc = _parse_utc_iso(payload.range_end_utc)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=422, detail="Invalid range_start_utc/range_end_utc") from exc
        if range_end_utc <= range_start_utc:
            raise HTTPException(status_code=422, detail="range_end_utc must be greater than range_start_utc")

        course_oid = ObjectId(payload.course_id)
        top_rows = self.cluster_weekly_stats_repo.list_for_range(
            course_id=course_oid,
            range_start_utc=range_start_utc,
            range_end_utc=range_end_utc,
            limit=payload.limit_top,
        )
        past_rows = self.cluster_weekly_stats_repo.list_past_repeated_for_range(
            course_id=course_oid,
            range_start_utc=range_start_utc,
            range_end_utc=range_end_utc,
            limit=payload.limit_past,
        )
        cluster_ids = [row["cluster_id"] for row in [*top_rows, *past_rows] if isinstance(row.get("cluster_id"), ObjectId)]
        unique_cluster_ids = list(dict.fromkeys(cluster_ids))
        cluster_docs = self.cluster_repo.find_by_ids(unique_cluster_ids)
        representative_message_ids = [
            c.get("representative_message_id")
            for c in cluster_docs
            if isinstance(c.get("representative_message_id"), ObjectId)
        ]
        message_docs = self.message_repo.find_by_ids(representative_message_ids)
        message_by_id = {str(m["_id"]): m for m in message_docs}
        cluster_question_by_id: dict[str, str] = {}
        for cluster in cluster_docs:
            cid = str(cluster["_id"])
            rep_id = cluster.get("representative_message_id")
            if isinstance(rep_id, ObjectId):
                cluster_question_by_id[cid] = str(message_by_id.get(str(rep_id), {}).get("content", "")).strip()

        top_items = [
            TopQuestionItem(
                cluster_id=str(row["cluster_id"]),
                question=cluster_question_by_id.get(str(row["cluster_id"]), "(missing question)"),
                asks_this_week=int(row.get("asks_this_week", 0)),
            )
            for row in top_rows
        ]

        past_items = [
            PastQuestionItem(
                cluster_id=str(row["cluster_id"]),
                question=cluster_question_by_id.get(str(row["cluster_id"]), "(missing question)"),
                asks_before_week=int(row.get("asks_before_week", 0)),
                asks_this_week=int(row.get("asks_this_week", 0)),
                asks_total_until_now=int(row.get("asks_total_until_now", 0)),
            )
            for row in past_rows
        ]

        candidates = self._build_improvement_candidates(top_items=top_items, past_items=past_items)
        improvements_payload: list[dict[str, Any]] = []
        if candidates:
            improvement_week_start = _canonical_week_start(range_start_utc)
            fingerprint = [str(item["cluster_id"]) for item in candidates]
            weekly_doc = self.weekly_improvements_repo.get_for_range(
                course_id=course_oid,
                week_start=improvement_week_start,
            )
            stored_improvements = (weekly_doc or {}).get("improvements", []) or []
            fingerprint_unchanged = bool(weekly_doc and weekly_doc.get("question_fingerprint") == fingerprint)

            if fingerprint_unchanged:
                improvements_payload = [
                    {
                        **item,
                        "review_materials": item.get("review_materials", []) if isinstance(item, dict) else [],
                    }
                    for item in stored_improvements
                    if isinstance(item, dict)
                ]
            else:
                try:
                    with ThreadPoolExecutor(max_workers=2) as executor:
                        improvements_future = executor.submit(generate_weekly_improvements, candidates)
                        materials_future = executor.submit(
                            self._find_review_materials_by_cluster,
                            course_id=payload.course_id,
                            candidates=candidates,
                        )
                        improvements_payload, _ = improvements_future.result()
                        review_materials_by_cluster = materials_future.result()

                    improvements_payload = [
                        {
                            **item,
                            "review_materials": review_materials_by_cluster.get(str(item.get("cluster_id", "")), []),
                        }
                        for item in improvements_payload
                    ]
                    now = datetime.now(timezone.utc)
                    self.weekly_improvements_repo.upsert_for_range(
                        course_id=course_oid,
                        week_start=improvement_week_start,
                        question_fingerprint=fingerprint,
                        improvements=improvements_payload,
                        now=now,
                    )
                except Exception as exc:  # noqa: BLE001
                    print(f"[BACKEND][improvements] generation failed: {exc}", flush=True)
                    if weekly_doc:
                        improvements_payload = weekly_doc.get("improvements", []) or []

        weekly_improvements = [
            WeeklyImprovementItem(
                cluster_id=str(item.get("cluster_id", "")),
                question=str(item.get("question", "")),
                asks_this_week=int(item.get("asks_this_week", 0)),
                asks_before_week=int(item.get("asks_before_week", 0)),
                asks_total_until_now=int(item.get("asks_total_until_now", 0)),
                problem=str(item.get("problem", "")),
                title=str(item.get("title", "")),
                solution=str(item.get("solution", "")),
                review_materials=[
                    {
                        "material_id": str(material.get("material_id", "")),
                        "file_name": str(material.get("file_name", "")),
                        "page": int(material.get("page", 0) or 0),
                        "score": float(material.get("score", 0.0) or 0.0),
                    }
                    for material in (item.get("review_materials", []) or [])
                    if isinstance(material, dict) and str(material.get("material_id", "")).strip()
                ],
            )
            for item in improvements_payload
            if str(item.get("cluster_id", "")).strip()
        ]

        return CourseQuestionsAnalyticsResponse(
            course_id=payload.course_id,
            timezone=payload.timezone,
            range_start_utc=range_start_utc.isoformat(),
            range_end_utc=range_end_utc.isoformat(),
            top_questions_this_week=top_items,
            past_questions=past_items,
            weekly_improvements=weekly_improvements,
        )

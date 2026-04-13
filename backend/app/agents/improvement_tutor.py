from __future__ import annotations

import json
import os
from typing import Any

import google.genai as genai
import requests
from google.genai import types


def _extract_json_array(raw: str) -> list[dict[str, Any]]:
    text = (raw or "").strip()
    if not text:
        return []
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        pass

    start = text.find("[")
    end = text.rfind("]")
    if start >= 0 and end > start:
        snippet = text[start : end + 1]
        try:
            parsed = json.loads(snippet)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _extract_json_object(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        snippet = text[start : end + 1]
        try:
            parsed = json.loads(snippet)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _get_vertex_client() -> genai.Client:
    project = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1").strip()
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is required")
    return genai.Client(vertexai=True, project=project, location=location)


def generate_weekly_improvements(candidates: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], str]:
    if not candidates:
        return [], os.getenv("IMPROVEMENT_MODEL", "gemini-2.5-flash").strip()

    model = os.getenv("IMPROVEMENT_MODEL", "gemini-2.5-flash").strip()
    client = _get_vertex_client()

    normalized: list[dict[str, Any]] = []

    for item in candidates:
        source = {
            "cluster_id": str(item.get("cluster_id", "")),
            "question": str(item.get("question", "")).strip(),
            "asks_this_week": int(item.get("asks_this_week", 0)),
            "asks_before_week": int(item.get("asks_before_week", 0)),
            "asks_total_until_now": int(item.get("asks_total_until_now", 0)),
        }
        cid = source["cluster_id"]
        count = source["asks_total_until_now"] or source["asks_this_week"] or 1
        generated: dict[str, Any] = {}
        prompt = (
            "You are a teaching-improvement tutor agent.\n"
            "Generate exactly one JSON object. No markdown.\n"
            "Schema:\n"
            "{\n"
            '  "problem": "string",\n'
            '  "title": "string",\n'
            '  "solution": "string"\n'
            "}\n\n"
            "Rules:\n"
            "1) problem MUST start with either:\n"
            '   - "Students frequently asked about ..."\n'
            '   - "Students struggled with ..."\n'
            "2) title must be short and actionable.\n"
            "3) solution should be concrete and practical in 1-2 short sentences.\n\n"
            f"Input question: {source['question']}\n"
            f"Asks this week: {source['asks_this_week']}\n"
            f"Asks before week: {source['asks_before_week']}\n"
            f"Asks total until now: {source['asks_total_until_now']}\n"
        )
        try:
            result = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=600,
                ),
            )
            generated = _extract_json_object(result.text or "")
        except Exception:
            generated = {}

        problem = str(generated.get("problem", "")).strip()
        title = str(generated.get("title", "")).strip()
        solution = str(generated.get("solution", "")).strip()

        if not problem:
            problem = f"Students frequently asked about {source['question']}"
        if not title:
            title = "Reinforce this concept with a targeted walkthrough"
        if not solution:
            solution = f"{count} questions about this topic. Add a 2-minute focused example before moving to the next step."

        normalized.append(
            {
                "cluster_id": cid,
                "question": source["question"],
                "asks_this_week": source["asks_this_week"],
                "asks_before_week": source["asks_before_week"],
                "asks_total_until_now": source["asks_total_until_now"],
                "problem": problem,
                "title": title,
                "solution": solution,
            }
        )
    return normalized, model


def rerank_material_chunks(
    *,
    question: str,
    chunks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not question.strip() or not chunks:
        return []

    api_key = os.getenv("COHERE_API_KEY", "").strip()
    if not api_key:
        print("[BACKEND][materials][cohere] skipped: COHERE_API_KEY is missing", flush=True)
        return []
    model = os.getenv("COHERE_RERANK_MODEL", "rerank-v4.0-pro").strip() or "rerank-v4.0-pro"
    documents = [
        (
            f"File: {chunk.get('file_name', '')}\n"
            f"Page: {int(chunk.get('page', 0) or 0)}\n"
            f"Text:\n{str(chunk.get('text', ''))[:2500]}"
        )
        for chunk in chunks
    ]
    query = (
        "Find course material that helps a professor review this student question in the next class.\n"
        f"Student question: {question}"
    )
    try:
        print(
            f"[BACKEND][materials][cohere] rerank start model={model} candidates={len(documents)} "
            f"question={question[:120]!r}",
            flush=True,
        )
        response = requests.post(
            "https://api.cohere.com/v2/rerank",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "query": query,
                "documents": documents,
                "top_n": len(documents),
            },
            timeout=20,
        )
        response.raise_for_status()
        rows = response.json().get("results", [])
    except Exception as exc:  # noqa: BLE001
        print(f"[BACKEND][materials][cohere] rerank failed: {exc}", flush=True)
        return []

    scored: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        try:
            index = int(row.get("index"))
            score = float(row.get("relevance_score"))
        except Exception:
            continue
        if 0 <= index < len(chunks):
            item = dict(chunks[index])
            item["rerank_score"] = max(0.0, min(score, 1.0))
            scored.append(item)
    scored.sort(key=lambda item: float(item.get("rerank_score", 0.0)), reverse=True)
    for item in scored:
        print(
            "[BACKEND][materials][cohere] "
            f"score={float(item.get('rerank_score', 0.0)):.4f} "
            f"file={item.get('file_name')} page={item.get('page')}",
            flush=True,
        )
    return scored

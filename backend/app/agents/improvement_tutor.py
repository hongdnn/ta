from __future__ import annotations

import json
import os
from typing import Any

import google.genai as genai
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

from __future__ import annotations

import json
import os
import time
from typing import TypedDict

import google.genai as genai
from google.genai import types
from langgraph.graph import END, START, StateGraph

from .stt import transcribe_file
from .vision_llm import describe_frame_with_gemini


class SessionState(TypedDict):
    last_context_summary: str
    history: list[dict[str, str]]
    updated_at: float


SESSION_MEMORY: dict[str, SessionState] = {}


class AssistState(TypedDict, total=False):
    session_id: str
    user_text: str
    capture_triggered: bool
    audio_tmp_path: str | None
    frame_bytes: bytes | None
    transcript: str
    frame_analysis: str
    context_summary: str
    intent: str
    route: str
    should_run_context: bool
    answer_goal: str
    router_reason: str
    wants_context_reference: bool
    answer: str
    language: str | None
    duration_seconds: float | None


def _is_useful_signal(text: str, *, min_words: int) -> bool:
    cleaned = (text or "").strip()
    if not cleaned:
        return False
    words = cleaned.split()
    if len(words) < min_words:
        return False
    alpha_count = sum(1 for ch in cleaned if ch.isalpha())
    return alpha_count >= 30


def _extract_json_object(raw: str) -> dict:
    text = (raw or "").strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        snippet = text[start : end + 1]
        try:
            return json.loads(snippet)
        except Exception:
            return {}
    return {}


def _get_vertex_client() -> genai.Client:
    project = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1").strip()
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is required")
    return genai.Client(vertexai=True, project=project, location=location)


def classify_intent_node(state: AssistState) -> AssistState:
    user_text = (state.get("user_text") or "").strip()
    capture_triggered = bool(state.get("capture_triggered"))

    if not user_text:
        result = {
            "intent": "context_only",
            "route": "context_only",
            "should_run_context": True,
            "answer_goal": "Explain the captured lesson moment clearly for the student.",
            "router_reason": "No user text provided; treat as capture-driven context explanation.",
            "wants_context_reference": True,
        }
        print(
            f"[TA-ASSIST][classify] session={state.get('session_id')} user_text=(empty) "
            f"capture_triggered={capture_triggered} -> intent={result['intent']} route={result['route']}",
            flush=True,
        )
        return result

    router_model = os.getenv("ROUTER_MODEL", "gemini-2.0-flash-lite").strip()
    client = _get_vertex_client()
    prompt = (
        "You are a routing agent for a teaching assistant.\n"
        "Understand what the user actually wants and return JSON only.\n"
        "Do not use markdown.\n"
        "Schema:\n"
        "{\n"
        '  "intent": "context_only|theory_only|context_plus_theory",\n'
        '  "should_run_context": true|false,\n'
        '  "wants_context_reference": true|false,\n'
        '  "answer_goal": "one sentence describing what final answer must do",\n'
        '  "router_reason": "short reason"\n'
        "}\n"
        "Use wants_context_reference=true if user asks about this case/this lesson/what is on screen/current explanation.\n"
        "Use should_run_context=true when context is needed or capture was triggered.\n"
        "If user asks pure theory not tied to current context, should_run_context=false.\n\n"
        f"capture_triggered={capture_triggered}\n"
        f"user_text={user_text}"
    )

    payload: dict = {}
    try:
        result = client.models.generate_content(
            model=router_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=300,
            ),
        )
        payload = _extract_json_object(result.text or "")
    except Exception:
        payload = {}

    label = str(payload.get("intent", "")).strip().lower()
    if label not in {"context_only", "theory_only", "context_plus_theory"}:
        label = "context_only" if capture_triggered else "theory_only"

    wants_context_reference = bool(payload.get("wants_context_reference", False))
    if capture_triggered:
        wants_context_reference = True

    should_run_context = bool(payload.get("should_run_context", False))
    if capture_triggered or label in {"context_only", "context_plus_theory"}:
        should_run_context = True

    answer_goal = str(payload.get("answer_goal", "")).strip()
    if not answer_goal:
        answer_goal = "Answer the user clearly and in a teaching-assistant style."

    router_reason = str(payload.get("router_reason", "")).strip()
    if not router_reason:
        router_reason = "Fallback routing applied."

    result = {
        "intent": label,
        "route": label,
        "should_run_context": should_run_context,
        "answer_goal": answer_goal,
        "router_reason": router_reason,
        "wants_context_reference": wants_context_reference,
    }
    print(
        f"[TA-ASSIST][classify] session={state.get('session_id')} capture_triggered={capture_triggered} "
        f"intent={label} should_run_context={should_run_context} wants_context_reference={wants_context_reference}",
        flush=True,
    )
    print(
        f"[TA-ASSIST][classify] goal={answer_goal} reason={router_reason}",
        flush=True,
    )
    return result


def context_node(state: AssistState) -> AssistState:
    transcript = ""
    frame_analysis = ""
    language = None
    duration_seconds = None

    audio_tmp_path = state.get("audio_tmp_path")
    frame_bytes = state.get("frame_bytes")

    if audio_tmp_path:
        try:
            transcript, language, duration_seconds = transcribe_file(audio_tmp_path)
            print(
                f"[TA-ASSIST][context] STT done language={language} duration={duration_seconds} "
                f"transcript_len={len(transcript)}",
                flush=True,
            )
        except Exception:
            transcript = ""
            print("[TA-ASSIST][context] STT failed -> transcript empty", flush=True)

    if frame_bytes:
        try:
            frame_analysis = describe_frame_with_gemini(frame_bytes, "")
            print(
                f"[TA-ASSIST][context] Frame analysis done len={len(frame_analysis)}",
                flush=True,
            )
        except Exception:
            frame_analysis = ""
            print("[TA-ASSIST][context] Frame analysis failed -> empty", flush=True)

    print("[TA-ASSIST][context] OCR skipped (disabled in current flow)", flush=True)

    if transcript or frame_analysis:
        context_summary = (
            "Current captured lesson context:\n"
            f"- Transcript: {transcript or '(empty)'}\n"
            f"- Visual analysis: {frame_analysis or '(empty)'}"
        )
    else:
        session = SESSION_MEMORY.get(state["session_id"])
        context_summary = session["last_context_summary"] if session else ""

    return {
        "transcript": transcript,
        "frame_analysis": frame_analysis,
        "context_summary": context_summary,
        "language": language,
        "duration_seconds": duration_seconds,
    }


def tutor_node(state: AssistState) -> AssistState:
    tutor_model = os.getenv("TUTOR_MODEL", "gemini-2.5-flash").strip()
    tutor_max_output_tokens = int(os.getenv("TUTOR_MAX_OUTPUT_TOKENS", "2400").strip())
    client = _get_vertex_client()

    session = SESSION_MEMORY.get(state["session_id"], {"history": [], "last_context_summary": "", "updated_at": 0.0})
    history = session.get("history", [])[-4:]
    history_text = "\n".join([f"Q: {h['q']}\nA: {h['a']}" for h in history]) or "(none)"

    user_text = (state.get("user_text") or "").strip()
    transcript = (state.get("transcript") or "").strip()
    frame_analysis = (state.get("frame_analysis") or "").strip()
    router_reason = (state.get("router_reason") or "").strip()
    answer_goal = (state.get("answer_goal") or "").strip()
    wants_context_reference = bool(state.get("wants_context_reference"))

    transcript_useful = _is_useful_signal(transcript, min_words=18)
    frame_useful = _is_useful_signal(frame_analysis, min_words=30)

    context_parts: list[str] = []
    if frame_useful:
        context_parts.append(f"Visual lecture signal:\n{frame_analysis}")
    if transcript_useful:
        context_parts.append(f"Audio lecture signal:\n{transcript}")
    usable_context = "\n\n".join(context_parts).strip()

    if not usable_context:
        usable_context = "(No strong lecture signal detected from current capture.)"

    memory_context = (session.get("last_context_summary") or "").strip()
    context_summary = (state.get("context_summary") or memory_context or "").strip()

    if wants_context_reference and not context_summary and usable_context == "(No strong lecture signal detected from current capture.)":
        answer = (
            "I need a capture-linked context for this question because you asked about the current lesson case. "
            "Please press Capture Moment, then ask again. I will use the captured audio and frame context to explain it in that lesson."
        )
        print(
            f"[TA-ASSIST][tutor] context required but unavailable answer_len={len(answer)}",
            flush=True,
        )
        return {"answer": answer}

    user_question = user_text or "Explain this captured lesson moment."
    mode = "question_focused" if user_text else "context_summary"

    prompt = (
        "You are a teaching assistant.\n"
        "Write plain text only. No markdown, no bullet points, no JSON.\n"
        "Always produce a complete explanation, not a one-line answer.\n"
        "Target 220-420 words unless context is missing.\n"
        "If context is weak, state that briefly and still provide the best lesson-oriented explanation.\n"
        "Prioritize what helps a student learn this moment.\n\n"
        f"Mode: {mode}\n"
        f"Intent: {state.get('intent', '')}\n"
        f"Router reason: {router_reason or '(none)'}\n"
        f"Answer goal: {answer_goal or '(none)'}\n"
        f"Wants context reference: {wants_context_reference}\n"
        f"Recent QA history:\n{history_text}\n\n"
        f"Usable current context:\n{usable_context}\n\n"
        f"Original full context summary:\n{context_summary or '(none)'}\n\n"
        f"User question:\n{user_question}\n\n"
        "Rules:\n"
        "1) If user question is specific, answer it first, then connect to the current lesson moment.\n"
        "2) If user question is empty/generic (like explain this), summarize what is being taught now, "
        "what concept is on screen, and what the student should focus on next.\n"
        "3) Validate usefulness of audio/visual context and ignore noisy/unrelated parts.\n"
        "4) End with a short next-step suggestion for the student."
    )

    response = client.models.generate_content(
        model=tutor_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=tutor_max_output_tokens,
        ),
    )
    answer = (response.text or "").strip()
    if len(answer) < 220 and usable_context != "(No strong lecture signal detected from current capture.)":
        expansion_prompt = (
            "Rewrite and expand this teaching answer for clarity and completeness.\n"
            "Write plain text only and keep it lesson-focused.\n"
            "Target 260-420 words.\n\n"
            f"Answer draft:\n{answer}\n\n"
            f"Usable context:\n{usable_context}\n\n"
            f"User question:\n{user_question}"
        )
        second = client.models.generate_content(
            model=tutor_model,
            contents=expansion_prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=tutor_max_output_tokens,
            ),
        )
        expanded = (second.text or "").strip()
        if expanded:
            answer = expanded
    print(
        f"[TA-ASSIST][tutor] model={tutor_model} answer_len={len(answer)} intent={state.get('intent')}",
        flush=True,
    )
    return {"answer": answer}


def save_memory_node(state: AssistState) -> AssistState:
    sid = state["session_id"]
    existing = SESSION_MEMORY.get(sid, {"last_context_summary": "", "history": [], "updated_at": 0.0})

    context_summary = state.get("context_summary") or existing["last_context_summary"]
    history = existing["history"]
    user_text = (state.get("user_text") or "").strip()
    answer = (state.get("answer") or "").strip()
    if user_text or answer:
        history = [*history, {"q": user_text or "(capture)", "a": answer}]
        if len(history) > 20:
            history = history[-20:]

    SESSION_MEMORY[sid] = {
        "last_context_summary": context_summary,
        "history": history,
        "updated_at": time.time(),
    }
    print(
        f"[TA-ASSIST][memory] session={sid} history_items={len(history)} "
        f"context_len={len(context_summary)}",
        flush=True,
    )
    return {}


def build_graph():
    graph = StateGraph(AssistState)
    graph.add_node("classify_intent", classify_intent_node)
    graph.add_node("context_node", context_node)
    graph.add_node("tutor_node", tutor_node)
    graph.add_node("save_memory", save_memory_node)

    graph.add_edge(START, "classify_intent")

    def route_after_intent(state: AssistState):
        return "context_node" if state.get("should_run_context") else "tutor_node"

    graph.add_conditional_edges("classify_intent", route_after_intent)
    graph.add_edge("context_node", "tutor_node")
    graph.add_edge("tutor_node", "save_memory")
    graph.add_edge("save_memory", END)
    return graph.compile()


ASSIST_GRAPH = build_graph()


def run_assist(
    *,
    session_id: str,
    user_text: str,
    capture_triggered: bool,
    audio_tmp_path: str | None,
    frame_bytes: bytes | None,
) -> AssistState:
    result = ASSIST_GRAPH.invoke(
        {
            "session_id": session_id,
            "user_text": user_text,
            "capture_triggered": capture_triggered,
            "audio_tmp_path": audio_tmp_path,
            "frame_bytes": frame_bytes,
        }
    )
    return result

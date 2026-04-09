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
    frame_activity_type: str
    intent: str
    route: str
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
        "Decide whether the user's request needs the current captured screen/audio context.\n"
        "Return JSON only. Do not use markdown.\n"
        "Return exactly this schema:\n"
        "{\n"
        '  "intent": "context_only|theory_only|context_plus_theory"\n'
        "}\n\n"
        "Intent definitions:\n"
        "- context_only: The user is asking about the current screen, current explanation, visible work, transcript, or a short follow-up that depends on current/prior context.\n"
        "- theory_only: The user is asking a standalone concept question that can be answered without current screen/audio context.\n"
        "- context_plus_theory: The user is asking a concept question and also referencing the current context.\n\n"
        "Rules:\n"
        "1) If user_text is empty, choose context_only.\n"
        "2) If the user message is brief and does not name a standalone theory topic, choose context_only.\n"
        "3) Short follow-up commands usually need context. Examples: explain this, explain deeper, explain simpler, summarize, what should I focus on, give me a hint.\n"
        "4) If the user asks a standalone definition or general concept question, choose theory_only.\n"
        "5) If the user asks a concept question and also references the current context, choose context_plus_theory.\n\n"
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

    result = {
        "intent": label,
        "route": label,
    }
    print(
        f"[TA-ASSIST][classify] session={state.get('session_id')} capture_triggered={capture_triggered} "
        f"intent={label}",
        flush=True,
    )
    return result


def context_node(state: AssistState) -> AssistState:
    transcript = ""
    frame_analysis = ""
    frame_activity_type = "lecture"
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
            frame_activity_type, frame_analysis = describe_frame_with_gemini(frame_bytes, state.get("user_text") or "")
            print(
                f"[TA-ASSIST][context] Frame analysis done activity_type={frame_activity_type} len={len(frame_analysis)}",
                flush=True,
            )
        except Exception:
            frame_analysis = ""
            frame_activity_type = "lecture"
            print("[TA-ASSIST][context] Frame analysis failed -> empty", flush=True)

    print("[TA-ASSIST][context] OCR skipped (disabled in current flow)", flush=True)

    return {
        "transcript": transcript,
        "frame_analysis": frame_analysis,
        "frame_activity_type": frame_activity_type,
        "language": language,
        "duration_seconds": duration_seconds,
    }


def tutor_node(state: AssistState) -> AssistState:
    tutor_model = os.getenv("TUTOR_MODEL", "gemini-2.5-flash").strip()
    tutor_max_output_tokens = int(os.getenv("TUTOR_MAX_OUTPUT_TOKENS", "2400").strip())
    client = _get_vertex_client()

    session = SESSION_MEMORY.get(state["session_id"], {"history": [], "updated_at": 0.0})
    history = session.get("history", [])[-4:]
    history_text = "\n".join([f"Q: {h['q']}\nA: {h['a']}" for h in history]) or "(none)"

    user_text = (state.get("user_text") or "").strip()
    transcript = (state.get("transcript") or "").strip()
    frame_analysis = (state.get("frame_analysis") or "").strip()
    intent = (state.get("intent") or "").strip()
    frame_activity_type = (state.get("frame_activity_type") or "lecture").strip().lower()
    if frame_activity_type not in {"lecture", "assignment"}:
        frame_activity_type = "lecture"

    transcript_useful = _is_useful_signal(transcript, min_words=18)
    frame_useful = _is_useful_signal(frame_analysis, min_words=30)

    image_context = frame_analysis if frame_useful else "(empty)"
    transcript_context = transcript if transcript_useful else "(empty)"
    has_usable_context = frame_useful or transcript_useful

    needs_context = intent in {"context_only", "context_plus_theory"}
    if needs_context and not has_usable_context:
        answer = (
            "I need the captured screen or audio context for this. "
            "Please press Capture Moment, then ask again so I can use what is currently visible or being discussed."
        )
        print(
            f"[TA-ASSIST][tutor] context required but unavailable answer_len={len(answer)}",
            flush=True,
        )
        return {"answer": answer}

    user_question = user_text or "Explain this captured lesson moment."
    shared_context = (
        f"Recent QA history:\n{history_text}\n\n"
        f"Image:\n{image_context}\n\n"
        f"Transcript:\n{transcript_context}\n\n"
        f"User question:\n{user_question}"
    )

    if frame_activity_type == "assignment":
        prompt = (
            "You are a teaching assistant in homework-coach mode.\n"
            "Write plain text only. No markdown, no bullet points, no JSON.\n"
            "Write a natural teaching explanation in 60-140 words.\n"
            "Your job is to guide the student's thinking based on their current work, not to complete the assignment for them.\n\n"
            f"{shared_context}\n\n"
            "Rules:\n"
            "1) Do not give the final answer, finished code, completed proof, completed diagram, final equation, final regular expression, or final written response.\n"
            "2) Do not certify correctness. Never say the final answer is correct, incorrect, right, wrong, ready to submit, or not ready to submit, even if the student asks.\n"
            "3) Analyze what the student appears to be doing and respond to their current progress.\n"
            "4) If the student is stuck, give one small hint or one small next step, not the full solution.\n"
            "5) If the student appears to have completed the work, encourage a self-check or testing step instead of confirming whether it is correct.\n"
            "6) If the user asks directly for the answer, briefly say you can't provide the final answer for an assignment, then offer a hint or a way to check their reasoning."
        )
    else:
        prompt = (
            "You are a teaching assistant.\n"
            "Write plain text only. No markdown, no bullet points, no JSON.\n"
            "Write a natural teaching explanation in 100-200 words.\n"
            "If context is weak, state that briefly and still provide the best lesson-oriented explanation.\n"
            "Prioritize what helps a student learn this moment.\n\n"
            f"{shared_context}\n\n"
            "Rules:\n"
            "1) If user question is specific, answer it first, then connect to the current lesson moment.\n"
            "2) If user question is empty/generic (like explain this), summarize what is being taught now, what concept is on screen, and what the student should focus on next.\n"
            "3) Validate usefulness of audio/visual context and ignore noisy/unrelated parts.\n"
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
    print(
        f"[TA-ASSIST][tutor] model={tutor_model} answer_len={len(answer)} "
        f"intent={intent} activity_type={frame_activity_type}",
        flush=True,
    )
    return {"answer": answer}


def save_memory_node(state: AssistState) -> AssistState:
    sid = state["session_id"]
    existing = SESSION_MEMORY.get(sid, {"history": [], "updated_at": 0.0})

    history = existing["history"]
    user_text = (state.get("user_text") or "").strip()
    answer = (state.get("answer") or "").strip()
    if user_text or answer:
        history = [*history, {"q": user_text or "(capture)", "a": answer}]
        if len(history) > 20:
            history = history[-20:]

    SESSION_MEMORY[sid] = {
        "history": history,
        "updated_at": time.time(),
    }
    print(
        f"[TA-ASSIST][memory] session={sid} history_items={len(history)}",
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
        return "context_node" if state.get("intent") in {"context_only", "context_plus_theory", "theory_only"} else "tutor_node"

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

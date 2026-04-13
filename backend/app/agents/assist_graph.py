from __future__ import annotations

import json
import os
import time
from collections.abc import Iterator
from typing import Any, TypedDict

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
            f"[ASSIST][classify] session={state.get('session_id')} user_text=(empty) "
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
        f"[ASSIST][classify] session={state.get('session_id')} capture_triggered={capture_triggered} "
        f"intent={label}",
        flush=True,
    )
    return result


def context_node(state: AssistState) -> AssistState:
    transcript = ""
    language = None
    duration_seconds = None

    audio_tmp_path = state.get("audio_tmp_path")

    if audio_tmp_path:
        try:
            transcript, language, duration_seconds = transcribe_file(audio_tmp_path)
            print(
                f"[ASSIST][context] STT done language={language} duration={duration_seconds} "
                f"transcript_len={len(transcript)}",
                flush=True,
            )
        except Exception:
            transcript = ""
            print("[ASSIST][context] STT failed -> transcript empty", flush=True)

    if state.get("frame_bytes"):
        print("[ASSIST][context] Image analysis deferred to tutor multimodal call", flush=True)
    print("[ASSIST][context] OCR skipped (disabled in current flow)", flush=True)

    return {
        "transcript": transcript,
        "language": language,
        "duration_seconds": duration_seconds,
    }


def _build_tutor_request(state: AssistState) -> tuple[str, list[object], types.GenerateContentConfig]:
    tutor_model = os.getenv("TUTOR_MODEL", "gemini-2.5-flash").strip()
    tutor_max_output_tokens = int(os.getenv("TUTOR_MAX_OUTPUT_TOKENS", "2400").strip())

    session = SESSION_MEMORY.get(state["session_id"], {"history": [], "updated_at": 0.0})
    history = session.get("history", [])[-4:]
    history_text = "\n".join([f"Q: {h['q']}\nA: {h['a']}" for h in history]) or "(none)"

    user_text = (state.get("user_text") or "").strip()
    transcript = (state.get("transcript") or "").strip()
    frame_bytes = state.get("frame_bytes")
    user_question = user_text or "Explain this captured lesson moment."
    shared_context = (
        f"Recent QA history:\n{history_text}\n\n"
        f"Lecture/video audio:\n{transcript or '(empty)'}\n\n"
        f"User question:\n{user_question}"
    )
    prompt = (
        "You are a teaching assistant.\n"
        "Analyze the student's current screen, lecture/video audio, recent history, and question together.\n"
        "Return JSON only. Do not use markdown.\n"
        "Return exactly this schema:\n"
        "{\n"
        '  "intent": "context_only|theory_only|context_plus_theory",\n'
        '  "activity_type": "lecture|assignment",\n'
        '  "answer": "plain text answer for the student"\n'
        "}\n\n"
        "Intent definitions:\n"
        "- context_only: The user is asking about the current screen, current explanation, visible work, lecture/video audio, or a short follow-up that depends on current/prior context.\n"
        "- theory_only: The user is asking a standalone concept question.\n"
        "- context_plus_theory: The user is asking a concept question and also referencing the current context.\n\n"
        "Intent rules:\n"
        "1) Classify intent from what the user is asking, not from how much theory your answer will contain.\n"
        "2) If the user request is a short follow-up or refinement that depends on current/prior context, choose context_only.\n"
        "3) Examples of context-dependent follow-ups include: explain this, explain deeper, explain simpler, summarize, what should I focus on, give me a hint.\n"
        "4) Choose theory_only only when the user asks a standalone concept question that does not depend on the current screen, audio, or recent conversation.\n"
        "5) Choose context_plus_theory only when the user asks about a concept and also needs the current screen, audio, or recent conversation to answer it well.\n\n"
        "Activity type definitions:\n"
        "- lecture: The student is studying lecture or course material, such as a lecture slide, video, textbook, notes, worked example, or live class.\n"
        "- assignment: The student is actively working on homework or an assignment, such as solving a problem, writing code, drafting an answer, or reviewing their own solution.\n\n"
        "Answer rules:\n"
        "1) Use the screen and lecture/video audio when they help the student understand the answer.\n"
        "2) If the user's request is generic or context-dependent, treat the current screen and lecture/video audio as the main subject of the request.\n"
        "3) If the screen or lecture/video audio contains relevant evidence, mention that evidence naturally and use it in the explanation.\n"
        "4) When referencing audio, describe the source naturally: refer to the instructor/speaker when someone is teaching or presenting, or to the video/narration when it is clearly a recorded video. Do not describe audio as backend data.\n"
        "5) Do not force a screen or audio reference when the context is weak, noisy, or unrelated.\n"
        "6) If activity_type is lecture, write a natural teaching explanation in 100-250 words.\n"
        "7) For lecture, answer the user's question directly, but do not stop at the conclusion. Explain the reasoning clearly.\n"
        "8) For lecture, if the question is empty or generic, summarize what is being taught now, what concept is visible, and what the student should focus on next.\n"
        "9) If activity_type is assignment, write a natural teaching explanation in 60-140 words.\n"
        "10) For assignment, do not give the final answer, finished code, completed proof, completed diagram, final equation, final regular expression, or final written response.\n"
        "11) For assignment, do not certify correctness. Never say the final answer is correct, incorrect, right, wrong, ready to submit, or not ready to submit, even if the student asks.\n"
        "12) For assignment, analyze what the student appears to be doing and respond to their current progress.\n"
        "13) For assignment, if the student is stuck, give one small hint or one small next step, not the full solution.\n"
        "14) For assignment, if the student appears to have completed the work, encourage a self-check or testing step instead of confirming whether it is correct.\n"
        "15) If there is no useful screen or audio context and the user asks about the current screen or current explanation, say briefly that you need a clearer capture.\n\n"
        f"{shared_context}"
    )

    contents: list[object] = [prompt]
    if frame_bytes:
        contents.insert(0, types.Part.from_bytes(data=frame_bytes, mime_type="image/png"))

    return (
        tutor_model,
        contents,
        types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=tutor_max_output_tokens,
        ),
    )


def _normalize_tutor_payload(raw_text: str, *, user_text: str) -> AssistState:
    payload = _extract_json_object(raw_text)
    intent = str(payload.get("intent", "")).strip().lower()
    if intent not in {"context_only", "theory_only", "context_plus_theory"}:
        intent = "context_only" if not user_text else "theory_only"
    frame_activity_type = str(payload.get("activity_type", "")).strip().lower()
    if frame_activity_type not in {"lecture", "assignment"}:
        frame_activity_type = "lecture"
    answer = str(payload.get("answer", "")).strip()
    if not answer:
        answer = raw_text.strip()
    return {
        "intent": intent,
        "route": intent,
        "frame_activity_type": frame_activity_type,
        "frame_analysis": "",
        "answer": answer,
    }


def tutor_node(state: AssistState) -> AssistState:
    tutor_model, contents, config = _build_tutor_request(state)
    client = _get_vertex_client()
    response = client.models.generate_content(
        model=tutor_model,
        contents=contents,
        config=config,
    )
    raw_text = (response.text or "").strip()
    result = _normalize_tutor_payload(raw_text, user_text=(state.get("user_text") or "").strip())
    print(
        f"[ASSIST][tutor] model={tutor_model} answer_len={len(result.get('answer', ''))} "
        f"intent={result.get('intent')} activity_type={result.get('frame_activity_type')}",
        flush=True,
    )
    return result


class _JsonAnswerStreamExtractor:
    def __init__(self) -> None:
        self._prefix = '"answer"'
        self._prefix_index = 0
        self._waiting_for_colon = False
        self._waiting_for_quote = False
        self._in_answer = False
        self._escape = False
        self._unicode_buffer = ""
        self.done = False

    def feed(self, text: str) -> str:
        output: list[str] = []
        for ch in text:
            if self.done:
                continue
            if self._in_answer:
                if self._unicode_buffer:
                    self._unicode_buffer += ch
                    if len(self._unicode_buffer) == 4:
                        try:
                            output.append(chr(int(self._unicode_buffer, 16)))
                        except ValueError:
                            pass
                        self._unicode_buffer = ""
                        self._escape = False
                    continue
                if self._escape:
                    if ch == "u":
                        self._unicode_buffer = ""
                    else:
                        output.append(
                            {
                                "n": "\n",
                                "r": "\r",
                                "t": "\t",
                                '"': '"',
                                "\\": "\\",
                                "/": "/",
                                "b": "\b",
                                "f": "\f",
                            }.get(ch, ch)
                        )
                        self._escape = False
                    continue
                if ch == "\\":
                    self._escape = True
                    continue
                if ch == '"':
                    self.done = True
                    continue
                output.append(ch)
                continue

            if self._waiting_for_quote:
                if ch.isspace():
                    continue
                if ch == '"':
                    self._in_answer = True
                else:
                    self._waiting_for_quote = False
                continue

            if self._waiting_for_colon:
                if ch.isspace():
                    continue
                if ch == ":":
                    self._waiting_for_quote = True
                else:
                    self._waiting_for_colon = False
                continue

            expected = self._prefix[self._prefix_index]
            if ch == expected:
                self._prefix_index += 1
                if self._prefix_index == len(self._prefix):
                    self._waiting_for_colon = True
                    self._prefix_index = 0
            else:
                self._prefix_index = 1 if ch == self._prefix[0] else 0
        return "".join(output)


def stream_tutor_node(state: AssistState) -> Iterator[dict[str, Any]]:
    tutor_model, contents, config = _build_tutor_request(state)
    client = _get_vertex_client()
    extractor = _JsonAnswerStreamExtractor()
    raw_parts: list[str] = []
    for chunk in client.models.generate_content_stream(
        model=tutor_model,
        contents=contents,
        config=config,
    ):
        text = chunk.text or ""
        if not text:
            continue
        raw_parts.append(text)
        delta = extractor.feed(text)
        if delta:
            yield {"type": "answer_delta", "text": delta}

    raw_text = "".join(raw_parts).strip()
    result = _normalize_tutor_payload(raw_text, user_text=(state.get("user_text") or "").strip())
    print(
        f"[ASSIST][tutor-stream] model={tutor_model} answer_len={len(result.get('answer', ''))} "
        f"intent={result.get('intent')} activity_type={result.get('frame_activity_type')}",
        flush=True,
    )
    yield {"type": "final_state", "state": result}


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
        f"[ASSIST][memory] session={sid} history_items={len(history)}",
        flush=True,
    )
    return {}


def build_graph():
    graph = StateGraph(AssistState)
    graph.add_node("context_node", context_node)
    graph.add_node("tutor_node", tutor_node)
    graph.add_node("save_memory", save_memory_node)

    graph.add_edge(START, "context_node")
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


def run_assist_stream(
    *,
    session_id: str,
    user_text: str,
    capture_triggered: bool,
    audio_tmp_path: str | None,
    frame_bytes: bytes | None,
) -> Iterator[dict[str, Any]]:
    state: AssistState = {
        "session_id": session_id,
        "user_text": user_text,
        "capture_triggered": capture_triggered,
        "audio_tmp_path": audio_tmp_path,
        "frame_bytes": frame_bytes,
    }
    context = context_node(state)
    state.update(context)
    yield {"type": "context", "state": context}

    final_state: AssistState = {}
    for event in stream_tutor_node(state):
        if event.get("type") == "final_state":
            final_state = event.get("state") or {}
            state.update(final_state)
        else:
            yield event
    save_memory_node(state)
    yield {"type": "final_state", "state": state}

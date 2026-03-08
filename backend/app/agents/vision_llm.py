from __future__ import annotations

import os

import google.genai as genai
from google.genai import types
import cv2
import numpy as np


def describe_frame_with_gemini(image_bytes: bytes, transcript: str) -> str:
    project = os.getenv("GOOGLE_CLOUD_PROJECT", "").strip()
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1").strip()
    model = os.getenv("VLM_MODEL", "gemini-2.5-flash").strip()

    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is required for Gemini Vertex calls.")

    client = genai.Client(vertexai=True, project=project, location=location)

    prompt = (
        "You analyze a single lecture frame for a teaching assistant.\n"
        "Priority: lecture content only.\n"
        "Ignore website/browser chrome and unrelated UI, including tabs, URL bar, sidebars, recommendations,"
        " notifications, buttons, ads, and overlays.\n"
        "Focus on the board/video teaching area and infer the academic step.\n\n"
        "Return plain text only (no JSON, no markdown, no bullet symbols).\n"
        "Write 2-4 short paragraphs covering:\n"
        "1) The main teaching content visible on screen.\n"
        "2) The key things a student should focus on now (if any).\n"
        "3) The likely current step in the explanation.\n"
        "Always finish complete sentences and avoid truncation."
    )

    processed_image = auto_crop_main_content(image_bytes)

    response = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=processed_image, mime_type="image/png"),
            prompt,
        ],
        config=types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=1200,
        ),
    )

    return (response.text or "").strip()


def auto_crop_main_content(image_bytes: bytes) -> bytes:
    if os.getenv("AUTO_CROP_ENABLED", "1") != "1":
        return image_bytes

    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        return image_bytes

    h, w = image.shape[:2]
    img_area = float(h * w)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 60, 160)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return image_bytes

    frame_cx = w / 2.0
    frame_cy = h / 2.0
    best = None
    best_score = -1.0

    for contour in contours:
        x, y, cw, ch = cv2.boundingRect(contour)
        area = cw * ch
        area_ratio = area / img_area
        if area_ratio < 0.12:
            continue
        if cw < 0.25 * w or ch < 0.20 * h:
            continue

        roi_cx = x + cw / 2.0
        roi_cy = y + ch / 2.0
        dist = np.hypot((roi_cx - frame_cx) / w, (roi_cy - frame_cy) / h)
        centrality = max(0.0, 1.0 - dist * 1.5)

        aspect = cw / max(ch, 1)
        aspect_score = max(0.0, 1.0 - min(abs(aspect - (16 / 9)), 1.5) / 1.5)

        right_penalty = 0.0
        if x > w * 0.58:
            right_penalty = 0.35
        elif x + cw < w * 0.45:
            right_penalty = 0.1

        score = area_ratio * 1.8 + centrality * 1.3 + aspect_score * 0.8 - right_penalty
        if score > best_score:
            best_score = score
            best = (x, y, cw, ch, area_ratio)

    if best is None:
        return image_bytes

    x, y, cw, ch, area_ratio = best
    if area_ratio > 0.92:
        return image_bytes

    pad_x = int(cw * 0.03)
    pad_y = int(ch * 0.03)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w, x + cw + pad_x)
    y2 = min(h, y + ch + pad_y)
    cropped = image[y1:y2, x1:x2]
    if cropped.size == 0:
        return image_bytes

    ok, encoded = cv2.imencode(".png", cropped)
    if not ok:
        return image_bytes

    return encoded.tobytes()

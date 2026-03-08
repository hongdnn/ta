from __future__ import annotations

from google.cloud import vision


def extract_text_from_image(image_bytes: bytes) -> str:
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    response = client.document_text_detection(image=image)
    if response.error.message:
        raise RuntimeError(response.error.message)

    if response.full_text_annotation and response.full_text_annotation.text:
        return response.full_text_annotation.text.strip()

    if response.text_annotations:
        return response.text_annotations[0].description.strip()

    return ""

from __future__ import annotations

from chromadb import CloudClient
from chromadb.api.models.Collection import Collection
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

from app.core.config import settings


def get_chroma_collection() -> Collection | None:
    if not settings.chroma_enabled:
        return None

    if not (settings.chroma_api_key and settings.chroma_tenant and settings.chroma_database):
        print(
            "[TA-BACKEND][chroma] CHROMA_ENABLED=1 but cloud credentials are incomplete; "
            "expected CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE",
            flush=True,
        )
        return None

    embedding_function = DefaultEmbeddingFunction()
    client = CloudClient(
        api_key=settings.chroma_api_key,
        tenant=settings.chroma_tenant,
        database=settings.chroma_database,
    )

    return client.get_or_create_collection(
        name=settings.chroma_collection_name,
        embedding_function=embedding_function,
        metadata={"description": "TA course question clusters"},
    )

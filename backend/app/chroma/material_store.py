from __future__ import annotations

from dataclasses import dataclass

from chromadb.api.models.Collection import Collection


@dataclass(frozen=True)
class MaterialChunk:
    chunk_id: str
    text: str
    page: int
    chunk_index: int


@dataclass(frozen=True)
class MaterialChunkMatch:
    chunk_id: str
    text: str
    distance: float
    metadata: dict


class ChromaMaterialStore:
    def __init__(self, collection: Collection | None):
        self.collection = collection

    @property
    def enabled(self) -> bool:
        return self.collection is not None

    def upsert_chunks(
        self,
        *,
        course_id: str,
        material_id: str,
        file_name: str,
        chunks: list[MaterialChunk],
    ) -> None:
        if self.collection is None:
            raise RuntimeError("Chroma material collection is not configured")
        if not chunks:
            raise ValueError("No text chunks found in material")

        self.collection.upsert(
            ids=[chunk.chunk_id for chunk in chunks],
            documents=[chunk.text for chunk in chunks],
            metadatas=[
                {
                    "course_id": course_id,
                    "material_id": material_id,
                    "file_name": file_name,
                    "page": chunk.page,
                    "chunk_index": chunk.chunk_index,
                }
                for chunk in chunks
            ],
        )

    def query_relevant_chunks(
        self,
        *,
        course_id: str,
        text: str,
        n_results: int,
    ) -> list[MaterialChunkMatch]:
        if self.collection is None:
            return []
        payload = self.collection.query(
            query_texts=[text],
            n_results=n_results,
            where={"course_id": course_id},
            include=["documents", "metadatas", "distances"],
        )
        ids = (payload.get("ids") or [[]])[0]
        documents = (payload.get("documents") or [[]])[0]
        metadatas = (payload.get("metadatas") or [[]])[0]
        distances = (payload.get("distances") or [[]])[0]
        matches: list[MaterialChunkMatch] = []
        for index, chunk_id in enumerate(ids):
            metadata = metadatas[index] if index < len(metadatas) else {}
            distance = float(distances[index]) if index < len(distances) else 999.0
            document = str(documents[index]) if index < len(documents) else ""
            matches.append(
                MaterialChunkMatch(
                    chunk_id=str(chunk_id),
                    text=document,
                    distance=distance,
                    metadata=metadata or {},
                )
            )
        return matches

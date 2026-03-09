from __future__ import annotations

from dataclasses import dataclass

from chromadb.api.models.Collection import Collection


@dataclass(frozen=True)
class ClusterMatch:
    cluster_id: str
    distance: float
    metadata: dict


class ChromaClusterStore:
    def __init__(self, collection: Collection | None, *, similarity_threshold: float):
        self.collection = collection
        self.similarity_threshold = similarity_threshold

    @property
    def enabled(self) -> bool:
        return self.collection is not None

    def find_best_cluster(self, *, course_id: str, text: str) -> ClusterMatch | None:
        if self.collection is None:
            return None
        payload = self.collection.query(
            query_texts=[text],
            n_results=1,
            where={"course_id": course_id},
            include=["metadatas", "distances"],
        )
        ids = (payload.get("ids") or [[]])[0]
        distances = (payload.get("distances") or [[]])[0]
        metadatas = (payload.get("metadatas") or [[]])[0]
        if not ids:
            return None
        cluster_id = str(ids[0])
        distance = float(distances[0]) if distances else 999.0
        metadata = metadatas[0] if metadatas else {}
        return ClusterMatch(cluster_id=cluster_id, distance=distance, metadata=metadata or {})

    def is_match(self, match: ClusterMatch | None) -> bool:
        if match is None:
            return False
        return match.distance <= self.similarity_threshold

    def upsert_cluster(
        self,
        *,
        cluster_id: str,
        text: str,
        course_id: str,
        representative_message_id: str,
        created_at_iso: str,
        updated_at_iso: str,
    ) -> None:
        if self.collection is None:
            return
        self.collection.upsert(
            ids=[cluster_id],
            documents=[text],
            metadatas=[
                {
                    "course_id": course_id,
                    "representative_message_id": representative_message_id,
                    "created_at": created_at_iso,
                    "updated_at": updated_at_iso,
                }
            ],
        )

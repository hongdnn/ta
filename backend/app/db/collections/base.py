from __future__ import annotations

from typing import Any, Protocol

from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import CollectionInvalid, OperationFailure


class MongoModelDef(Protocol):
    COLLECTION_NAME: str
    VALIDATOR: dict[str, Any]

    @staticmethod
    def apply_indexes(collection: Collection) -> None:
        ...


def create_collection_with_validator(db: Database, name: str, validator: dict[str, Any]) -> Collection:
    try:
        db.create_collection(name, validator=validator)
    except CollectionInvalid:
        pass
    except OperationFailure as exc:
        if "already exists" not in str(exc).lower():
            raise

    db.command("collMod", name, validator=validator)
    return db[name]


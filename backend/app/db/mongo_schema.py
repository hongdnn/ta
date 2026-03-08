from __future__ import annotations

import argparse
import os

from dotenv import load_dotenv
from pymongo import MongoClient

from .collections import MODEL_DEFS
from .collections.base import create_collection_with_validator

load_dotenv()


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def init_mongo_schema() -> None:
    mongo_url = _required_env("MONGODB_URL")
    db_name = os.getenv("MONGODB_DB_NAME", "ta").strip() or "ta"

    client = MongoClient(mongo_url)
    db = client[db_name]

    for model in MODEL_DEFS:
        collection = create_collection_with_validator(db, model.COLLECTION_NAME, model.VALIDATOR)
        model.apply_indexes(collection)
    print(f"[TA-BACKEND] Mongo schema initialized for db='{db_name}'", flush=True)
    client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="TA backend MongoDB schema tools")
    parser.add_argument(
        "command",
        choices=["init"],
        help="init: create/update collections, validators, and indexes",
    )
    args = parser.parse_args()

    if args.command == "init":
        init_mongo_schema()

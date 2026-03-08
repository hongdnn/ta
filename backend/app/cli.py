from __future__ import annotations

import argparse

import uvicorn

from .db.mongo_schema import init_mongo_schema

def main() -> None:
    parser = argparse.ArgumentParser(description="TA backend CLI")
    parser.add_argument(
        "command",
        nargs="?",
        default="serve",
        choices=["serve", "init-mongo"],
        help="serve: run API server (default), init-mongo: create/update Mongo collections/indexes",
    )
    args = parser.parse_args()

    if args.command == "init-mongo":
        init_mongo_schema()
        return

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

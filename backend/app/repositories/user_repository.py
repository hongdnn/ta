from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo.database import Database

from app.db.documents.user import User, UserInstitution


class UserRepository:
    def __init__(self, db: Database):
        self.db = db
        self.users = db["users"]
        self.user_institutions = db["user_institutions"]

    def get_by_email(self, email: str) -> dict[str, Any] | None:
        return self.users.find_one({"email": email.lower().strip()})

    def create_user(
        self,
        *,
        email: str,
        name: str,
        user_type: str,
        password: str,
        institution_ids: list[str],
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        user_doc = User(
            email=email.lower().strip(),
            name=name.strip(),
            user_type=user_type,
            password=password,
            created_at=now,
            updated_at=now,
        ).model_dump()

        user_insert = self.users.insert_one(user_doc)
        user_id = user_insert.inserted_id

        for raw_id in institution_ids:
            institution_id = ObjectId(raw_id)
            membership = UserInstitution(
                user_id=user_id,
                institution_id=institution_id,
                role=user_type,
                created_at=now,
                updated_at=now,
            ).model_dump()
            self.user_institutions.update_one(
                {
                    "user_id": user_id,
                    "institution_id": institution_id,
                    "role": user_type,
                },
                {"$set": membership},
                upsert=True,
            )

        created = self.users.find_one({"_id": user_id})
        if not created:
            raise RuntimeError("Failed to create user")
        return created

from __future__ import annotations

import boto3
from botocore.client import Config

from app.core.config import settings


class R2Storage:
    def __init__(
        self,
        *,
        account_id: str,
        access_key_id: str,
        secret_access_key: str,
        bucket_name: str,
    ):
        self.account_id = account_id.strip()
        self.access_key_id = access_key_id.strip()
        self.secret_access_key = secret_access_key.strip()
        self.bucket_name = bucket_name.strip()
        self._client = None

    @classmethod
    def from_settings(cls) -> R2Storage:
        return cls(
            account_id=settings.r2_account_id,
            access_key_id=settings.r2_access_key_id,
            secret_access_key=settings.r2_secret_access_key,
            bucket_name=settings.r2_bucket_name,
        )

    @property
    def enabled(self) -> bool:
        return bool(self.account_id and self.access_key_id and self.secret_access_key and self.bucket_name)

    @property
    def client(self):
        if not self.enabled:
            raise RuntimeError("Cloudflare R2 is not configured")
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=f"https://{self.account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name="auto",
                config=Config(signature_version="s3v4"),
            )
        return self._client

    def upload_bytes(self, *, key: str, body: bytes, content_type: str) -> None:
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=body,
            ContentType=content_type,
        )

    def create_presigned_get_url(self, *, key: str, expires_in: int) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )

from __future__ import annotations

import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.routes.assist import router as assist_router
from app.routes.auth import router as auth_router
from app.routes.catalog import router as catalog_router
from app.routes.session import router as session_router
from app.core.config import settings
from app.db.mongo_schema import init_mongo_schema


app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(catalog_router)
app.include_router(session_router)
app.include_router(assist_router)


@app.middleware("http")
async def request_logger(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    print(
        f"[TA-BACKEND] {request.method} {request.url.path} -> {response.status_code} ({elapsed_ms}ms)",
        flush=True,
    )
    return response


@app.on_event("startup")
async def on_startup():
    if settings.mongo_init_on_startup:
        try:
            init_mongo_schema()
        except Exception as exc:  # noqa: BLE001
            print(f"[TA-BACKEND] Mongo schema init failed on startup: {exc}", flush=True)
    print("[TA-BACKEND] Startup complete - this is TA backend instance", flush=True)


@app.get("/health")
def health():
    print("[TA-BACKEND] Health check hit", flush=True)
    return {"ok": True, "service": "ta-backend", "version": settings.app_version}

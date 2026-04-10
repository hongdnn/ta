# backend

FastAPI backend for TA capture ingestion and STT, with MongoDB schema initializer.

## Project Structure

```text
app/
  agents/
    assist_graph.py
    stt.py
    vision_llm.py
    ocr.py
  routes/
    auth.py
    assist.py
  schemas/
    auth.py
    capture.py
  services/
    auth_service.py
    assist_service.py
  db/
    client.py
    mongo_schema.py
    collections/
      institution.py
      course.py
      user.py
      user_institution.py
      student_course.py
      professor_course.py
      session.py
      message.py
      cluster.py
      cluster_weekly_stats.py
    documents/
      user.py
    repositories/
      institution_repository.py
      user_repository.py
  dependencies.py
  main.py
  cli.py
```

## Features

- `POST /api/assist` accepts `multipart/form-data` from frontend:
  - `audio` (required file)
  - `frame` (optional image; single captured frame at click-time)
  - `sourceId` (optional)
  - `sourceType` (optional)
  - `captureDurationSeconds` (optional)
  - `courseName` (optional)
  - `capturedAt` (optional)
- Runs STT with `faster-whisper`
- Runs frame analysis with Gemini `2.5-flash-lite` (Vertex AI)
- Keeps OCR module in codebase for later use, but current flow does not call OCR
- Prints transcription + frame analysis to server logs
- Returns transcript + frame analysis JSON response
- `POST /api/auth/register` and `POST /api/auth/login` for account auth
- Includes MongoDB schema setup for:
  - institutions
  - courses
  - users
  - user_institutions
  - student_courses
  - professor_courses
  - sessions
  - messages
  - clusters
  - cluster_weekly_stats

## Requirements

- Python 3.11+
- `ffmpeg` installed on your machine

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
uv sync
cp .env.example .env
```

## Run

```bash
uv run ta-backend
```

## Initialize Mongo schema

Set `MONGODB_URL` and `MONGODB_DB_NAME` in `.env`, then run:

```bash
uv run ta-backend init-mongo
```

This creates/updates collections, JSON-schema validators, and indexes.

Alternative explicit command:

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

- `WHISPER_MODEL` (default: `distil-large-v3`)
- `WHISPER_DEVICE` (default: `auto`)
- `WHISPER_COMPUTE_TYPE` (default: `int8`)
- `CORS_ORIGINS` (default: `http://localhost:8080`)
- `GOOGLE_APPLICATION_CREDENTIALS` (required for Vision OCR)
- `GOOGLE_CLOUD_PROJECT` (required for Gemini Vertex)
- `GOOGLE_CLOUD_LOCATION` (default: `us-central1`)
- `VLM_MODEL` (default: `gemini-2.5-flash-lite`)
- `ROUTER_MODEL` (default: `gemini-2.0-flash-lite`)
- `TUTOR_MODEL` (default: `gemini-2.5-flash`)
- `TUTOR_MAX_OUTPUT_TOKENS` (default: `2400`)
- `AUTO_CROP_ENABLED` (default: `0`)
- `MONGODB_URL` (required for `init-mongo`)
- `MONGODB_DB_NAME` (default: `ta`)
- `MONGO_INIT_ON_STARTUP` (default: `0`; set `1` to auto-init schema on API startup)
- `JWT_SECRET` (required in production)
- `JWT_ALGORITHM` (default: `HS256`)
- `JWT_EXP_MINUTES` (default: `10080`)
- `DEBUG_KEEP_AUDIO` (default: `0`)
- `DEBUG_AUDIO_DIR` (default: `debug-audio`)

## Auth API

Register:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"student@example.com",
    "name":"Alice",
    "password":"password123",
    "user_type":"student",
    "institution_ids":["<institution_object_id>"]
  }'
```

Login:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"student@example.com",
    "password":"password123"
  }'
```

## Test with frontend

In frontend:

```bash
export VITE_API_BASE_URL=http://localhost:8000
npm run electron:dev
```


Then in app:

`Start Session -> Share & Continue -> Start Session -> Capture Moment`

Backend logs will print transcript + frame analysis.

## Create Google Cloud Key (for Gemini Vertex)

1. In Google Cloud Console, select/create your project.
2. Enable **Vertex AI API** for that project.
3. Go to **IAM & Admin -> Service Accounts**.
4. Create a service account (for example: `ta-vision-ocr`).
5. Grant role: `Vertex AI User` (and keep Vision role only if you later enable OCR path).
6. Open the service account -> **Keys** -> **Add key** -> **Create new key** -> JSON.
7. Save the JSON on your machine (outside git).
8. Put its absolute path in `backend/.env`:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your-key.json
```

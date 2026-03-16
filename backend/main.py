import os
import io
import csv
import sys
import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse, JSONResponse
from pydantic import BaseModel
import requests
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from parser import parse_timetable_image
from exporter import generate_ics
from auth import get_auth_url, exchange_code_for_token

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# --- Startup validation ---------------------------------------------------
_missing = []
if not os.getenv("FRONTEND_URL"):
    _missing.append("FRONTEND_URL")
if not os.getenv("BACKEND_URL"):
    _missing.append("BACKEND_URL")
if _missing and ENVIRONMENT == "production":
    print(f"FATAL: Missing required env vars: {', '.join(_missing)}", file=sys.stderr)
    sys.exit(1)

# --- App setup -------------------------------------------------------------
docs_url = "/docs" if ENVIRONMENT != "production" else None
redoc_url = "/redoc" if ENVIRONMENT != "production" else None

app = FastAPI(title="TimeSync API", version="1.0.0", docs_url=docs_url, redoc_url=redoc_url)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Too many requests. Try again later."})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TimetableEvent(BaseModel):
    subject: str
    day: str
    start_time: str
    end_time: str
    type: str
    location: str
    _flagged: bool = False

class ExportRequest(BaseModel):
    events: List[dict]
    semester_start: str
    semester_end: str
    recurrence_type: str = "weekly"

class SyncRequest(BaseModel):
    events: List[dict]
    semester_start: str
    semester_end: str
    recurrence_type: str = "weekly"

# ---------------------------------------------------------------------------
# POST /api/parse-image
# ---------------------------------------------------------------------------

@app.post("/api/parse-image")
@limiter.limit("5/minute")
async def parse_image(request: Request, file: UploadFile = File(...)):
    allowed_types = {"image/png", "image/jpeg", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Use PNG, JPEG, or WEBP.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="File too large. Max 20 MB.")

    try:
        events = parse_timetable_image(image_bytes, file.content_type)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

    return {"status": "success", "events": events}

# ---------------------------------------------------------------------------
# POST /api/export/ics
# ---------------------------------------------------------------------------

@app.post("/api/export/ics")
async def export_ics(body: ExportRequest):
    try:
        ics_bytes = generate_ics(
            body.events,
            body.semester_start,
            body.semester_end,
            body.recurrence_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ICS generation failed: {str(e)}")

    return StreamingResponse(
        io.BytesIO(ics_bytes),
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=timetable.ics"},
    )

# ---------------------------------------------------------------------------
# POST /api/export/csv
# ---------------------------------------------------------------------------

@app.post("/api/export/csv")
async def export_csv(body: dict):
    events = body.get("events", [])
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["subject", "day", "start_time", "end_time", "type", "location"],
        extrasaction="ignore",
    )
    writer.writeheader()
    writer.writerows(events)
    output.seek(0)

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=timetable.csv"},
    )

# ---------------------------------------------------------------------------
# GET /api/auth/google
# ---------------------------------------------------------------------------

@app.get("/api/auth/google")
async def auth_google(request: Request):
    redirect_uri = f"{BACKEND_URL}/api/auth/callback"
    state = secrets.token_urlsafe(32)
    url = get_auth_url(redirect_uri, state=state)
    response = RedirectResponse(url)
    response.set_cookie(
        "oauth_state", state, httponly=True, samesite="lax", max_age=600, secure=ENVIRONMENT == "production",
    )
    return response

# ---------------------------------------------------------------------------
# GET /api/auth/callback
# ---------------------------------------------------------------------------

@app.get("/api/auth/callback")
async def auth_callback(code: str, state: str, request: Request):
    expected_state = request.cookies.get("oauth_state")
    if not expected_state or state != expected_state:
        raise HTTPException(status_code=403, detail="Invalid OAuth state")

    redirect_uri = f"{BACKEND_URL}/api/auth/callback"
    try:
        token_data = exchange_code_for_token(code, redirect_uri)
        access_token = token_data.get("access_token", "")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")

    # Redirect to frontend with token in URL fragment
    frontend_redirect = f"{FRONTEND_URL}/#access_token={access_token}"
    response = RedirectResponse(frontend_redirect)
    response.delete_cookie("oauth_state")
    return response

# ---------------------------------------------------------------------------
# POST /api/sync/gcal
# ---------------------------------------------------------------------------

@app.post("/api/sync/gcal")
async def sync_gcal(body: SyncRequest, request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    access_token = auth_header.removeprefix("Bearer ").strip()
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    # 1. Create "My Timetable" calendar
    cal_resp = requests.post(
        "https://www.googleapis.com/calendar/v3/calendars",
        json={"summary": "My Timetable"},
        headers=headers,
    )
    if not cal_resp.ok:
        raise HTTPException(status_code=cal_resp.status_code, detail=f"Failed to create calendar: {cal_resp.text}")

    calendar_id = cal_resp.json()["id"]

    # 2. Build RRULE end date
    from exporter import first_occurrence, WEEKDAYS
    from datetime import timedelta
    end_date = datetime.strptime(body.semester_end, "%Y-%m-%d")
    until_str = end_date.strftime("%Y%m%dT235959Z")

    # 3. Create events
    created_count = 0
    for ev in body.events:
        day_name = ev.get("day", "Monday")
        if day_name not in WEEKDAYS:
            continue

        first = first_occurrence(day_name, body.semester_start)
        sh, sm = map(int, ev["start_time"].split(":"))
        eh, em = map(int, ev["end_time"].split(":"))
        dtstart = first.replace(hour=sh, minute=sm, second=0)
        dtend = first.replace(hour=eh, minute=em, second=0)

        event_body = {
            "summary": f"{ev['subject']} ({ev.get('type', 'Lecture')})",
            "location": ev.get("location", ""),
            "start": {"dateTime": dtstart.isoformat(), "timeZone": "Asia/Kolkata"},
            "end": {"dateTime": dtend.isoformat(), "timeZone": "Asia/Kolkata"},
            "recurrence": [
                f"RRULE:FREQ=WEEKLY;UNTIL={until_str}"
            ] if body.recurrence_type == "weekly" else [],
            "reminders": {
                "useDefault": False,
                "overrides": [{"method": "popup", "minutes": 10}],
            },
        }

        ev_resp = requests.post(
            f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
            json=event_body,
            headers=headers,
        )
        if ev_resp.ok:
            created_count += 1

    return {"status": "success", "created": created_count, "calendar_id": calendar_id}

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "TimeSync API is running. Visit /docs for the API docs."}

import os
import json
import re
from typing import Optional
from pydantic import BaseModel, field_validator
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """You are a timetable parser. Extract all scheduled sessions from the provided image and return ONLY a JSON array. No markdown. No explanation. No code fences.

Each object must have exactly these fields:
{
  "subject": "23CSE111",
  "day": "Monday",
  "start_time": "14:10",
  "end_time": "15:00",
  "type": "Lecture",
  "location": "S204 G"
}

Rules:
- Infer time slots from column headers
- If a cell spans multiple columns, set start_time from first column and end_time from last
- Ignore blank cells and lunch break rows
- Include Free Elective periods as events with subject "Free Elective" and type "Elective"
- Use 24hr time format HH:MM
- type must be one of: Lecture, Lab, Tutorial, Break, Elective
- If location is not visible, use empty string
- day must be full name: Monday, Tuesday, Wednesday, Thursday, Friday"""

VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}
VALID_TYPES = {"Lecture", "Lab", "Tutorial", "Break", "Elective"}
TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")


class TimetableEvent(BaseModel):
    subject: str
    day: str
    start_time: str
    end_time: str
    type: str
    location: str

    @field_validator("day")
    @classmethod
    def validate_day(cls, v):
        if v not in VALID_DAYS:
            raise ValueError(f"Invalid day: {v}")
        return v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        if v not in VALID_TYPES:
            raise ValueError(f"Invalid type: {v}")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time(cls, v):
        if not TIME_PATTERN.match(v):
            raise ValueError(f"Time must be HH:MM format, got: {v}")
        return v


def _is_suspicious(event: dict) -> bool:
    """Flag events that look suspicious."""
    if not event.get("subject", "").strip():
        return True
    if not event.get("day", "").strip():
        return True
    if not event.get("start_time", "").strip() or not event.get("end_time", "").strip():
        return True
    return False


def parse_timetable_image(image_bytes: bytes, mime_type: str) -> list[dict]:
    """Send image to Gemini Vision, parse and validate response."""
    model = genai.GenerativeModel("gemini-2.5-flash")

    import base64
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    response = model.generate_content(
        [
            {
                "role": "user",
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": image_b64,
                        }
                    },
                    {"text": SYSTEM_PROMPT},
                ],
            }
        ]
    )

    raw_text = response.text.strip()

    # Strip markdown code fences (model sometimes wraps output even when told not to)
    raw_text = (
        raw_text
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )

    try:
        raw_events = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned invalid JSON: {e}\nRaw response: {raw_text[:500]}")

    if not isinstance(raw_events, list):
        raise ValueError("Expected a JSON array from Gemini, got: " + type(raw_events).__name__)

    validated_events = []
    for i, raw in enumerate(raw_events):
        try:
            # Validate with Pydantic
            event = TimetableEvent(**raw)
            event_dict = event.model_dump()
            event_dict["_flagged"] = _is_suspicious(event_dict)
            validated_events.append(event_dict)
        except Exception as e:
            # Add as flagged if validation fails
            fallback = {
                "subject": raw.get("subject", ""),
                "day": raw.get("day", ""),
                "start_time": raw.get("start_time", ""),
                "end_time": raw.get("end_time", ""),
                "type": raw.get("type", "Lecture"),
                "location": raw.get("location", ""),
                "_flagged": True,
            }
            validated_events.append(fallback)

    return validated_events

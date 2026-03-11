from datetime import datetime, timedelta, time
from icalendar import Calendar, Event, vText, vDatetime
import uuid

WEEKDAYS = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
}


def first_occurrence(day_name: str, semester_start: str) -> datetime:
    """Return the first matching weekday on or after semester_start."""
    start = datetime.strptime(semester_start, "%Y-%m-%d")
    target = WEEKDAYS[day_name]
    days_ahead = (target - start.weekday()) % 7
    return start + timedelta(days=days_ahead)


def generate_ics(
    events: list[dict],
    semester_start: str,
    semester_end: str,
    recurrence_type: str = "weekly",
) -> bytes:
    """Build and return an .ics file as bytes."""
    cal = Calendar()
    cal.add("prodid", "-//TimeSync Timetable//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("x-wr-calname", "My Timetable")

    end_date = datetime.strptime(semester_end, "%Y-%m-%d")

    for ev in events:
        day_name = ev["day"]
        start_str = ev["start_time"]   # "HH:MM"
        end_str = ev["end_time"]       # "HH:MM"

        # Calculate first occurrence date
        first = first_occurrence(day_name, semester_start)

        sh, sm = map(int, start_str.split(":"))
        eh, em = map(int, end_str.split(":"))

        dtstart = first.replace(hour=sh, minute=sm, second=0, microsecond=0)
        dtend = first.replace(hour=eh, minute=em, second=0, microsecond=0)

        vevent = Event()
        vevent.add("uid", str(uuid.uuid4()))
        vevent.add("summary", f"{ev['subject']} ({ev.get('type', 'Lecture')})")
        vevent.add("dtstart", dtstart)
        vevent.add("dtend", dtend)

        if ev.get("location"):
            vevent.add("location", vText(ev["location"]))

        if recurrence_type == "weekly":
            until = end_date.replace(hour=23, minute=59, second=59)
            vevent.add("rrule", {"freq": "weekly", "until": until})

        # 10-minute popup reminder
        from icalendar import Alarm
        alarm = Alarm()
        alarm.add("action", "DISPLAY")
        alarm.add("description", "Reminder")
        alarm.add("trigger", timedelta(minutes=-10))
        vevent.add_component(alarm)

        cal.add_component(vevent)

    return cal.to_ical()

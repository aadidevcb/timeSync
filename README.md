# ⏱ TimeSync

### Turn your college timetable photo into a Google Calendar — in 30 seconds.

No manual entry. No spreadsheets. Just snap, review, export.

---

## How it works

**1. Upload a photo** of your printed or digital timetable — any angle, any format.

**2. AI reads it** — Gemini Vision extracts every subject, day, time slot, and room automatically.

**3. Review & fix** — an interactive weekly grid lets you drag events to adjust times, move them across days, or edit details with a click.

**4. Export** — download an `.ics` file for any calendar app, grab a CSV, or sync directly to Google Calendar as recurring weekly events for the whole semester.

---

## Features

- 🧠 **Gemini-powered parsing** — handles handwritten, printed, and digital timetables
- 📅 **Smart recurrence** — generates weekly events from semester start to end automatically
- ✏️ **Visual grid editor** — drag-to-move, drag-to-resize, click-to-edit, per-subject colors
- ⚠️ **Flagged rows** — suspicious or incomplete entries are highlighted so nothing slips through
- 📥 **Three export formats** — `.ics` (Apple / Outlook / Google), CSV, or direct Google Calendar sync
- 🔒 **Privacy-first** — fully stateless, no database, OAuth token never touches disk

---

## Self-host in 2 minutes

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # add your GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                 # → http://localhost:5173
```

> **Get a Gemini API key free at** [aistudio.google.com](https://aistudio.google.com)

---

## Optional: Google Calendar sync

To enable the **Sync to Google Calendar** button, create an OAuth 2.0 client in [Google Cloud Console](https://console.cloud.google.com) and add these values to `backend/.env`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Add `http://localhost:8000/api/auth/callback` as an authorised redirect URI.

The `.ics` download works without any Google account.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | FastAPI (Python) |
| AI | Gemini 2.5 Flash Vision |
| Calendar | Google Calendar API v3 + iCalendar |
| Auth | Google OAuth 2.0 |

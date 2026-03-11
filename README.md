# TimeSync — Timetable to Google Calendar

Upload a photo of your college timetable → parse it with Gemini AI → review and edit → export to Google Calendar as recurring weekly events.

---

## Project Structure

```
timeSync-willwork/
├── backend/
│   ├── main.py          # FastAPI app (6 endpoints)
│   ├── parser.py        # Gemini Vision + Pydantic validation
│   ├── exporter.py      # ICS calendar generation
│   ├── auth.py          # Google OAuth helpers
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ImageUpload.jsx      # Drag-and-drop upload
    │   │   ├── TimetableEditor.jsx  # Editable table
    │   │   ├── DateRangePicker.jsx  # Semester range + recurrence
    │   │   ├── ExportPanel.jsx      # ICS / CSV / GCal export
    │   │   └── AuthButton.jsx       # Google Sign-in
    │   ├── App.jsx
    │   └── main.jsx
    ├── vite.config.js
    └── .env.example
```

---

## Setup

### 1. Backend

```bash
cd backend

# Copy and fill in your keys
cp .env.example .env
# Required: GEMINI_API_KEY
# Optional (for GCal sync): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

Visit [http://localhost:8000/docs](http://localhost:8000/docs) to browse the Swagger UI.

### 2. Frontend

```bash
cd frontend

# Copy env file
cp .env.example .env
# VITE_API_URL defaults to http://localhost:8000

# Install and run
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

---

## Environment Variables

### backend/.env
| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI Studio key |
| `GOOGLE_CLIENT_ID` | Optional | For GCal sync |
| `GOOGLE_CLIENT_SECRET` | Optional | For GCal sync |
| `FRONTEND_URL` | Optional | Default: `http://localhost:5173` |

### frontend/.env
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL (default: `http://localhost:8000`) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/parse-image` | Upload timetable image → Gemini Vision → JSON |
| `POST` | `/api/export/ics` | Events → `.ics` file download |
| `POST` | `/api/export/csv` | Events → `.csv` file download |
| `GET`  | `/api/auth/google` | Initiate Google OAuth flow |
| `GET`  | `/api/auth/callback` | OAuth callback → redirect to frontend |
| `POST` | `/api/sync/gcal` | Sync events to Google Calendar |

---

## User Flow

1. **Upload** — Drag and drop a timetable photo
2. **Review** — Edit the parsed table, fix flagged rows (amber highlight)
3. **Export** — Choose: download `.ics`, download CSV, or sync directly to Google Calendar

---

## Tech Stack

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: FastAPI + Python
- **AI Parsing**: Gemini 2.0 Flash Vision
- **Calendar**: Google Calendar API v3 + iCalendar
- **Auth**: Google OAuth 2.0

---

## Notes

- **No database** — fully stateless
- **Tokens never stored** in localStorage — React state only
- Flagged events (suspicious parse output) are highlighted amber in the editor
- ICS files include weekly RRULE with 10-minute popup reminder

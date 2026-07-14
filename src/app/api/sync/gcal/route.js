import { NextResponse } from 'next/server';
import { z } from 'zod';

const eventSchema = z.object({
    subject: z.string(),
    day: z.string().optional(),
    start_time: z.string(),
    end_time: z.string(),
    type: z.string().optional(),
    location: z.string().optional()
});

const requestSchema = z.object({
    events: z.array(eventSchema).max(500, "Too many events. Maximum is 500."),
    semester_start: z.string(),
    semester_end: z.string(),
    recurrence_type: z.string().optional()
});


const WEEKDAYS = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
};

const CALENDAR_ID = 'primary';
const TIMESYNC_TAG = 'timesync'; // private extended property marker
const CALENDAR_TIME_ZONE = 'Asia/Kolkata';

function firstOccurrence(dayName, semesterStart) {
    // Date-only strings are interpreted as UTC by JavaScript. Keep all of this
    // calculation in UTC so the selected weekday is independent of the server's
    // own time zone.
    const start = new Date(`${semesterStart}T00:00:00Z`);
    const target = WEEKDAYS[dayName];
    const jsToWeekday = (start.getUTCDay() + 6) % 7;
    let daysAhead = (target - jsToWeekday) % 7;
    if (daysAhead < 0) daysAhead += 7;
    const result = new Date(start);
    result.setUTCDate(result.getUTCDate() + daysAhead);
    return result;
}

function eventDateTime(date, time) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Do not convert this wall-clock time with toISOString(). Google Calendar
    // interprets this value in CALENDAR_TIME_ZONE, as specified below.
    return `${year}-${month}-${day}T${time}:00`;
}

function getAuthToken(request) {
    const authHeader = request.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    return authHeader.replace("Bearer ", "").trim();
}

// ── POST: Sync events, tagging each with source=timesync ─────────────────────
export async function POST(request) {
    const access_token = getAuthToken(request);
    if (!access_token) {
        return NextResponse.json({ detail: "Missing or invalid Authorization header." }, { status: 401 });
    }

    const headers = {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
    };

    try {
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
        }

        const parseResult = requestSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json({ detail: parseResult.error.errors[0].message }, { status: 400 });
        }

        const { events, semester_start, semester_end, recurrence_type } = parseResult.data;

        // Include classes on the final semester day. RRULE UNTIL uses UTC.
        const untilStr = `${semester_end.replace(/-/g, '')}T235959Z`;

        let created_count = 0;
        for (const ev of events) {
            const dayName = ev.day || "Monday";
            if (!(dayName in WEEKDAYS)) continue;

            const first = firstOccurrence(dayName, semester_start);
            const eventBody = {
                summary: `${ev.subject} (${ev.type || 'Lecture'})`,
                location: ev.location || "",
                start: { dateTime: eventDateTime(first, ev.start_time), timeZone: CALENDAR_TIME_ZONE },
                end: { dateTime: eventDateTime(first, ev.end_time), timeZone: CALENDAR_TIME_ZONE },
                recurrence: recurrence_type === "weekly" ? [`RRULE:FREQ=WEEKLY;UNTIL=${untilStr}`] : [],
                reminders: {
                    useDefault: false,
                    overrides: [{ method: "popup", minutes: 10 }]
                },
                // Tag every event so we can find and delete them later — cross-device
                extendedProperties: {
                    private: { source: TIMESYNC_TAG }
                }
            };

            const evResp = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
                { method: "POST", headers, body: JSON.stringify(eventBody) }
            );

            if (!evResp.ok) {
                const errText = await evResp.text();
                throw new Error(`Google API Create Event Error: ${evResp.status} ${errText}`);
            }
            
            created_count++;
        }

        return NextResponse.json({ status: "success", created: created_count });
    } catch (e) {
        console.error('GCal sync error:', e);
        return NextResponse.json({ detail: e.message }, { status: 500 });
    }
}

// ── GET: Check if this user has any previously synced timesync events ─────────
export async function GET(request) {
    const access_token = getAuthToken(request);
    if (!access_token) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const headers = { "Authorization": `Bearer ${access_token}` };

    try {
        // Query Google Calendar for events tagged with source=timesync
        // We manually construct the query string because Google Calendar API expects `source=timesync` 
        // without URL encoding the `=` to `%3D`.
        const qs = `privateExtendedProperty=source=${TIMESYNC_TAG}&maxResults=1&singleEvents=false`;
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?${qs}`,
            { headers }
        );
        if (!res.ok) {
            const errText = await res.text();
            console.error(`Google API List Error in GET: ${res.status} ${errText}`);
            return NextResponse.json({ hasSyncedEvents: false });
        }
        
        const data = await res.json();
        const hasEvents = (data.items?.length ?? 0) > 0;
        return NextResponse.json({ hasSyncedEvents: hasEvents });
    } catch (e) {
        console.error('GCal check error:', e);
        return NextResponse.json({ hasSyncedEvents: false });
    }
}

// ── DELETE: Find all tagged timesync events and delete them ───────────────────
export async function DELETE(request) {
    const access_token = getAuthToken(request);
    if (!access_token) {
        return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const headers = { "Authorization": `Bearer ${access_token}` };

    try {
        let deleted_count = 0;
        let pageToken = undefined;

        // Page through ALL events tagged source=timesync and delete each
        do {
            // Manually construct the query string to avoid encoding the `=` in `source=timesync`
            let qs = `privateExtendedProperty=source=${TIMESYNC_TAG}&maxResults=250&singleEvents=false`;
            if (pageToken) qs += `&pageToken=${pageToken}`;

            const res = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?${qs}`,
                { headers }
            );
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Google API List Error: ${res.status} ${errText}`);
            }
            
            const data = await res.json();
            const items = data.items ?? [];

            for (const item of items) {
                const delRes = await fetch(
                    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${item.id}`,
                    { method: "DELETE", headers }
                );
                
                if (!delRes.ok && delRes.status !== 404) {
                    const errText = await delRes.text();
                    throw new Error(`Google API Delete Error: ${delRes.status} ${errText}`);
                }
                
                if (delRes.ok || delRes.status === 404) deleted_count++;
            }

            pageToken = data.nextPageToken;
        } while (pageToken);

        if (deleted_count === 0) {
             console.log("No events found to delete, returning success but 0 deleted.");
        }

        return NextResponse.json({ status: "success", deleted: deleted_count });
    } catch (e) {
        console.error('GCal delete error:', e);
        return NextResponse.json({ detail: e.message }, { status: 500 });
    }
}

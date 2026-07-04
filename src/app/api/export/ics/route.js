import { NextResponse } from 'next/server';
import { createEvents } from 'ics';
import { z } from 'zod';

const eventSchema = z.object({
    subject: z.string(),
    day: z.string(),
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

function firstOccurrence(dayName, semesterStart) {
    const start = new Date(semesterStart);
    const target = WEEKDAYS[dayName];
    // getDay() returns 0 for Sunday, 1 for Monday...
    // Adjust logic since JS getDay() is 0=Sun, 1=Mon, ..., 6=Sat.
    // WEEKDAYS uses 0=Mon. Let's map JS day to Mon=0...
    const jsToWeekday = (start.getDay() + 6) % 7; 
    let daysAhead = (target - jsToWeekday) % 7;
    if (daysAhead < 0) {
        daysAhead += 7;
    }
    const result = new Date(start);
    result.setDate(result.getDate() + daysAhead);
    return result;
}

export async function POST(request) {
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

        const end_date = new Date(semester_end);

        const icsEvents = events.map(ev => {
            const dayName = ev.day;
            const first = firstOccurrence(dayName, semester_start);
            
            const [sh, sm] = ev.start_time.split(":").map(Number);
            const [eh, em] = ev.end_time.split(":").map(Number);
            
            first.setHours(sh, sm, 0, 0);
            
            const untilStr = end_date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            
            const eventObj = {
                title: `${ev.subject} (${ev.type || 'Lecture'})`,
                location: ev.location || '',
                start: [first.getFullYear(), first.getMonth() + 1, first.getDate(), sh, sm],
                end: [first.getFullYear(), first.getMonth() + 1, first.getDate(), eh, em],
                alarms: [
                    { action: 'display', description: 'Reminder', trigger: { minutes: 10, before: true } }
                ],
                uid: crypto.randomUUID()
            };

            if (recurrence_type === "weekly") {
                eventObj.recurrenceRule = `FREQ=WEEKLY;UNTIL=${untilStr}`;
            }

            return eventObj;
        });

        const { error, value } = createEvents(icsEvents);
        if (error) {
            throw error;
        }

        return new NextResponse(value, {
            headers: {
                'Content-Type': 'text/calendar',
                'Content-Disposition': 'attachment; filename=timetable.ics'
            }
        });
    } catch (e) {
        return NextResponse.json({ detail: `ICS generation failed: ${e.message}` }, { status: 500 });
    }
}

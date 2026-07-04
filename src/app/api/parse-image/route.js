import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB

const requestSchema = z.object({
    file: z.string().min(1, "File cannot be empty").max(MAX_PAYLOAD_SIZE, "File payload is too large. Maximum size is 10MB.")
});

const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5; // 5 requests per minute

function isRateLimited(ip) {
    const now = Date.now();
    const userRecord = rateLimit.get(ip);
    
    if (!userRecord || (now - userRecord.startTime) > RATE_LIMIT_WINDOW) {
        rateLimit.set(ip, { count: 1, startTime: now });
        return false;
    }
    
    if (userRecord.count >= MAX_REQUESTS) {
        return true;
    }
    
    userRecord.count++;
    return false;
}


const SYSTEM_PROMPT = `You are a timetable parser. Extract all scheduled sessions from the provided text/markdown/image and return ONLY a JSON array. No markdown. No explanation. No code fences.

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
- Infer time slots from column headers or context
- If a cell spans multiple columns/times, set start_time from first and end_time from last
- Ignore blank cells and lunch break rows
- Include Free Elective periods as events with subject "Free Elective" and type "Elective"
- Use 24hr time format HH:MM
- type must be one of: Lecture, Lab, Tutorial, Break, Elective
- If location is not visible, use empty string
- day must be full name: Monday, Tuesday, Wednesday, Thursday, Friday`;

export async function POST(request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown-ip';
        if (isRateLimited(ip)) {
            return NextResponse.json({ detail: "Too many requests. Please try again later." }, { status: 429 });
        }

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

        const { file } = parseResult.data; // base64 string

        // Extract mimeType and base64 string if it has the data URI prefix
        let mimeType = "image/jpeg";
        let base64Data = file;
        if (file.startsWith("data:")) {
            const matches = file.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        // Parse Image and Extract JSON using Gemini 2.5 Flash in a single shot
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const geminiResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: SYSTEM_PROMPT },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ]
        });

        let rawText = geminiResponse.text.trim();
        if (rawText.startsWith("```json")) rawText = rawText.substring(7);
        if (rawText.startsWith("```")) rawText = rawText.substring(3);
        if (rawText.endsWith("```")) rawText = rawText.substring(0, rawText.length - 3);
        rawText = rawText.trim();

        const events = JSON.parse(rawText);
        
        // Return structured events
        return NextResponse.json({ status: "success", events: events });
    } catch (e) {
        console.error("Parse Error:", e);
        return NextResponse.json({ detail: e.message, stack: e.stack, name: e.name }, { status: 500 });
    }
}

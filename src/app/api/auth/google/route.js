import { NextResponse } from 'next/server';

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events",
];

export async function GET(request) {
    const url = new URL(request.url);
    const redirect_uri = `${url.origin}/api/auth/callback`;
    const state = crypto.randomUUID();

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        redirect_uri,
        response_type: "code",
        scope: SCOPES.join(" "),
        access_type: "online",
        prompt: "consent",
        state,
    });

    const redirectUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    const response = NextResponse.redirect(redirectUrl);

    // Set cookie for state validation
    response.cookies.set('oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 600,
        secure: process.env.NODE_ENV === "production"
    });

    return response;
}

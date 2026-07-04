import { NextResponse } from 'next/server';

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    const cookieStore = request.cookies;
    const expectedState = cookieStore.get('oauth_state')?.value;

    if (!expectedState || state !== expectedState) {
        return NextResponse.json({ detail: "Invalid OAuth state" }, { status: 403 });
    }

    const redirect_uri = `${url.origin}/api/auth/callback`;

    try {
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                redirect_uri,
                grant_type: "authorization_code",
            }).toString()
        });

        if (!tokenRes.ok) {
            throw new Error(await tokenRes.text());
        }

        const tokenData = await tokenRes.json();
        const access_token = tokenData.access_token || "";

        // Send token to parent window via postMessage and close popup
        const html = `<!DOCTYPE html>
<html>
  <body>
    <script>
      window.opener.postMessage({ type: 'OAUTH_TOKEN', token: ${JSON.stringify(access_token)} }, window.location.origin);
      window.close();
    </script>
  </body>
</html>`;
        const response = new Response(html, {
          headers: { 'Content-Type': 'text/html' },
        });
        return response;

    } catch (e) {
        return NextResponse.json({ detail: `Token exchange failed: ${e.message}` }, { status: 400 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

const CLIENT_ID     = process.env.AZURE_AD_CLIENT_ID;
const TENANT_ID     = process.env.AZURE_AD_TENANT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;

export const dynamic = 'force-dynamic';

async function getAccessToken() {
  if (!CLIENT_ID || !TENANT_ID || !CLIENT_SECRET) {
    throw new Error('Azure credentials missing from environment variables.');
  }
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'https://graph.microsoft.com/.default',
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to get access token');
  return data.access_token as string;
}

// POST /api/calendar-event
// Creates an Outlook calendar event on the rep's calendar via Microsoft Graph.
export async function POST(request: NextRequest) {
  try {
    const authPayload = await requireAuth(request);
    const repEmail = authPayload?.email?.trim();
    if (!repEmail) {
      return NextResponse.json({ error: 'Rep email not available from auth token' }, { status: 400 });
    }

    const { subject, startAt, endAt, address, homeownerName, notes } = await request.json();

    if (!startAt || !endAt) {
      return NextResponse.json({ error: 'startAt and endAt are required' }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    const bodyLines = [
      address   ? `<b>Address:</b> ${address}`         : null,
      homeownerName ? `<b>Homeowner:</b> ${homeownerName}` : null,
      notes     ? `<b>Notes:</b> ${notes}`              : null,
    ].filter(Boolean).join('<br>');

    const payload = {
      subject: subject || `Storm Inspection — ${address || 'Inspection'}`,
      start: { dateTime: startAt, timeZone: 'America/Chicago' },
      end:   { dateTime: endAt,   timeZone: 'America/Chicago' },
      ...(address ? { location: { displayName: address } } : {}),
      body: {
        contentType: 'HTML',
        content: `<p>${bodyLines || 'Hustad storm inspection appointment.'}</p>`,
      },
      reminderMinutesBeforeStart: 30,
    };

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${repEmail}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      let message = `Graph Error: ${res.status}`;
      try { message = JSON.parse(text).error?.message || message; } catch { message = text || message; }
      throw new Error(message);
    }

    const event = await res.json();
    return NextResponse.json({ success: true, eventId: event.id });

  } catch (err: any) {
    console.error('[CALENDAR_EVENT_ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

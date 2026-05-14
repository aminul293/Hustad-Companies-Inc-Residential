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

// PATCH /api/calendar-event
// Updates an existing Outlook event's body to embed the rep camera link + QR code.
export async function PATCH(request: NextRequest) {
  try {
    const authPayload = await requireAuth(request);
    const repEmail = authPayload?.email?.trim();
    if (!repEmail) {
      return NextResponse.json({ error: 'Rep email not available from auth token' }, { status: 400 });
    }

    const { eventId, captureUrl, address, homeownerName } = await request.json();
    if (!eventId || !captureUrl) {
      return NextResponse.json({ error: 'eventId and captureUrl are required' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(captureUrl)}&bgcolor=ffffff&color=1a1a2e&qzone=2&format=png`;

    const bodyHtml = `
<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;width:100%;">
  <tr><td style="padding-bottom:12px;">
    ${address ? `<b>Address:</b> ${address}<br>` : ''}
    ${homeownerName ? `<b>Homeowner:</b> ${homeownerName}<br>` : ''}
  </td></tr>
  <tr><td style="padding:16px;background:#f4f4f8;border-radius:12px;">
    <p style="margin:0 0 10px;font-size:13px;color:#555;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Rep Camera Link</p>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;padding-right:16px;">
          <img src="${qrUrl}" width="100" height="100" alt="QR Code" style="display:block;border-radius:6px;" />
        </td>
        <td style="vertical-align:middle;">
          <a href="${captureUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">📷 Open Rep Camera</a>
          <p style="margin:8px 0 0;font-size:11px;color:#6366f1;word-break:break-all;font-family:monospace;">${captureUrl}</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`;

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${repEmail}/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: { contentType: 'HTML', content: bodyHtml } }),
    });

    if (!res.ok) {
      const text = await res.text();
      let message = `Graph Error: ${res.status}`;
      try { message = JSON.parse(text).error?.message || message; } catch { message = text || message; }
      throw new Error(message);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[CALENDAR_EVENT_PATCH_ERROR]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

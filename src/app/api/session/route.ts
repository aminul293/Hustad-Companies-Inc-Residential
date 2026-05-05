import { NextResponse } from 'next/server';
import { upsertSession, getSessionById, getSessionByToken } from '@/lib/supabase-relay';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const sessionId = searchParams.get('sessionId');

  try {
    if (token) {
      const session = await getSessionByToken(token);
      if (!session) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
      }

      // Check Expiration (48 hours)
      const createdAt = new Date(session.findings.summaryLockedAt || session.createdAt).getTime();
      const now = new Date().getTime();
      if (now - createdAt > 48 * 60 * 60 * 1000) {
        return NextResponse.json({ error: 'Review link has expired' }, { status: 410 });
      }

      // Reuse Protection
      if (session.sessionStatus === 'signed' || session.sessionStatus.startsWith('closed_')) {
        return NextResponse.json({ 
          error: 'Already Signed', 
          message: 'This dossier has already been authorized.',
          session: { 
            address: session.property.address,
            signedAt: session.signatureData.signedAt 
          }
        }, { status: 409 });
      }

      return NextResponse.json(session);
    }

    if (sessionId) {
      const session = await getSessionById(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('[SUPABASE_RELAY] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await request.json();
    const { sessionId } = session;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    await upsertSession(session);

    console.log(`[SUPABASE_RELAY] Synced Session: ${sessionId} | Status: ${session.sessionStatus}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SUPABASE_RELAY] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

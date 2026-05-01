import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'sessions.json');

// Helper to read DB
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { sessions: {}, tokens: {} };
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return {
      sessions: parsed.sessions || {},
      tokens: parsed.tokens || {}
    };
  } catch (e) {
    return { sessions: {}, tokens: {} };
  }
}

// Helper to write DB
function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const sessionId = searchParams.get('sessionId');
  const db = readDb();

  if (token) {
    const sId = db.tokens[token];
    if (!sId || !db.sessions[sId]) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const session = db.sessions[sId];
    
    // 1. Check Expiration (48 hours)
    const createdAt = new Date(session.tokenGeneratedAt || session.createdAt).getTime();
    const now = new Date().getTime();
    if (now - createdAt > 48 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Review link has expired' }, { status: 410 });
    }

    // 2. Reuse Protection
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
    const session = db.sessions[sessionId];
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json(session);
  }

  return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const session = await request.json();
    const { sessionId, reviewToken } = session;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const db = readDb();

    // Preserve existing token data if not provided in update
    const existing = db.sessions[sessionId] || {};
    const tokenGeneratedAt = session.reviewToken && !existing.reviewToken 
      ? new Date().toISOString() 
      : (existing.tokenGeneratedAt || session.createdAt);

    // Save/Update session in file DB
    const isNewSignature = session.sessionStatus === 'signed' && existing.sessionStatus !== 'signed';

    db.sessions[sessionId] = {
      ...session,
      tokenGeneratedAt,
      syncedAt: new Date().toISOString()
    };

    // Map token for public access
    if (reviewToken) {
      db.tokens[reviewToken] = sessionId;
    }

    writeDb(db);

    console.log(`[HARDENED_RELAY] Staged Session: ${sessionId} | Status: ${session.sessionStatus}`);

    // 2. Trigger Confirmation Email if newly signed
    if (isNewSignature) {
      console.log(`[HARDENED_RELAY] Triggering Final Confirmation for ${sessionId}`);
      // In a real prod env, we'd fire an internal fetch to /api/send-email here
      // to avoid blocking the signature response.
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[HARDENED_RELAY] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

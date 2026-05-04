import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DB_PATH = path.join(process.cwd(), 'data', 'sessions.json');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return { sessions: {}, tokens: {} };
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return { sessions: parsed.sessions || {}, tokens: parsed.tokens || {} };
  } catch { return { sessions: {}, tokens: {} }; }
}

function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, action, payload } = body;

    if (!token || !action) {
      return NextResponse.json({ error: 'Missing token or action' }, { status: 400 });
    }

    const db = readDb();
    const sessionId = db.tokens[token];
    if (!sessionId || !db.sessions[sessionId]) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    const session = db.sessions[sessionId];
    const now = new Date().toISOString();

    // Initialize remoteReview if missing (backward compat)
    if (!session.remoteReview) {
      session.remoteReview = {
        status: "sent",
        sentAt: null, openedAt: null, viewedAt: null, signedAt: null,
        declinedAt: null, declineReason: "",
        callbackRequestedAt: null, callbackPhone: "", callbackPreferredTime: "",
        approvedAt: null, questions: [],
        recipientName: "", recipientEmail: "", recipientRelation: "",
        statusHistory: []
      };
    }

    switch (action) {
      case 'opened': {
        if (!session.remoteReview.openedAt) {
          session.remoteReview.openedAt = now;
        }
        session.remoteReview.status = 'opened';
        session.remoteReview.statusHistory.push({ status: 'opened', at: now });
        break;
      }

      case 'viewed': {
        if (!session.remoteReview.viewedAt) {
          session.remoteReview.viewedAt = now;
        }
        session.remoteReview.status = 'viewed';
        session.remoteReview.statusHistory.push({ status: 'viewed', at: now });
        break;
      }

      case 'question': {
        const question = {
          questionId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          askedAt: now,
          questionText: payload?.questionText || '',
          askerName: payload?.askerName || 'Co-Decision-Maker',
        };
        session.remoteReview.questions.push(question);
        session.remoteReview.status = 'question_submitted';
        session.remoteReview.statusHistory.push({ status: 'question_submitted', at: now });
        break;
      }

      case 'callback': {
        session.remoteReview.callbackRequestedAt = now;
        session.remoteReview.callbackPhone = payload?.phone || '';
        session.remoteReview.callbackPreferredTime = payload?.preferredTime || '';
        session.remoteReview.status = 'callback_requested';
        session.remoteReview.statusHistory.push({ status: 'callback_requested', at: now });
        break;
      }

      case 'approve': {
        session.remoteReview.approvedAt = now;
        session.remoteReview.status = 'approved';
        session.remoteReview.statusHistory.push({ status: 'approved', at: now });
        break;
      }

      case 'sign': {
        session.remoteReview.signedAt = now;
        session.remoteReview.status = 'signed';
        session.remoteReview.statusHistory.push({ status: 'signed', at: now });
        session.sessionStatus = 'signed';
        session.signatureData = {
          ...session.signatureData,
          signerName: payload?.signerName || '',
          signatureImage: payload?.signatureImage || '',
          signedAt: now,
        };
        session.auditEvents = [
          ...(session.auditEvents || []),
          {
            eventName: 'remote_co_decision_maker_signed',
            actorId: 'co_decision_maker',
            occurredAt: now,
            metadata: { method: 'remote_portal', signerName: payload?.signerName }
          }
        ];
        break;
      }

      case 'decline': {
        session.remoteReview.declinedAt = now;
        session.remoteReview.declineReason = payload?.reason || '';
        session.remoteReview.status = 'declined';
        session.remoteReview.statusHistory.push({ status: 'declined', at: now });
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    db.sessions[sessionId] = { ...session, syncedAt: now };
    writeDb(db);

    console.log(`[REMOTE_PORTAL] Action: ${action} | Session: ${sessionId} | Status: ${session.remoteReview.status}`);

    return NextResponse.json({ 
      success: true, 
      status: session.remoteReview.status,
      remoteReview: session.remoteReview 
    });
  } catch (error: any) {
    console.error('[REMOTE_PORTAL] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

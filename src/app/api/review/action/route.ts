import { NextResponse } from 'next/server';
import { getSessionByToken, upsertSession } from '@/lib/supabase-relay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, action, payload } = body;

    if (!token || !action) {
      return NextResponse.json({ error: 'Missing token or action' }, { status: 400 });
    }

    const session = await getSessionByToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Initialize remoteReview if missing
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

    // Upsert back to Supabase
    await upsertSession(session);

    console.log(`[SUPABASE_RELAY] Action: ${action} | Session: ${session.sessionId} | Status: ${session.remoteReview.status}`);

    return NextResponse.json({ 
      success: true, 
      status: session.remoteReview.status,
      remoteReview: session.remoteReview 
    });
  } catch (error: any) {
    console.error('[SUPABASE_RELAY] Action Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

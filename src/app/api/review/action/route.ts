import { NextResponse } from 'next/server';
import { getSessionByToken, upsertSession } from '@/lib/supabase-relay';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updatePipelineLeadStatus(pipelineLeadId: string | null | undefined, status: string) {
  if (!pipelineLeadId) return;
  await supabase
    .from('pipeline_leads')
    .update({ pipeline_status: status })
    .eq('id', pipelineLeadId);
}

export const dynamic = 'force-dynamic';

// ── Microsoft Graph mailer (server-side, no user auth needed) ─────────────────
const CLIENT_ID     = process.env.AZURE_AD_CLIENT_ID;
const TENANT_ID     = process.env.AZURE_AD_TENANT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const SENDER_EMAIL  = process.env.SENDER_EMAIL || 'info@hustadcompanies.com';

async function getGraphToken(): Promise<string | null> {
  if (!CLIENT_ID || !TENANT_ID || !CLIENT_SECRET) return null;
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope:         'https://graph.microsoft.com/.default',
          grant_type:    'client_credentials',
        }).toString(),
      }
    );
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

const DUSTIN_EMAIL = 'dustin@hustadcompanies.com';

async function notifyRep(to: string, subject: string, html: string, cc?: string) {
  const token = await getGraphToken();
  if (!token) return;
  try {
    const ccRecipients = cc
      ? cc.split(',').map(e => ({ emailAddress: { address: e.trim() } }))
      : [];
    await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
          ...(ccRecipients.length ? { ccRecipients } : {}),
        },
        saveToSentItems: 'true',
      }),
    });
  } catch (e) {
    console.warn('[REVIEW_ACTION] Notification email failed silently:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

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

    const repEmail = session.repEmail?.trim() || '';
    const address  = session.property?.address || 'the property';

    // Thread notifications under the original dossier email
    const threadSubject = `Re: Forensic Dossier Ready — ${address}`;

    // CC Dustin on repair/service path sessions
    const isRepairPath =
      session.findings?.outcomeType === 'repair_only' ||
      session.pathData?.selectedPath === 'direct_repair';
    const cc = isRepairPath ? DUSTIN_EMAIL : undefined;

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

        if (repEmail) {
          notifyRep(
            repEmail,
            threadSubject,
            `<div style="font-family:sans-serif;background:#060606;color:#E8EDF8;padding:40px;border-radius:16px;">
              <h2 style="color:#a78bfa;margin-bottom:8px;">Homeowner Question</h2>
              <p style="color:#7090B0;margin-bottom:24px;font-size:13px;">${address} · ${new Date(now).toLocaleString()}</p>
              <div style="background:#1a1f2e;border:1px solid #2d3748;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="color:#E8EDF8;font-size:16px;margin:0;">"${question.questionText}"</p>
                <p style="color:#567090;font-size:11px;margin-top:12px;">— ${question.askerName}</p>
              </div>
              <p style="color:#567090;font-size:12px;">Log in to the Hustad platform to respond to this question.</p>
            </div>`,
            cc
          );
        }
        break;
      }

      case 'callback': {
        session.remoteReview.callbackRequestedAt = now;
        session.remoteReview.callbackPhone = payload?.phone || '';
        session.remoteReview.callbackPreferredTime = payload?.preferredTime || '';
        session.remoteReview.status = 'callback_requested';
        session.remoteReview.statusHistory.push({ status: 'callback_requested', at: now });

        if (repEmail) {
          notifyRep(
            repEmail,
            threadSubject,
            `<div style="font-family:sans-serif;background:#060606;color:#E8EDF8;padding:40px;border-radius:16px;">
              <h2 style="color:#34d399;margin-bottom:8px;">Callback Request</h2>
              <p style="color:#7090B0;margin-bottom:24px;font-size:13px;">${address} · ${new Date(now).toLocaleString()}</p>
              <div style="background:#1a1f2e;border:1px solid #2d3748;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="color:#E8EDF8;margin:0;"><strong style="color:#567090;font-size:11px;display:block;margin-bottom:4px;">PHONE</strong>${session.remoteReview.callbackPhone || '—'}</p>
                <p style="color:#E8EDF8;margin-top:16px;"><strong style="color:#567090;font-size:11px;display:block;margin-bottom:4px;">PREFERRED TIME</strong>${session.remoteReview.callbackPreferredTime || '—'}</p>
              </div>
              <p style="color:#567090;font-size:12px;">Call them back at your earliest convenience.</p>
            </div>`,
            cc
          );
        }
        break;
      }

      case 'approve': {
        session.remoteReview.approvedAt = now;
        session.remoteReview.status = 'approved';
        session.remoteReview.statusHistory.push({ status: 'approved', at: now });

        await updatePipelineLeadStatus(session.pipelineLeadId, 'co_decision_accepted');

        if (repEmail) {
          notifyRep(
            repEmail,
            threadSubject,
            `<div style="font-family:sans-serif;background:#060606;color:#E8EDF8;padding:40px;border-radius:16px;">
              <h2 style="color:#34d399;margin-bottom:8px;">Approval Received</h2>
              <p style="color:#7090B0;font-size:13px;">${address} — the homeowner has approved the next step (no signature required).</p>
            </div>`,
            cc
          );
        }
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

        if (payload?.selectedPath) {
          session.pathData = {
            ...session.pathData,
            selectedPath: payload.selectedPath
          };
        }

        session.auditEvents = [
          ...(session.auditEvents || []),
          {
            eventName: 'remote_co_decision_maker_signed',
            actorId: 'co_decision_maker',
            occurredAt: now,
            metadata: { method: 'remote_portal', signerName: payload?.signerName, path: payload?.selectedPath }
          }
        ];

        await updatePipelineLeadStatus(session.pipelineLeadId, 'signed');

        if (session.centerpointId) {
          try {
            await supabase.from('outbound_queue').insert({
              target_system: 'centerpoint',
              target_id: session.centerpointId, // Opportunity ID
              action: 'update_status',
              payload: { status: 'accepted' }
            });
            console.log(`[OUTBOUND_QUEUE] Queued CP Opportunity ${session.centerpointId} transition to accepted`);
          } catch (e) {
            console.error('[OUTBOUND_QUEUE] Failed to queue CP write-back for review action', e);
          }
        }

        if (repEmail) {
          notifyRep(
            repEmail,
            threadSubject,
            `<div style="font-family:sans-serif;background:#060606;color:#E8EDF8;padding:40px;border-radius:16px;">
              <h2 style="color:#34d399;margin-bottom:8px;">Document Signed</h2>
              <p style="color:#7090B0;font-size:13px;">${address} — <strong style="color:#E8EDF8;">${payload?.signerName || 'Homeowner'}</strong> has remotely signed the authorization dossier.</p>
            </div>`,
            cc
          );
        }
        break;
      }

      case 'decline': {
        session.remoteReview.declinedAt = now;
        session.remoteReview.declineReason = payload?.reason || '';
        session.remoteReview.status = 'declined';
        session.remoteReview.statusHistory.push({ status: 'declined', at: now });

        if (repEmail) {
          notifyRep(
            repEmail,
            threadSubject,
            `<div style="font-family:sans-serif;background:#060606;color:#E8EDF8;padding:40px;border-radius:16px;">
              <h2 style="color:#f87171;margin-bottom:8px;">Review Deferred</h2>
              <p style="color:#7090B0;margin-bottom:24px;font-size:13px;">${address} · ${new Date(now).toLocaleString()}</p>
              ${session.remoteReview.declineReason
                ? `<div style="background:#1a1f2e;border:1px solid #2d3748;border-radius:12px;padding:20px;">
                    <p style="color:#E8EDF8;margin:0;">"${session.remoteReview.declineReason}"</p>
                  </div>`
                : ''}
            </div>`,
            cc
          );
        }
        break;
      }

      case 'needs_more_time': {
        session.remoteReview.status = 'needs_more_time';
        session.remoteReview.statusHistory.push({ status: 'needs_more_time', at: now });

        if (repEmail) {
          notifyRep(
            repEmail,
            threadSubject,
            `<div style="font-family:sans-serif;background:#060606;color:#E8EDF8;padding:40px;border-radius:16px;">
              <h2 style="color:#f59e0b;margin-bottom:8px;">Needs More Time</h2>
              <p style="color:#7090B0;margin-bottom:24px;font-size:13px;">${address} · ${new Date(now).toLocaleString()}</p>
              <p style="color:#E8EDF8;font-size:15px;">The homeowner has reviewed the dossier and needs more time before making a decision. Consider following up in a day or two.</p>
            </div>`,
            cc
          );
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Upsert back to Supabase
    await upsertSession(session);

    console.log(`[REVIEW_ACTION] action=${action} session=${session.sessionId} status=${session.remoteReview.status} notified=${!!repEmail}`);

    return NextResponse.json({
      success: true,
      status: session.remoteReview.status,
      remoteReview: session.remoteReview
    });
  } catch (error: any) {
    console.error('[REVIEW_ACTION] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { upsertSession, getSessionById, getSessionByToken } from '@/lib/supabase-relay';
import { getServiceClient } from '@/lib/supabase-server';

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

export async function POST(request: NextRequest) {
  try {
    // Demo Bypass
    let repId = "00000000-0000-0000-0000-000000000000";
    let payloadRole = "";
    const bypass = request.headers.get("x-demo-bypass");
    const demoSecret = process.env.DEMO_BYPASS_SECRET;
    if (!demoSecret || bypass !== demoSecret) {
      const payload = await requireAuth(request) as any;
      repId = payload.repId;
      payloadRole = payload.role;
    }

    const session = await request.json();
    const sessionId = session.sessionId || session.session_id;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data: existingSession } = await supabase
      .from("inspection_sessions")
      .select("session_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    const isNewSession = !existingSession;

    // Phase 5: Backend Enforcement
    // A valid session MUST originate from a CRM entity unless it's an emergency override or an existing draft update.
    const hasCrmLink = !!(session.centerpointId || session.pipelineLeadId || session.appointmentId);
    const isEmergencyOverride = process.env.NEXT_PUBLIC_QA_MODE === 'true' || 
                                payloadRole === 'admin' || 
                                payloadRole === 'manager';

    if (isNewSession && !hasCrmLink && !isEmergencyOverride) {
      console.warn(`[AUDIT] Rejected rogue session launch from rep ${repId}. Missing CRM linkage.`);
      const { error: auditError } = await supabase.from("audit_events").insert({
        session_id: null,
        event_name: "rogue_session_blocked",
        actor_id: repId,
        metadata: { 
          rogue_session_id: sessionId,
          details: "Rejected session creation due to missing CRM linkage." 
        },
        occurred_at: new Date().toISOString()
      });
      if (auditError) console.error("Audit insert error:", auditError);
      return NextResponse.json({
        success: false,
        message: "Inspection must originate from a valid CenterPoint CRM record."
      }, { status: 403 });
    }
    
    if (isNewSession && !hasCrmLink && isEmergencyOverride) {
      console.info(`[AUDIT] Authorized emergency override session launch from rep ${repId}.`);
      session.emergency_override = true;
      session.crm_reconciliation_required = true;
      session.override_reason = session.overrideReason || "Admin/Manager Emergency Override";
      session.override_by = repId;
    }

    await upsertSession(session);

    // If this session originated from CenterPoint, and we just hit a terminal stage, update CP and Pipeline
    if (session.centerpointId) {
      const isTerminal = session.sessionStatus === 'signed' || session.sessionStatus.startsWith('closed_');
      const isInspectionDone = session.sessionStatus === 'phase_a_complete' || session.sessionStatus === 'rep_review_pending' || session.sessionStatus === 'deferred';

      // 1. Update pipeline_leads
      try {
        let pipelineStatus = 'inspection_in_progress';
        if (session.sessionStatus === 'signed') pipelineStatus = 'signed';
        else if (session.sessionStatus === 'deferred') pipelineStatus = 'inspection_completed';
        else if (isInspectionDone) pipelineStatus = 'inspection_completed';
        else if (isTerminal) pipelineStatus = 'closed';

        if (pipelineStatus !== 'inspection_in_progress') {
          const supabase = getServiceClient();
          await supabase
            .from('pipeline_leads')
            .update({ pipeline_status: pipelineStatus })
            .eq('cpc_ticket_id', session.centerpointId);
          console.log(`[PIPELINE_SYNC] Updated pipeline lead ${session.centerpointId} to ${pipelineStatus}`);
        }
      } catch (e) {
        console.error('[PIPELINE_SYNC] Failed to update pipeline_leads', e);
      }

      // 2. Queue for CenterPoint write-back (Outbound Queue) - DISABLED as per Option 2
      // We do not auto-advance CenterPoint stages to prevent portal UI status mismatch.
      if (isTerminal || isInspectionDone) {
        console.log(`[OUTBOUND_QUEUE] CenterPoint write-back status update disabled for session ${sessionId} (CP Job: ${session.centerpointId})`);
      }
    }

    console.log(`[SUPABASE_RELAY] Synced Session: ${sessionId} | Status: ${session.sessionStatus}`);

    return NextResponse.json({ 
      success: true, 
      debug: { 
        centerpointId: session.centerpointId, 
        sessionStatus: session.sessionStatus,
        isTerminal: session.sessionStatus === 'signed' || session.sessionStatus.startsWith('closed_')
      } 
    });
  } catch (error: any) {
    console.error('[SUPABASE_RELAY] POST Error:', error);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.status || 500 });
  }
}

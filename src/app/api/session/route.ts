import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { upsertSession, getSessionById, getSessionByToken } from '@/lib/supabase-relay';
import { supabase } from '@/lib/supabase';

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
    // Ensure only authenticated reps can sync sessions
    await requireAuth(request);

    const session = await request.json();
    const { sessionId } = session;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    await upsertSession(session);

    // If this session originated from CenterPoint, and we just hit a terminal stage, update CP and Pipeline
    if (session.centerpointId) {
      const isTerminal = session.sessionStatus === 'signed' || session.sessionStatus.startsWith('closed_');
      
      // 1. Update pipeline_leads
      try {
        let pipelineStatus = 'inspection_in_progress';
        if (session.sessionStatus === 'signed') pipelineStatus = 'signed';
        else if (session.sessionStatus === 'deferred') pipelineStatus = 'inspection_completed';
        else if (isTerminal) pipelineStatus = 'closed';

        if (pipelineStatus !== 'inspection_in_progress') {
          await supabase
            .from('pipeline_leads')
            .update({ pipeline_status: pipelineStatus })
            .eq('cpc_ticket_id', session.centerpointId);
          console.log(`[PIPELINE_SYNC] Updated pipeline lead ${session.centerpointId} to ${pipelineStatus}`);
        }
      } catch (e) {
        console.error('[PIPELINE_SYNC] Failed to update pipeline_leads', e);
      }

      // 2. Update CenterPoint Job Status
      if (isTerminal) {
        try {
          const cpStage = session.sessionStatus === 'signed' ? 'completed' : 'closed';
          // We can call our own internal PATCH route for centerpoint transitions
          const patchUrl = new URL(`/api/centerpoint/${session.centerpointId}`, request.url);
          await fetch(patchUrl.toString(), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: cpStage })
          });
          console.log(`[SUPABASE_RELAY] Auto-transitioned CP Job ${session.centerpointId} to ${cpStage}`);
        } catch (e) {
          console.error('[SUPABASE_RELAY] Failed to update CenterPoint stage automatically', e);
        }
      }
    }

    console.log(`[SUPABASE_RELAY] Synced Session: ${sessionId} | Status: ${session.sessionStatus}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SUPABASE_RELAY] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

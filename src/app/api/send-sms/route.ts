import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';


const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_PLACEHOLDER';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'AUTH_PLACEHOLDER';
const client = twilio(accountSid, authToken);
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { 
      to, 
      message,
      sessionId,
      address,
      outcome
    } = payload;

    let isClaimSensitive = false;
    if (sessionId) {
      const { getServiceClient } = require('@/lib/supabase-server');
      const supabase = getServiceClient();
      const { data: session } = await supabase
        .from('inspection_sessions')
        .select('session_data')
        .eq('id', sessionId)
        .single();
      
      if (session?.session_data) {
        const data = session.session_data;
        isClaimSensitive = 
          data.claimRelatedWork === true ||
          data.findings?.outcomeType === "claim_review_candidate" ||
          data.findings?.outcomeType === "full_restoration_candidate" ||
          !!data.findings?.estimatedClaimValue;
      }
    }

    if (isClaimSensitive) {
      const { createApprovalRequest } = require('@/lib/approvals/createApprovalRequest');
      const approval = await createApprovalRequest(
        { ...payload, type: "sms_send" },
        "System",
        "system@hustadcompanies.com",
        "pending_comms_approval"
      );
      console.log(`[SMS_SYSTEM] Claim-sensitive content detected for Session: ${sessionId}. Approval requested: ${approval.approval_token}`);
      return NextResponse.json({ success: true, status: 'pending_approval', token: approval.approval_token }, { status: 202 });
    }

    console.log(`[SMS_SYSTEM] Initiating delivery for Session: ${sessionId}`);

    // Clean phone number (remove non-digits, ensure +1 for US)
    let formattedPhone = to.replace(/\D/g, '');
    if (formattedPhone.length === 10) formattedPhone = '+1' + formattedPhone;
    else if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;

    const defaultMessage = `Hustad Residential: Your Inspection Report for ${address} is complete. Outcome: ${outcome.toUpperCase().replace(/_/g, ' ')}. A full copy has been sent to your email. Thank you.`;

    const response = await client.messages.create({
      body: message || defaultMessage,
      from: twilioNumber,
      to: formattedPhone,
    });

    console.log(`[SMS_SYSTEM] Success: SMS dispatched via Twilio (${response.sid})`);

    return NextResponse.json({ 
      success: true, 
      sid: response.sid,
      timestamp: new Date().toISOString() 
    });

  } catch (error: any) {
    console.error('[SMS_SYSTEM] Delivery Failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

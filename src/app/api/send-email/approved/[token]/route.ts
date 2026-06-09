import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

// Azure Configuration from environment variables
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'info@hustadcompanies.com';

export const dynamic = 'force-dynamic';

async function getAccessToken() {
  if (!CLIENT_ID || !TENANT_ID || !CLIENT_SECRET) {
    throw new Error("CRITICAL: Azure credentials missing from environment variables.");
  }

  const url = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID!,
    scope: 'https://graph.microsoft.com/.default',
    client_secret: CLIENT_SECRET!,
    grant_type: 'client_credentials',
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || 'Failed to get access token');
  return data.access_token;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = getServiceClient();
    const { data: approval, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('approval_token', params.token)
      .single();

    if (fetchError || !approval) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (approval.status !== 'approved') {
      return NextResponse.json({ error: "Request is not approved" }, { status: 400 });
    }

    const payload = approval.request_payload as Record<string, any>;
    
    if (payload.type === "email_send") {
      const senderEmail = approval.requested_by_email || SENDER_EMAIL;
      const { to, cc, subject, html, pdfBase64, fileName, sessionId } = payload;
      
      console.log(`[OUTLOOK_SYSTEM] Initiating delivery for Approved Session: ${sessionId} from ${senderEmail}`);

      const accessToken = await getAccessToken();

      const mailPayload: any = {
        message: {
          subject: subject || 'Hustad Inspection Report // Audit Complete',
          body: {
            contentType: 'HTML',
            content: html,
          },
          toRecipients: [
            { emailAddress: { address: to } },
          ],
          ccRecipients: cc
            ? cc.split(',').map((email: string) => ({ emailAddress: { address: email.trim() } }))
            : [],
          ...(pdfBase64 ? {
            attachments: [
              {
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: fileName || 'Hustad_Forensic_Dossier.pdf',
                contentType: 'application/pdf',
                contentBytes: pdfBase64,
              },
            ],
          } : {}),
        },
        saveToSentItems: 'true',
      };

      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mailPayload),
      });

      if (!response.ok) {
        const text = await response.text();
        let message = `Graph Error: ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          message = errorData.error?.message || message;
        } catch {
          message = text || message;
        }
        throw new Error(message);
      }

      console.log(`[OUTLOOK_SYSTEM] Success: Approved Email dispatched via ${senderEmail}`);
      
      await supabase.from('approval_requests').update({ status: 'sent' }).eq('id', approval.id);

      return NextResponse.json({ 
        success: true, 
        timestamp: new Date().toISOString() 
      });
    } else if (payload.type === "sms_send") {
      const { to, message, sessionId, address, outcome } = payload;
      console.log(`[SMS_SYSTEM] Initiating delivery for Approved Session: ${sessionId}`);

      let formattedPhone = to.replace(/\D/g, '');
      if (formattedPhone.length === 10) formattedPhone = '+1' + formattedPhone;
      else if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;

      const defaultMessage = `Hustad Residential: Your Inspection Report for ${address} is complete. Outcome: ${outcome.toUpperCase().replace(/_/g, ' ')}. A full copy has been sent to your email. Thank you.`;

      const twilio = require('twilio');
      const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_PLACEHOLDER';
      const authToken = process.env.TWILIO_AUTH_TOKEN || 'AUTH_PLACEHOLDER';
      const client = twilio(accountSid, authToken);
      const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

      const response = await client.messages.create({
        body: message || defaultMessage,
        from: twilioNumber,
        to: formattedPhone,
      });

      console.log(`[SMS_SYSTEM] Success: Approved SMS dispatched via Twilio (${response.sid})`);
      
      await supabase.from('approval_requests').update({ status: 'sent' }).eq('id', approval.id);

      return NextResponse.json({ success: true, sid: response.sid, timestamp: new Date().toISOString() });
    } else {
      return NextResponse.json({ error: "Unsupported payload type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[OUTLOOK_SYSTEM] Delivery Failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

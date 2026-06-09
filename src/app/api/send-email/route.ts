import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

/**
 * MICROSOFT GRAPH EMAIL RELAY
 * This route uses the Client Credentials flow to send emails via Outlook.
 */

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

export async function POST(request: NextRequest) {
  try {
    // Ensure only authenticated reps can trigger email dispatch
    const authPayload = await requireAuth(request);

    // Use the logged-in rep's email as the sender so replies go back to them.
    // Falls back to the shared info@ mailbox if auth email isn't available.
    const senderEmail = authPayload?.email?.trim() || SENDER_EMAIL;

    const payload = await request.json();
    const {
      to,
      cc,
      subject,
      html,
      pdfBase64,
      fileName,
      attachments, // Array of { name: string, contentBytes: string, contentType?: string }
      sessionId
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
        { ...payload, type: "email_send" },
        authPayload?.name || "System",
        authPayload?.email || senderEmail,
        "pending_comms_approval"
      );
      console.log(`[OUTLOOK_SYSTEM] Claim-sensitive content detected for Session: ${sessionId}. Approval requested: ${approval.approval_token}`);
      return NextResponse.json({ success: true, status: 'pending_approval', token: approval.approval_token }, { status: 202 });
    }

    console.log(`[OUTLOOK_SYSTEM] Initiating delivery for Session: ${sessionId} from ${senderEmail}`);

    const accessToken = await getAccessToken();

        const processedAttachments = await Promise.all((attachments || []).map(async (att: any) => {
          let contentBytes = att.contentBytes;
          if (att.fileUrl) {
            const res = await fetch(att.fileUrl);
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              contentBytes = Buffer.from(arrayBuffer).toString('base64');
            }
          }
          return {
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: att.name,
            contentType: att.contentType || 'application/pdf',
            contentBytes: contentBytes,
          };
        }));

        const mailPayload: any = {
          message: {
            subject: subject || 'Hustad Forensic Dossier // Audit Complete',
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
            attachments: [
              ...(pdfBase64 ? [{
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: fileName || 'Hustad_Forensic_Dossier.pdf',
                contentType: 'application/pdf',
                contentBytes: pdfBase64,
              }] : []),
              ...processedAttachments
            ]
          },
          saveToSentItems: 'true',
        };

    // Remove empty attachments array
    if (mailPayload.message.attachments.length === 0) {
      delete mailPayload.message.attachments;
    }

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
      console.error('[OUTLOOK_SYSTEM] Graph API Detailed Error:', text);
      throw new Error(message);
    }

    console.log(`[OUTLOOK_SYSTEM] Success: Email dispatched via ${senderEmail}`);

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString() 
    });

  } catch (error: any) {
    console.error('[OUTLOOK_SYSTEM] Delivery Failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

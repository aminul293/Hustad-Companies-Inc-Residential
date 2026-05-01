import { NextResponse } from 'next/server';

/**
 * MICROSOFT GRAPH EMAIL RELAY
 * This route uses the Client Credentials flow to send emails via Outlook.
 */

// Azure Configuration from environment variables
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'info@hustadcompanies.com';

if (!CLIENT_ID || !TENANT_ID || !CLIENT_SECRET) {
  console.error("CRITICAL: Azure credentials missing from environment variables.");
}

async function getAccessToken() {
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

export async function POST(request: Request) {
  try {
    const { 
      to, 
      cc, 
      subject, 
      html, 
      pdfBase64, 
      fileName,
      sessionId 
    } = await request.json();

    console.log(`[OUTLOOK_SYSTEM] Initiating delivery for Session: ${sessionId}`);

    const accessToken = await getAccessToken();

    const mailPayload = {
      message: {
        subject: subject || 'Hustad Forensic Dossier // Audit Complete',
        body: {
          contentType: 'HTML',
          content: html,
        },
        toRecipients: [
          { emailAddress: { address: to } },
        ],
        ccRecipients: cc ? [
          { emailAddress: { address: cc } },
        ] : [],
        attachments: [
          {
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: fileName || 'Hustad_Forensic_Dossier.pdf',
            contentType: 'application/pdf',
            contentBytes: pdfBase64,
          },
        ],
      },
      saveToSentItems: 'true',
    };

    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[OUTLOOK_SYSTEM] Graph API Detailed Error:', JSON.stringify(errorData, null, 2));
      const message = errorData.error?.message || `Graph Error: ${response.status}`;
      throw new Error(message);
    }

    console.log(`[OUTLOOK_SYSTEM] Success: Email dispatched via ${SENDER_EMAIL}`);

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

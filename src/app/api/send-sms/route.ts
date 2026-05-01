import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';


const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_PLACEHOLDER';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'AUTH_PLACEHOLDER';
const client = twilio(accountSid, authToken);
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

export async function POST(request: Request) {
  try {
    const { 
      to, 
      message,
      sessionId,
      address,
      outcome
    } = await request.json();

    console.log(`[SMS_SYSTEM] Initiating delivery for Session: ${sessionId}`);

    // Clean phone number (remove non-digits, ensure +1 for US)
    let formattedPhone = to.replace(/\D/g, '');
    if (formattedPhone.length === 10) formattedPhone = '+1' + formattedPhone;
    else if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;

    const defaultMessage = `Hustad Residential: Your Forensic Dossier for ${address} is complete. Outcome: ${outcome.toUpperCase().replace(/_/g, ' ')}. A full copy has been sent to your email. Thank you.`;

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

export function buildRepCaptureEmail({ captureUrl, address, homeownerName, repName, sessionId }: {
  captureUrl: string;
  address: string;
  homeownerName: string;
  repName: string;
  sessionId: string;
}): string {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(captureUrl)}&bgcolor=ffffff&color=1a1a2e&qzone=2&format=png`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#0d0d1a;padding:28px 36px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#6366f1;font-weight:600;">HUSTAD COMPANIES</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Inspection Camera Link</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 36px;">
          <p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Hi ${repName},</p>
          <p style="margin:0 0 24px;font-size:16px;color:#111827;line-height:1.6;">
            Your session for <strong>${address}</strong>${homeownerName ? ` (${homeownerName})` : ''} has started.<br>
            Open the link below on your phone to take the required inspection photos — they'll sync to the tablet automatically.
          </p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#6366f1;border-radius:12px;padding:0;">
              <a href="${captureUrl}" style="display:block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.01em;">
                📷 &nbsp;Open Rep Camera
              </a>
            </td></tr>
          </table>

          <!-- QR + URL row -->
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f8fc;border-radius:12px;padding:20px;margin-bottom:24px;">
            <tr>
              <td style="width:96px;vertical-align:middle;">
                <img src="${qrUrl}" width="96" height="96" alt="QR Code" style="display:block;border-radius:8px;" />
              </td>
              <td style="padding-left:20px;vertical-align:middle;">
                <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;font-weight:600;">Or scan with phone camera</p>
                <p style="margin:0;font-size:11px;color:#6366f1;word-break:break-all;font-family:monospace;">${captureUrl}</p>
              </td>
            </tr>
          </table>

          <!-- Session detail -->
          <table cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #f0f0f4;padding-top:20px;">
            <tr>
              <td style="font-size:11px;color:#9ca3af;font-family:monospace;">SESSION&nbsp;&nbsp;${sessionId.slice(-12).toUpperCase()}</td>
              <td align="right" style="font-size:11px;color:#9ca3af;">${new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f8fc;padding:18px 36px;border-top:1px solid #f0f0f4;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
            This link is tied to this session only. Photos captured will appear on the tablet in real-time.<br>
            Hustad Companies Inc · Madison, WI
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

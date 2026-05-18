import crypto from "crypto";

// 256-bit cryptographically secure random token (64 hex chars).
// This token is the sole credential sent to the service manager.
export function generateApprovalToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Returns a Date 48 hours from now.
export function getTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 48);
  return expiry;
}

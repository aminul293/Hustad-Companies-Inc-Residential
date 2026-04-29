import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { getServiceClient } from "./supabase-server";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_EXPIRY = "12h"; // Field sessions can be long

export interface TokenPayload {
  repId: string;
  email: string;
  name: string;
  role: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function checkPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, 8);
}

export function checkPin(pin: string, hash: string): boolean {
  return bcrypt.compareSync(pin, hash);
}

// Extract token from Authorization header or cookie
export function getTokenFromRequest(req: NextRequest): TokenPayload | null {
  // Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }
  // Check cookie
  const cookie = req.cookies.get("hustad_token");
  if (cookie?.value) {
    return verifyToken(cookie.value);
  }
  return null;
}

// Middleware helper — returns null payload or throws JSON response
export async function requireAuth(req: NextRequest): Promise<TokenPayload> {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return payload;
}

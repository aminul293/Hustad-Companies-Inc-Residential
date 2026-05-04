import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "hustad-secret-2024";

// --- EXISTING AUTH LOGIC (RESTORED) ---
export async function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function checkPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function signToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): any {
  const token = req.cookies.get("hustad_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return payload;
}

// --- NEW ENTERPRISE AUTH LOGIC (NEXT-AUTH) ---
export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "local-dev-client-id",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "local-dev-client-secret",
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "hustad-fallback-secret-2026-field-secure",
};

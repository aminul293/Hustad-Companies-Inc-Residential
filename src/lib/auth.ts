import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getToken } from "next-auth/jwt";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

// Force NEXTAUTH_URL on Vercel if missing or set to localhost
if (process.env.VERCEL_URL && (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost"))) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const nextAuthSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "hustad-fallback-secret-2026-field-secure";

const legacyJwtSecret = process.env.JWT_SECRET || nextAuthSecret;

// --- ENTERPRISE AUTH (NEXT-AUTH) ---
export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      id: "azure-ad",
      clientId: process.env.AZURE_AD_CLIENT_ID || "local-dev-client-id",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "local-dev-client-secret",
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      authorization: {
        params: {
          scope: "openid profile email User.Read",
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        session.user.name = token.name || session.user.name;
        session.user.email = token.email || session.user.email;
        session.user.image = (token.picture as string | undefined) || session.user.image;
      }
      return session;
    },
    async jwt({ token, user, profile }) {
      if (user) {
        token.id = user.id;
        token.name = user.name || token.name;
        token.email = user.email || token.email;
        token.picture = user.image || token.picture;
      }
      if (profile) {
        const azureProfile = profile as Record<string, unknown>;
        token.name = (azureProfile.name as string | undefined) || token.name;
        token.email =
          (azureProfile.email as string | undefined) ||
          (azureProfile.preferred_username as string | undefined) ||
          token.email;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: nextAuthSecret,
  debug: process.env.NEXTAUTH_DEBUG === "true",
};

export interface AuthPayload {
  repId: string;
  email: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export async function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function checkPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, legacyJwtSecret, { expiresIn: "12h" });
}

export function getTokenFromRequest(req: NextRequest): AuthPayload | null {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cookieToken = req.cookies.get("hustad_token")?.value;
  const token = bearer || cookieToken;

  if (!token) return null;

  try {
    return jwt.verify(token, legacyJwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthPayload> {
  const legacyPayload = getTokenFromRequest(req);
  if (legacyPayload) return legacyPayload;

  const nextAuthToken = await getToken({ req, secret: nextAuthSecret });
  if (nextAuthToken?.sub || nextAuthToken?.email) {
    return {
      repId: String(nextAuthToken.id || nextAuthToken.sub || nextAuthToken.email),
      email: String(nextAuthToken.email || ""),
      name: String(nextAuthToken.name || nextAuthToken.email || "Hustad Rep"),
      role: "rep",
    };
  }

  throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

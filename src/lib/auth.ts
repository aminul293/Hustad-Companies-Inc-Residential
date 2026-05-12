import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getToken } from "next-auth/jwt";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

// NEXTAUTH_URL is automatically handled by Vercel's environment variables.
// Manual overrides here are removed to prevent protocol/host mismatches 
// when using custom domains or multiple preview branches.

const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
const legacyJwtSecret = process.env.JWT_SECRET || nextAuthSecret || "hustad-dev-secret";

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

        // Upsert rep identity on every Azure AD sign-in so names stay current
        const repId = String(token.id || token.sub || "");
        if (repId) {
          try {
            await getServiceClient().from("reps").upsert(
              {
                id: repId,
                name: String(token.name || token.email || repId),
                email: String(token.email || ""),
                last_seen_at: new Date().toISOString(),
              },
              { onConflict: "id" }
            );
          } catch {
            // Non-fatal — auth still succeeds if upsert fails
          }
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: nextAuthSecret,
  debug: true, // Force debug on for troubleshooting the current server error
  logger: {
    error(code, metadata) {
      console.error(`[NEXTAUTH_ERROR] ${code}`, metadata);
    },
    warn(code) {
      console.warn(`[NEXTAUTH_WARN] ${code}`);
    },
    debug(code, metadata) {
      console.log(`[NEXTAUTH_DEBUG] ${code}`, metadata);
    },
  },
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

  const nextAuthToken = await getToken({ 
    req, 
    secret: nextAuthSecret || "hustad-dev-secret" 
  });

  if (nextAuthToken?.sub || nextAuthToken?.email) {
    return {
      repId: String(nextAuthToken.id || nextAuthToken.sub || nextAuthToken.email),
      email: String(nextAuthToken.email || ""),
      name: String(nextAuthToken.name || nextAuthToken.email || "Hustad Rep"),
      role: (nextAuthToken.role as string) || "rep",
    };
  }

  // QA/TESTING BYPASS
  const QA_MODE = process.env.NEXT_PUBLIC_QA_MODE === "true";
  if (QA_MODE || process.env.NODE_ENV === "development") {
    const url = new URL(req.url);
    const repId = url.searchParams.get("repId");
    if (repId) {
      return {
        repId,
        name: "QA Tester (Mock)",
        email: "qa@hustadcompanies.com",
        role: "rep"
      };
    }
  }

  throw NextResponse.json(
    { error: "Unauthorized", message: "Enterprise identity required." }, 
    { status: 401 }
  );
}

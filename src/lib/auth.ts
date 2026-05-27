import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getToken } from "next-auth/jwt";

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { IS_QA_MODE } from "./qa-mode";

// NEXTAUTH_URL is automatically handled by Vercel's environment variables.
// Manual overrides here are removed to prevent protocol/host mismatches 
// when using custom domains or multiple preview branches.

const nextAuthSecret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

if (!nextAuthSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXTAUTH_SECRET (or JWT_SECRET) is not set. " +
    "Set it in your Vercel environment variables before deploying."
  );
}

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
      // Upsert on every sign-in (user present) so names stay current.
      // Placed outside `if (profile)` because profile only fires on first OAuth login.
      if (user) {
        const repId = String(token.id || token.sub || "");
        if (repId) {
          try {
            await getServiceClient().from("reps").upsert(
              {
                id: repId,
                name: String(token.name || token.email || repId),
                email: String(token.email || ""),
                last_seen_at: new Date().toISOString(),
                active: true,
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
  debug: process.env.NODE_ENV === "development",
};

export interface AuthPayload {
  repId: string;
  email: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}



export async function requireAuth(req: NextRequest): Promise<AuthPayload> {
  const authHeader = req.headers.get("authorization");
  const systemSecret = process.env.CRON_SECRET || process.env.JWT_SECRET;
  if (authHeader && systemSecret && authHeader === `Bearer ${systemSecret}`) {
    return {
      repId: "system",
      email: "system@hustadcompanies.com",
      name: "System Cron",
      role: "admin",
    };
  }

  const nextAuthToken = await getToken({
    req,
    secret: nextAuthSecret,
  });

  if (nextAuthToken?.sub || nextAuthToken?.email) {
    return {
      repId: String(nextAuthToken.id || nextAuthToken.sub || nextAuthToken.email),
      email: String(nextAuthToken.email || ""),
      name: String(nextAuthToken.name || nextAuthToken.email || "Hustad Rep"),
      role: (nextAuthToken.role as string) || "rep",
    };
  }

  // QA/TESTING BYPASS — only active when IS_QA_MODE is true
  if (IS_QA_MODE) {
    const url = new URL(req.url);
    const repId = url.searchParams.get("repId");
    if (repId === "rep_001") {
      return {
        repId,
        name: "QA Tester (Mock)",
        email: "qa@hustadcompanies.com",
        role: "rep",
      };
    }
  }

  throw NextResponse.json(
    { error: "Unauthorized", message: "Valid session required." },
    { status: 401 }
  );
}

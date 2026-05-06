import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

// Force NEXTAUTH_URL on Vercel if missing or set to localhost
if (process.env.VERCEL_URL && (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost"))) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

// --- ENTERPRISE AUTH (NEXT-AUTH) ---
export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      id: "azure-ad",
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
  debug: true,
};

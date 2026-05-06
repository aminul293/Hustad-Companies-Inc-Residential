import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

import { NextRequest } from "next/server";

const handler = async (req: NextRequest, res: any) => {
  const host = req.headers.get("host");
  if (host) {
    const protocol = host.includes("localhost") ? "http" : "https";
    process.env.NEXTAUTH_URL = `${protocol}://${host}`;
  }
  return NextAuth(authOptions)(req, res);
};

export { handler as GET, handler as POST };

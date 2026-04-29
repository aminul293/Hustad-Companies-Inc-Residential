import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { checkPassword, checkPin, signToken } from "@/lib/auth";

// POST /api/auth — Login with email+password or email+pin
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, pin } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password && !pin) {
      return NextResponse.json({ error: "Password or PIN is required" }, { status: 400 });
    }

    // MOCK DB check for local preview without Supabase
    let valid = false;
    let rep = null;

    if (email.toLowerCase() === "admin@hustad.com" && (password === "hustad2026" || pin === "1234")) {
      valid = true;
      rep = { id: "1", email: "admin@hustad.com", name: "Admin User", role: "admin" };
    } else if (email.toLowerCase() === "rep@hustad.com" && (password === "field2026" || pin === "5678")) {
      valid = true;
      rep = { id: "2", email: "rep@hustad.com", name: "Field Rep", role: "rep" };
    }

    if (!valid || !rep) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      repId: rep.id,
      email: rep.email,
      name: rep.name,
      role: rep.role,
    });

    const response = NextResponse.json({
      token,
      rep: { id: rep.id, email: rep.email, name: rep.name, role: rep.role },
    });

    // Set httpOnly cookie for browser auth
    response.cookies.set("hustad_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/auth — Logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("hustad_token", "", { maxAge: 0, path: "/" });
  return response;
}

// GET /api/auth — Check current session
export async function GET(req: NextRequest) {
  const { getTokenFromRequest } = await import("@/lib/auth");
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, rep: payload });
}

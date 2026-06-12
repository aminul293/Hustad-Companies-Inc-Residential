import { Session } from "next-auth";
import { IS_QA_MODE } from "./qa-mode";

export interface AuthenticatedRep {
  id: string;
  name: string;
  email: string;
  role?: string;
}

/**
 * Resolves the current user's representative identity from either:
 * 1. An active NextAuth session (Production)
 * 2. A mock repId bypass (QA/Staging Mode Only)
 */
export function getAuthenticatedRep(
  authSession: Session | null | undefined,
  mockRepId?: string | null
): AuthenticatedRep | null {
  const user = authSession?.user;
  
  // 1. Production Path: Authenticated Azure AD User
  if (user) {
    const email = (user.email || "").trim();
    const name = (user.name || email || "Hustad Rep").trim();
    const id = String((user as any).id || email || name).trim();
    if (id) {
      if (email.toLowerCase() === "aminul@hustadcompanies.com") {
        return { id, name, email, role: "owner" };
      }
      return { id, name, email };
    }
  }

  // 2. QA/Staging Path: URL-based mock identity (rep_001 only)
  if (IS_QA_MODE && mockRepId === 'rep_001') {
    return {
      id: 'rep_001',
      name: "QA Tester (Mock)",
      email: "qa@hustadcompanies.com",
    };
  }

  return null;
}

/**
 * Stamps a session state with the current representative's identity.
 */
export function stampSessionWithRep(
  session: any,
  rep: AuthenticatedRep
) {
  return {
    ...session,
    repId: rep.id,
    repName: rep.name,
    repEmail: rep.email,
  };
}

/**
 * Legacy support for manual selection (not used in enterprise auth flow)
 */
export function getStoredRep(): AuthenticatedRep | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem("hustad_rep");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

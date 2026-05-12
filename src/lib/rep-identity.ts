import type { Session } from "next-auth";
import type { SessionState } from "@/types/session";

export interface AuthenticatedRep {
  id: string;
  name: string;
  email: string;
}

const QA_MODE = process.env.NEXT_PUBLIC_QA_MODE === "true";

export function getAuthenticatedRep(
  authSession: Session | null | undefined,
  mockRepId?: string | null
): AuthenticatedRep | null {
  const user = authSession?.user;
  
  if (user) {
    const email = (user.email || "").trim();
    const name = (user.name || email || "Hustad Rep").trim();
    const id = String((user as any).id || email || name).trim();
    if (id) return { id, name, email };
  }

  // QA/TESTING BYPASS
  if (QA_MODE && mockRepId) {
    return {
      id: mockRepId,
      name: "QA Tester (Mock)",
      email: "qa@hustadcompanies.com",
    };
  }

  return null;
}

export function stampSessionWithRep(
  session: SessionState,
  rep: AuthenticatedRep
): SessionState {
  return {
    ...session,
    repId: rep.id,
    repName: rep.name,
    repEmail: rep.email,
  };
}

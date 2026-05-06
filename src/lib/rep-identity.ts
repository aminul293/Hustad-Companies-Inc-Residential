import type { Session } from "next-auth";
import type { SessionState } from "@/types/session";

export interface AuthenticatedRep {
  id: string;
  name: string;
  email: string;
}

export function getAuthenticatedRep(
  authSession: Session | null | undefined
): AuthenticatedRep | null {
  const user = authSession?.user;
  if (!user) return null;

  const email = (user.email || "").trim();
  const name = (user.name || email || "Hustad Rep").trim();
  const id = String((user as any).id || email || name).trim();

  if (!id) return null;

  return {
    id,
    name,
    email,
  };
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

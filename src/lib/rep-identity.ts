import type { SessionState } from "@/types/session";

export interface AuthenticatedRep {
  id: string;
  name: string;
  email: string;
}

export function getAuthenticatedRep(): AuthenticatedRep {
  return {
    id: "rep_001",
    name: "Hustad Rep",
    email: "rep@hustad.com",
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

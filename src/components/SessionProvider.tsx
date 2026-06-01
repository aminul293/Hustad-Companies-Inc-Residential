"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { IS_QA_MODE } from "@/lib/qa-mode";
import { useSession as useAuthSession } from "next-auth/react";
import type { SessionState, ScreenId } from "@/types/session";
import { getNextScreen, shouldShowScreen, SCREEN_FLOW } from "@/types/session";
import {
  createSession,
  saveSession,
  loadActiveSession,
  loadDraftById,
  navigateTo,
  completePhaseA,
  addAuditEvent,
  migrateLegacyPhotos,
} from "@/lib/session";
import { syncSessionToServer, queueForSync, processSyncQueue, getStoredRep, syncAllPhotos, fetchSessionById } from "@/lib/sync";
import { getAuthenticatedRep, stampSessionWithRep } from "@/lib/rep-identity";

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface SessionCtx {
  session: SessionState;
  updateSession: (s: SessionState) => void;
  goNext: () => void;
  goBack: () => void;
  jumpTo: (screen: ScreenId) => void;
  repJumpTo: (screen: ScreenId) => void;
  resetSession: () => void;
  loadDraft: (sessionId: string) => void;
  isOnline: boolean;
}

const Ctx = createContext<SessionCtx | null>(null);

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data: authSession, status: authStatus } = useAuthSession();
  
  // Support mock rep for QA/Dev
  const [mockId, setMockId] = useState<string | null>(null);
  useEffect(() => {
    if (IS_QA_MODE && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("repId");
      if (id === 'rep_001') setMockId(id);
    }
  }, []);

  const authRep = getAuthenticatedRep(authSession, mockId);
  const [session, setSession] = useState<SessionState | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "authenticated" && authRep) {
      const stored = loadActiveSession();
      let next: SessionState;

      if (stored?.repId === authRep.id) {
        // Heal malformed or old sessions
        const fresh = createSession(authRep.id, authRep.name, authRep.email);
        next = {
          ...fresh,
          ...stored,
          property: { ...fresh.property, ...(stored.property || {}) },
          findings: { ...fresh.findings, ...(stored.findings || {}) },
          pathData: { ...fresh.pathData, ...(stored.pathData || {}) },
          signatureData: { ...fresh.signatureData, ...(stored.signatureData || {}) },
          repId: authRep.id,
          repName: authRep.name,
          repEmail: authRep.email,
        };
      } else {
        next = createSession(authRep.id, authRep.name, authRep.email);
      }


      // Trigger Migration & Sync
      migrateLegacyPhotos(next).then((migrated) => {
        setSession(migrated);
        // Start background sync
        syncAllPhotos(migrated, (updated) => {
          setSession(updated);
          saveSession(updated);
        });
      });
      return;
    }

    // Explicit demo mode — only activate when ?demo=true is in the URL
    const isDemoUrl = typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "true";

    if (isDemoUrl) {
      setIsDemo(true);
      setSession(createSession("rep_001", "Hustad Demo Rep"));
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/signin";
    }
  }, [authStatus, authRep?.id, authRep?.name, authRep?.email]);

  // Autosave locally + sync to server (debounced)
  useEffect(() => {
    if (!session) return;
    if (authStatus !== "authenticated" && !authRep) return;
    saveSession(session);

    // Debounced server sync — skip empty setup sessions to avoid orphan DB rows
    const timer = setTimeout(() => {
      if (session.currentScreen === "P00_rep_launch" && !session.property.address) return;
      if (navigator.onLine) {
        syncSessionToServer(session).catch(() => {
          queueForSync(session);
        });
      } else {
        queueForSync(session);
      }
    }, 2000); // 2 second debounce for server sync

    return () => clearTimeout(timer);
  }, [session, authStatus]);

  // ── Device sleep/wake handler ──────────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const stored = loadActiveSession();
        if (stored && session && stored.sessionId === session.sessionId) {
          if (stored.lastSavedAt !== session.lastSavedAt) {
            setSession(authRep ? stampSessionWithRep(stored, authRep) : stored);
          }
        }
        setIsOnline(navigator.onLine);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (authStatus !== "authenticated" && !authRep) return;
      // Process offline sync queue when we come back online
      processSyncQueue().then((count) => {
      });
    };
    const handleOffline = () => setIsOnline(false);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [session?.sessionId, session?.lastSavedAt, authStatus, authRep?.id, authRep?.name, authRep?.email]);

  const updateSession = useCallback((s: SessionState) => {
    setSession(authRep ? stampSessionWithRep(s, authRep) : s);
  }, [authRep?.id, authRep?.name, authRep?.email]);

  const goNext = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      let nextScreen = getNextScreen(prev.currentScreen, prev);
      while (nextScreen && !shouldShowScreen(nextScreen, prev)) {
        nextScreen = getNextScreen(nextScreen, prev);
      }
      if (!nextScreen) return prev;
      let updated = prev;
      if (prev.currentScreen === "A09_buyer_priorities") {
        updated = completePhaseA(prev);
      }
      return navigateTo(updated, nextScreen);
    });
  }, []);

  const goBack = useCallback(() => {
    console.log("[GOBACK] goBack called");
    setSession((prev) => {
      if (!prev) {
        console.warn("[GOBACK] No active session");
        return prev;
      }
      const ORDERED_SCREENS: ScreenId[] = SCREEN_FLOW.map((s) => s.id);
      const idx = ORDERED_SCREENS.indexOf(prev.currentScreen);
      console.log("[GOBACK] Current screen:", prev.currentScreen, "Index:", idx);
      if (idx <= 0) {
        console.warn("[GOBACK] Index <= 0, cannot go back");
        return prev;
      }
      let targetIdx = idx - 1;
      while (targetIdx > 0 && !shouldShowScreen(ORDERED_SCREENS[targetIdx], prev)) {
        console.log("[GOBACK] Skipping screen:", ORDERED_SCREENS[targetIdx]);
        targetIdx--;
      }
      console.log("[GOBACK] Target screen selected:", ORDERED_SCREENS[targetIdx]);
      return navigateTo(prev, ORDERED_SCREENS[targetIdx]);
    });
  }, []);

  const jumpTo = useCallback((screen: ScreenId) => {
    setSession((prev) => prev ? navigateTo(prev, screen) : prev);
  }, []);

  const repJumpTo = useCallback((screen: ScreenId) => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.mode !== "rep") return prev;
      const jumped = navigateTo(prev, screen);
      return addAuditEvent(jumped, "rep_jump_navigation", {
        from: prev.currentScreen,
        to: screen,
        repId: prev.repId,
      });
    });
  }, []);

  const resetSession = useCallback(() => {
    if (authRep) {
      const fresh = createSession(authRep.id, authRep.name, authRep.email);
      setSession(fresh);
      return;
    }

    const rep = getStoredRep();
    const fresh = createSession(rep?.id || "rep_001", rep?.name || "Hustad Rep");
    setSession(fresh);
  }, [authRep?.id, authRep?.name, authRep?.email]);

  const loadDraft = useCallback((sessionId: string) => {
    if (!authRep) return;

    const draft = loadDraftById(sessionId, authRep.id);
    if (draft) {
      const ownedDraft = stampSessionWithRep(draft, authRep);
      const isClosed = ownedDraft.sessionStatus.startsWith("closed_") || 
                       ownedDraft.sessionStatus === "signed" || 
                       ownedDraft.sessionStatus === "deferred";
      if (ownedDraft.currentScreen === "P00_rep_launch") {
        // Only advance to the presentation if the intake form is complete;
        // otherwise stay at P00 so the rep can fill in the missing address.
        if (ownedDraft.property.address) {
          setSession(navigateTo(ownedDraft, "A01_welcome"));
        } else {
          setSession(ownedDraft);
        }
      } else if (isClosed) {
        setSession(navigateTo(ownedDraft, "B12_findings_summary"));
      } else {
        setSession(ownedDraft);
      }
    } else {
      // Try to fetch from server if it is a cloud session that hasn't been cached locally
      fetchSessionById(sessionId).then((serverSession) => {
        if (serverSession) {
          const ownedDraft = stampSessionWithRep(serverSession, authRep);
          saveSession(ownedDraft);
          localStorage.setItem("hustad_draft_" + sessionId, JSON.stringify(ownedDraft));
          const isClosed = ownedDraft.sessionStatus.startsWith("closed_") || 
                           ownedDraft.sessionStatus === "signed" || 
                           ownedDraft.sessionStatus === "deferred";
          if (ownedDraft.currentScreen === "P00_rep_launch") {
            if (ownedDraft.property.address) {
              setSession(navigateTo(ownedDraft, "A01_welcome"));
            } else {
              setSession(ownedDraft);
            }
          } else if (isClosed) {
            setSession(navigateTo(ownedDraft, "B12_findings_summary"));
          } else {
            setSession(ownedDraft);
          }
        }
      });
    }
  }, [authRep?.id, authRep?.name, authRep?.email]);

  if (!session) return null;

  return (
    <>
      {isDemo && (
        <div className="fixed top-0 inset-x-0 z-50 py-2 px-4 bg-amber-500/90 backdrop-blur-sm text-center">
          <span className="text-[11px] font-mono text-black uppercase tracking-widest font-bold">
            ⚠ Demo Mode — No data will be saved
          </span>
        </div>
      )}
      <Ctx.Provider
        value={{
          session, updateSession, goNext, goBack, jumpTo,
          repJumpTo, resetSession, loadDraft, isOnline,
        }}
      >
        {children}
      </Ctx.Provider>
    </>
  );
}

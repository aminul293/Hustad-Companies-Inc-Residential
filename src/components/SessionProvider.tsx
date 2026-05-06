"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
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
} from "@/lib/session";
import { syncSessionToServer, queueForSync, processSyncQueue, getStoredRep } from "@/lib/sync";
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
  const authRep = getAuthenticatedRep(authSession);
  const [session, setSession] = useState<SessionState | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "authenticated" && authRep) {
      const stored = loadActiveSession();
      const next =
        stored?.repId === authRep.id
          ? stampSessionWithRep(stored, authRep)
          : createSession(authRep.id, authRep.name, authRep.email);

      setSession(next);
      return;
    }

    setSession(createSession("rep_001", "Hustad Rep"));
  }, [authStatus, authRep?.id, authRep?.name, authRep?.email]);

  // Autosave locally + sync to server (debounced)
  useEffect(() => {
    if (!session) return;
    if (authStatus !== "authenticated") return;
    saveSession(session);

    // Debounced server sync
    const timer = setTimeout(() => {
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
      if (authStatus !== "authenticated") return;
      // Process offline sync queue when we come back online
      processSyncQueue().then((count) => {
        if (count > 0) console.log(`Synced ${count} queued session(s)`);
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
    setSession((prev) => {
      if (!prev) return prev;
      const ORDERED_SCREENS: ScreenId[] = SCREEN_FLOW.map((s) => s.id);
      const idx = ORDERED_SCREENS.indexOf(prev.currentScreen);
      if (idx <= 0) return prev;
      let targetIdx = idx - 1;
      while (targetIdx > 0 && !shouldShowScreen(ORDERED_SCREENS[targetIdx], prev)) {
        targetIdx--;
      }
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
      // If we are resuming from the launch screen, move to the first real screen
      if (ownedDraft.currentScreen === "P00_rep_launch") {
        const next = navigateTo(ownedDraft, "A01_welcome");
        setSession(next);
      } else {
        setSession(ownedDraft);
      }
    }
  }, [authRep?.id, authRep?.name, authRep?.email]);

  if (!session) return null;

  return (
    <Ctx.Provider
      value={{
        session, updateSession, goNext, goBack, jumpTo,
        repJumpTo, resetSession, loadDraft, isOnline,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

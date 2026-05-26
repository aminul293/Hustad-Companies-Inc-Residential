"use client";

import { sendEmail } from "@/lib/api";
import { useState, useEffect } from "react";
import type { SessionState, ScreenId } from "@/types/session";
import { SCREEN_FLOW } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SplineScene } from "@/components/ui/splite";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  MapPin,
  User,
  Shield,
  ChevronRight,
  LayoutGrid,
  Info,
  AlertTriangle,
  Mail,
  Smartphone,
  FileText,
  Clock,
  Trash2,
  Lock,
  ArrowRight,
  Scan,
  TrendingUp,
  Zap,
  List,
  Search,
  LogIn,
  Plus,
  Building2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listDrafts, hasSameDayDraft, deleteDraft, createSession } from "@/lib/session";
import { RepCommandCenter, type IntakePrefill } from "@/components/RepCommandCenter";
import { ResidentialCompanyModal } from "@/components/ResidentialCompanyModal";
import { useSession as useAuthSession, signIn, signOut } from "next-auth/react";
import { getAuthenticatedRep } from "@/lib/rep-identity";
import { buildRepCaptureEmail } from "@/lib/rep-capture-email";
import { IS_QA_MODE } from "@/lib/qa-mode";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onLoadDraft: (sessionId: string) => void;
  onRepJump: (screen: ScreenId) => void;
  isOnline: boolean;
  onResetSession?: () => void;
}


export function P00RepLaunch({ session, onUpdate, onNext, onLoadDraft, onRepJump, isOnline, onResetSession }: Props) {
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
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<{ main: string; sub: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [form, setForm] = useState({
    address: session.property.address,
    homeownerName: session.property.homeownerPrimaryName,
    homeownerEmail: session.property.homeownerPrimaryEmail,
    homeownerMobile: session.property.homeownerPrimaryMobile,
    repName: session.repName,
    insurerName: session.property.insurerNameKnown,
    claimNumber: session.property.claimNumberKnown,
    workingDateOfLoss: session.property.workingDateOfLoss || "",
    stormBasis: session.property.stormBasis || "",
    accessNotes: session.property.accessNotes,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<ReturnType<typeof listDrafts>>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showRepNav, setShowRepNav] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Stores import identifiers (leadId, centerpointId, appointmentId) when the rep
  // arrives at the intake form via a pipeline/CenterPoint "Fix & Start" flow.
  // Merged into the session on handleStart so the link is preserved.
  const [pendingImportMeta, setPendingImportMeta] = useState<{
    source: "pipeline" | "centerpoint";
    pipelineLeadId?: string;
    centerpointId?: string;
    appointmentId?: string;
  } | null>(null);

  const [isPreFlightMode, setIsPreFlightMode] = useState(false);
  const [isEmergencyOverride, setIsEmergencyOverride] = useState(false);

  const handleStartNew = () => {
    if (!authRep) {
      void signIn("azure-ad", { callbackUrl: "/" }, { prompt: "select_account" });
      return;
    }

    const isEmergency = IS_QA_MODE || authRep.role === "admin" || authRep.role === "manager";
    if (!isEmergency) {
      alert("Direct session creation is disabled. All inspections must originate from CenterPoint via the Command Center.");
      return;
    }

    set("repName", authRep.name);
    setPendingImportMeta(null); // discard any import context on a fresh start

    // Close dashboard to reveal the form
    setShowDashboard(false);
    setIsPreFlightMode(true);
    setIsEmergencyOverride(true);

    // Reset form for a fresh start if needed, but keeping repName
    setForm(f => ({
      ...f,
      address: "",
      homeownerName: "",
      homeownerEmail: "",
      homeownerMobile: "",
      insurerName: "",
      claimNumber: "",
      workingDateOfLoss: "",
      stormBasis: "",
      accessNotes: "",
    }));
  };

  // Called by RepCommandCenter when an import is incomplete.
  // Closes the dashboard, prefills the intake form with available data,
  // and stores the import identifiers so handleStart can merge them.
  const handlePrefillAndStart = (data: IntakePrefill) => {
    if (!authRep) {
      void signIn("azure-ad", { callbackUrl: "/" }, { prompt: "select_account" });
      return;
    }
    setShowDashboard(false);
    setIsPreFlightMode(true);
    setIsEmergencyOverride(false);
    setForm(f => ({
      ...f,
      address: data.address,
      homeownerName: data.homeownerName,
      homeownerEmail: data.homeownerEmail,
      homeownerMobile: data.homeownerMobile,
      claimNumber: data.claimNumber,
      // preserve repName, insurerName, workingDateOfLoss, stormBasis defaults
    }));
    setPendingImportMeta({
      source: data.source,
      pipelineLeadId: data.pipelineLeadId,
      centerpointId: data.centerpointId,
      appointmentId: data.appointmentId,
    });
  };


  // --- LIVE GEO-ENGINE (WHOLE USA) ---
  useEffect(() => {
    const fetchAddresses = async () => {
      if (form.address.length < 5) {
        setSuggestions([]);
        return;
      }
      
      setIsSearching(true);
      try {
        // Photon is a fast, keyless geocoding API based on OpenStreetMap
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(form.address)}&limit=5&countrycode=us`);
        const data = await res.json();
        const formatted = data.features.map((f: any) => {
          const p = f.properties;
          const main = [p.housenumber, p.street].filter(Boolean).join(" ");
          const sub = [p.city, p.state, p.postcode].filter(Boolean).join(", ");
          return { main: main || p.name, sub: sub };
        });
        setSuggestions(formatted);
      } catch (e) {
        /* non-fatal */
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchAddresses, 400);
    return () => clearTimeout(timer);
  }, [form.address]);

  const getDisplayDrafts = (raw: ReturnType<typeof listDrafts>) =>
    Array.from(
      raw
        .filter((d) => {
          const addr = d.address.toLowerCase().trim();
          return (
            !d.sessionStatus.startsWith("closed_") &&
            d.sessionId !== session.sessionId &&
            addr.length > 0 &&
            addr !== "untitled property"
          );
        })
        .reduce((map, draft) => {
          const key = draft.address.toLowerCase().trim();
          if (!map.has(key) || new Date(draft.lastSavedAt) > new Date(map.get(key)!.lastSavedAt)) {
            map.set(key, draft);
          }
          return map;
        }, new Map<string, typeof raw[0]>())
        .values()
    );

  useEffect(() => {
    const scopedDrafts = authRep ? listDrafts(authRep.id) : [];
    setDrafts(getDisplayDrafts(scopedDrafts));
  }, [showDashboard, authRep?.id, session.sessionId]);

  useEffect(() => {
    if (!authRep) return;
    setForm((current) => ({ ...current, repName: authRep.name }));
    setErrors((current) => {
      if (!current.repName) return current;
      const next = { ...current };
      delete next.repName;
      return next;
    });
  }, [authRep?.id, authRep?.name]);

  useEffect(() => {
    if (form.address.trim().length > 5) {
      const existing = hasSameDayDraft(form.address, authRep?.id);
      if (existing && existing.sessionId !== session.sessionId) {
        setDuplicateWarning(
          `A draft already exists for "${existing.address}" today.`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [form.address, session.sessionId, authRep?.id]);

  if (showDashboard && (authStatus === "authenticated" || !!mockId) && authRep) {
    return (
      <RepCommandCenter
        currentRep={authRep}
        onLoadDraft={(id) => {
          onLoadDraft(id);
          setShowDashboard(false);
        }}
        onNewSession={handleStartNew}
        onPrefillAndStart={handlePrefillAndStart}
        onBack={() => setShowDashboard(false)}
        onResetSession={onResetSession}
      />
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.address.trim()) e.address = "Address is required.";
    if (!form.repName.trim()) e.repName = "Rep name is required.";
    return e;
  };

  const handleStart = () => {
    if (!authRep) {
      void signIn("azure-ad", { callbackUrl: "/" }, { prompt: "select_account" });
      return;
    }

    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    // CREATE A TRULY NEW SESSION
    const baseNewSession = createSession(authRep.id, authRep.name, authRep.email);

    const updated: SessionState = {
      ...baseNewSession,
      // Preserve import identifiers if this session originated from a pipeline/CenterPoint
      // "Fix & Start" flow so dedup and sync can match against the source record.
      ...(pendingImportMeta && {
        centerpointId: pendingImportMeta.centerpointId,
        pipelineLeadId: pendingImportMeta.pipelineLeadId,
        appointmentId: pendingImportMeta.appointmentId,
      }),
      mode: "rep",
      sessionStatus: "phase_a_active",
      property: {
        ...baseNewSession.property,
        address: form.address,
        homeownerPrimaryName: form.homeownerName,
        homeownerPrimaryEmail: form.homeownerEmail,
        homeownerPrimaryMobile: form.homeownerMobile,
        insurerNameKnown: form.insurerName,
        claimNumberKnown: form.claimNumber,
        workingDateOfLoss: form.workingDateOfLoss,
        stormBasis: form.stormBasis,
        accessNotes: form.accessNotes,
      },
    };
    setPendingImportMeta(null); // consumed — clear so it doesn't leak into subsequent sessions
    onUpdate(updated);
    onNext();

    // Fire-and-forget: email the rep capture link to their Outlook the moment the session starts
    if (authRep.email) {
      const captureUrl = `${window.location.origin}/rep-capture?s=${updated.sessionId}`;
      sendEmail({ to: authRep.email, subject: `📸 Your inspection camera link — ${form.address}`, sessionId: updated.sessionId, html: buildRepCaptureEmail({ captureUrl, address: form.address, homeownerName: form.homeownerName, repName: authRep.name, sessionId: updated.sessionId }) }).catch(() => {}); // non-critical — never block the session start
    }
  };

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] transition-colors duration-300">
      {/* All-Weather Operational Atmosphere */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Subtle Cinematic Rain/Particle System */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -100, x: Math.random() * 2000, opacity: 0 }}
            animate={{ 
              y: 1200, 
              opacity: [0, 0.3, 0],
            }}
            transition={{ 
              duration: 3 + Math.random() * 2, 
              repeat: Infinity, 
              ease: "linear",
              delay: Math.random() * 5
            }}
            className="absolute w-[1px] h-24 bg-gradient-to-b from-indigo-500/0 via-white/10 to-indigo-500/0 rotate-[15deg]"
          />
        ))}

        {/* Ambient Lightning Flicker */}
        <motion.div 
          animate={{ 
            opacity: [0, 0, 0.05, 0, 0.02, 0, 0] 
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            times: [0, 0.8, 0.82, 0.84, 0.86, 0.88, 1] 
          }}
          className="absolute inset-0 bg-white"
        />
      </div>

      {/* Background Assets: Forensic Rapid Deployment Cloud */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Lift - Cleaner */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.04),transparent_80%)]" />

        {/* Forensic HUD Data Layer - Ultra Subtle */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.04, scale: [1, 1.02, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-20 grayscale" />
        </motion.div>

        {/* Forensic Inspection Drone - Far Top Right */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, x: 200 }}
          animate={{ opacity: 0.1, scale: 0.7, x: 0, y: [0, -15, 0] }}
          transition={{ duration: 2, y: { duration: 15, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[2%] -right-48 w-[400px] h-[400px]"
        >
          <img src="/images/inspection_drone.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-70" />
        </motion.div>

        {/* Rapid Response Vehicle - Far Bottom Left */}
        <motion.div 
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 0.08, x: 0 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className="absolute -bottom-20 -left-64 w-[600px] h-[600px]"
        >
          <img src="/images/rapid_response.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-60" />
        </motion.div>

        {/* Forensic Holographic Home - Far Left Center */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.7, x: -200 }}
          animate={{ opacity: 0.05, scale: 0.75, x: 0, y: [0, -10, 0] }}
          transition={{ duration: 2, y: { duration: 18, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute top-[30%] -left-48 w-[400px] h-[400px]"
        >
          <img src="/images/holographic_home.png" alt="" className="w-full h-full object-contain mix-blend-screen opacity-70" />
        </motion.div>
      </div>
      {/* Background (The Hustad) */}
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-20" style={{ backgroundImage: 'url(/images/roofline_bg.jpg)' }} />

      <div className="absolute inset-0 bg-gradient-to-r dark:from-[#060606] dark:via-[#060606]/80 from-hustad-cream via-hustad-cream/80 to-transparent z-0 transition-colors duration-300" />

      {/* Header — in flex flow so content never overlaps it */}
      <div className="relative z-30 flex-shrink-0 flex items-center justify-between px-10 pt-10 pb-6">
        <div className="flex items-baseline gap-2.5 pointer-events-none">
          <span className="font-display font-bold text-[var(--tx1)] text-2xl tracking-[0.1em] transition-colors duration-300">HUSTAD</span>
          <span className="text-[10px] font-mono text-[var(--tx3)] uppercase tracking-[0.3em] transition-colors duration-300">Madison Residential</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 backdrop-blur-md flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Field Operations: Online</span>
          </div>
          <div className={cn(
            "px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all duration-500 backdrop-blur-md",
            isOnline ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-rose-500 animate-pulse")} />
            <span className="text-[10px] font-mono uppercase tracking-widest">{isOnline ? "Sync Active" : "Offline"}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-8 pb-48 min-h-0">
        <div className="max-w-3xl mx-auto space-y-12">
          
          {/* Launch Area */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6 w-fit">
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">Forensic Inspection System: ACTIVE</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-medium leading-[1.1] tracking-tighter text-[var(--tx1)] dark:bg-clip-text dark:text-transparent dark:bg-gradient-to-b dark:from-neutral-50 dark:to-neutral-400 transition-colors duration-300">
                Field Ready.<br />
                <span className="text-indigo-400">Launch Inspection.</span>
              </h1>
              <p className="mt-6 text-[var(--tx3)] max-w-lg text-lg font-light leading-relaxed transition-colors duration-300">
                Hustad stands ready in any condition. From severe storms to routine maintenance, our field teams are always ahead, protecting your home from damage and ensuring forensic-grade restoration.
              </p>
            </motion.div>

            {/* Enterprise Login / Rep Selection */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">Production Identity Layer</p>
                {(authStatus === "authenticated" || !!mockId) && (
                  <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-[9px] font-mono text-[var(--tx4)] hover:text-[var(--tx1)] uppercase tracking-widest transition-colors duration-150">Switch Account</button>
                )}
              </div>

              {(authStatus === "authenticated" || !!mockId) && authRep ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 rounded-[40px] bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500 flex items-center justify-center text-[#E8EDF8] shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest mb-1">Authenticated Operative</p>
                      <h3 className="text-2xl font-display font-medium text-[var(--tx1)] transition-colors duration-300">{authRep.name}</h3>
                      <p className="text-xs text-[var(--tx4)] transition-colors duration-300">{authRep.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDashboard(true)} className="h-14 w-14 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <button 
                    onClick={() => signIn("azure-ad", { callbackUrl: "/" }, { prompt: "select_account" })}
                    className="w-full p-8 rounded-[40px] bg-white text-black flex items-center justify-between hover:bg-neutral-200 transition-all group shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center">
                        {authStatus === "loading" ? (
                          <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                          <Mail className="w-6 h-6" />
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-display font-medium">Login with Outlook</h3>
                        <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest">Enterprise Identity Required</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                    <Lock className="w-4 h-4 text-rose-400" />
                    <p className="text-[10px] font-mono text-rose-400/70 uppercase tracking-widest">Authentication required to access property intake</p>
                  </div>
                </div>
              )}
            </div>

            {/* Property Intake Form — Appears after auth */}
            <AnimatePresence>
              {(authStatus === "authenticated" || !!mockId) && authRep && isPreFlightMode && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                  {isEmergencyOverride && (
                    <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-4 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                      <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-mono text-rose-300 uppercase tracking-widest mb-1">Emergency Override Active</p>
                        <p className="text-sm text-rose-200/80 leading-relaxed font-light">
                          This session is completely unlinked from CenterPoint. It will not automatically sync to the CRM. Manual reconciliation will be required later.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl space-y-8">
                    {/* Property Identification */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 px-2">
                        <div className="h-px flex-1 bg-white/[0.05]" />
                        <span className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.2em]">Property Identification</span>
                        <div className="h-px flex-1 bg-white/[0.05]" />
                      </div>

                      <div className="space-y-2 relative">
                        <div className="flex items-center gap-2 pl-2">
                          <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">Property Address <span className="text-rose-400">*</span></p>
                          {!isEmergencyOverride && <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-mono uppercase tracking-widest border border-indigo-500/20 flex items-center gap-1"><Lock className="w-2 h-2" /> Synced from CenterPoint</span>}
                        </div>
                        <div className="relative group">
                          <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                          <input
                            value={form.address}
                            onChange={(e) => set("address", e.target.value)}
                            onFocus={() => setIsAddressFocused(true)}
                            onBlur={() => setTimeout(() => setIsAddressFocused(false), 200)}
                            readOnly={!isEmergencyOverride}
                            className={cn(
                              "w-full bg-white/[0.04] border rounded-2xl py-5 pl-14 pr-6 text-[#E8EDF8] placeholder:text-[#2D4060] outline-none transition-all text-lg",
                              errors.address ? "border-rose-500/50" : "border-white/[0.1] focus:border-indigo-500/30 focus:bg-white/[0.06] focus:ring-4 focus:ring-indigo-500/5",
                              !isEmergencyOverride && "opacity-70 bg-white/[0.02] cursor-not-allowed focus:ring-0 focus:border-white/[0.1] focus:bg-white/[0.02]"
                            )}
                            placeholder="Start typing property address..."
                          />
                          {isSearching && <div className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />}
                        </div>
                        {errors.address && <p className="text-[10px] text-rose-400 pl-2">{errors.address}</p>}
                        
                        <AnimatePresence>
                          {isAddressFocused && suggestions.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 left-0 right-0 top-[calc(100%+8px)] rounded-2xl bg-[#111]/90 backdrop-blur-xl border border-white/10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                            >
                              {suggestions.map((s, i) => (
                                <button 
                                  key={i} 
                                  onMouseDown={() => { set("address", s.main + (s.sub ? ", " + s.sub : "")); setSuggestions([]); }} 
                                  className="w-full px-6 py-4 text-left hover:bg-white/5 transition-colors flex items-start gap-4 border-b border-white/5 last:border-0 group/item"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover/item:bg-indigo-500/20 transition-colors">
                                    <MapPin className="w-4 h-4 text-indigo-400" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-[#E8EDF8] font-medium">{s.main}</p>
                                    <p className="text-[10px] text-[#567090] font-mono uppercase tracking-wider">{s.sub}</p>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Ownership Details */}
                    <div className="space-y-6 pt-4">
                      <div className="flex items-center gap-3 px-2">
                        <div className="h-px flex-1 bg-white/[0.05]" />
                        <span className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.2em]">Ownership Details</span>
                        <div className="h-px flex-1 bg-white/[0.05]" />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 pl-2">
                            <p className="text-[10px] font-mono text-[#7090B0] uppercase tracking-widest">Homeowner Name</p>
                            {!isEmergencyOverride && <Lock className="w-2.5 h-2.5 text-[#2D4060]" />}
                          </div>
                          <div className="relative group">
                            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D4060] group-focus-within:text-[#7090B0] transition-colors" />
                            <input readOnly={!isEmergencyOverride} value={form.homeownerName} onChange={(e) => set("homeownerName", e.target.value)} className={cn("w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 pl-14 pr-6 text-[#E8EDF8] placeholder:text-[#2D4060] outline-none focus:border-indigo-500/30 focus:bg-white/[0.06] transition-all", !isEmergencyOverride && "opacity-70 bg-white/[0.02] cursor-not-allowed focus:border-white/[0.1] focus:bg-white/[0.02]")} placeholder="Full Name" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 pl-2">
                            <p className="text-[10px] font-mono text-[#7090B0] uppercase tracking-widest">Mobile Number</p>
                            {!isEmergencyOverride && <Lock className="w-2.5 h-2.5 text-[#2D4060]" />}
                          </div>
                          <div className="relative group">
                            <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D4060] group-focus-within:text-[#7090B0] transition-colors" />
                            <input readOnly={!isEmergencyOverride} value={form.homeownerMobile} onChange={(e) => set("homeownerMobile", e.target.value)} className={cn("w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 pl-14 pr-6 text-[#E8EDF8] placeholder:text-[#2D4060] outline-none focus:border-indigo-500/30 focus:bg-white/[0.06] transition-all", !isEmergencyOverride && "opacity-70 bg-white/[0.02] cursor-not-allowed focus:border-white/[0.1] focus:bg-white/[0.02]")} placeholder="(608) 000-0000" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 pl-2">
                          <p className="text-[10px] font-mono text-[#7090B0] uppercase tracking-widest">Email Address</p>
                          {!isEmergencyOverride && <Lock className="w-2.5 h-2.5 text-[#2D4060]" />}
                        </div>
                        <div className="relative group max-w-sm">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D4060] group-focus-within:text-[#7090B0] transition-colors" />
                          <input readOnly={!isEmergencyOverride} value={form.homeownerEmail} onChange={(e) => set("homeownerEmail", e.target.value)} type="email" className={cn("w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 pl-14 pr-6 text-[#E8EDF8] placeholder:text-[#2D4060] outline-none focus:border-indigo-500/30 focus:bg-white/[0.06] transition-all", !isEmergencyOverride && "opacity-70 bg-white/[0.02] cursor-not-allowed focus:border-white/[0.1] focus:bg-white/[0.02]")} placeholder="homeowner@example.com" />
                        </div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/[0.06]" />

                    {/* Rep Identity */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest pl-2">Rep Identity <span className="text-rose-400">*</span></p>
                      <input value={authRep.name} readOnly className={cn("w-full bg-white/[0.04] border rounded-2xl py-4 px-6 text-[#E8EDF8] outline-none transition-all cursor-default", errors.repName ? "border-rose-500/50" : "border-white/[0.1]")} />
                      {authRep.email && <p className="text-[10px] text-[#3F5878] pl-2">{authRep.email}</p>}
                      {errors.repName && <p className="text-[10px] text-rose-400 pl-2">{errors.repName}</p>}
                    </div>

                    <div className="h-[1px] bg-white/[0.06]" />

                    {/* Carrier & Storm Context */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest pl-2">Carrier & Storm Context</p>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest pl-2">Insurance Carrier</p>
                          <input value={form.insurerName} onChange={(e) => set("insurerName", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-[#E8EDF8] placeholder:text-[#3F5878] outline-none focus:border-indigo-500/50" placeholder="e.g. State Farm" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest pl-2">Claim Number (if known)</p>
                          <input value={form.claimNumber} onChange={(e) => set("claimNumber", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-[#E8EDF8] placeholder:text-[#3F5878] outline-none focus:border-indigo-500/50" placeholder="e.g. 123-456-789" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest pl-2">Date of Loss</p>
                          <input value={form.workingDateOfLoss} onChange={(e) => set("workingDateOfLoss", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-[#E8EDF8] placeholder:text-[#3F5878] outline-none focus:border-indigo-500/50" placeholder="MM/DD/YYYY" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono text-[#3F5878] uppercase tracking-widest pl-2">Storm Basis</p>
                          <input value={form.stormBasis} onChange={(e) => set("stormBasis", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-[#E8EDF8] placeholder:text-[#3F5878] outline-none focus:border-indigo-500/50" placeholder="Madison metro hail event" />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compliance Banner */}
            <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
              <Shield className="w-5 h-5 text-indigo-400 mt-0.5" />
              <p className="text-xs text-[var(--tx2)] leading-relaxed font-light transition-colors duration-300">
                <span className="text-[var(--tx1)] font-medium uppercase tracking-widest text-[9px] mr-2 transition-colors duration-300">Advisory</span>
                Strictly forensic session. No claim promises or deductible guarantees during the buyer walkthrough.
              </p>
            </div>
          </div>
      </div>

      {/* Footer CTA */}
      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t dark:from-[#060606] dark:via-[#060606]/90 from-hustad-cream via-hustad-cream/90 to-transparent pt-24 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center gap-4">
            {(authStatus === "authenticated" || !!mockId) && (
              <>
                {!isPreFlightMode ? (
                  <>
                    <button
                      onClick={() => setShowDashboard(true)}
                      className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                    >
                      <LayoutGrid className="w-4 h-4 text-[var(--tx2)]" />
                      <span className="text-sm font-display font-medium text-[var(--tx1)]">Command Center</span>
                    </button>
                    <button
                      onClick={() => setShowCompanyModal(true)}
                      className="group flex items-center gap-3 px-8 py-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                    >
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-display font-medium text-emerald-300">New Home Owner!</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsPreFlightMode(false)}
                      className="group flex items-center gap-3 px-8 py-6 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <X className="w-5 h-5 text-[var(--tx4)]" />
                      <span className="text-sm font-display font-medium text-[var(--tx2)]">Cancel / Back to Hub</span>
                    </button>
                    <button 
                      onClick={handleStart}
                      className="group flex items-center gap-4 px-12 py-6 rounded-full bg-white text-black transition-all hover:bg-neutral-200 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                    >
                      <span className="text-lg font-display font-semibold tracking-tight">Launch Inspection</span>
                      <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-[9px] font-mono text-indigo-300 uppercase tracking-wider">Weather Shield: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] font-mono text-green-300 uppercase tracking-wider">Atmospheric Sync</span>
            </div>
          </div>
        </div>
      </div>

      <ResidentialCompanyModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
      />
    </div>
  );
}

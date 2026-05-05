"use client";

import { useState, useEffect } from "react";
import type { SessionState, ScreenId } from "@/types/session";
import { SCREEN_FLOW } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SplineScene } from "@/components/ui/splite";
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
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listDrafts, hasSameDayDraft, deleteDraft, createSession } from "@/lib/session";
import { RepCommandCenter } from "@/components/RepCommandCenter";
import { getLiveReps } from "@/lib/reps";
import type { RepIdentity } from "@/config/reps";
import { useSession as useAuthSession, signIn, signOut } from "next-auth/react";

interface Props {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onLoadDraft: (sessionId: string) => void;
  onRepJump: (screen: ScreenId) => void;
  isOnline: boolean;
}

// REPS constant removed, using FIELD_REPS from config

export function P00RepLaunch({ session, onUpdate, onNext, onLoadDraft, onRepJump, isOnline }: Props) {
  const { data: authSession, status: authStatus } = useAuthSession();
  const [selectedRep, setSelectedRep] = useState<RepIdentity | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [liveReps, setLiveReps] = useState<RepIdentity[]>([]);
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
    workingDateOfLoss: session.property.workingDateOfLoss || "04/14/2026",
    stormBasis: session.property.stormBasis || "Madison metro hail event",
    accessNotes: session.property.accessNotes,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<ReturnType<typeof listDrafts>>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showRepNav, setShowRepNav] = useState(false);

  const handleStartNew = () => {
    // Priority: Authenticated User > Selected Rep
    const repName = authSession?.user?.name || selectedRep?.name;
    
    if (repName) {
      set("repName", repName);
    }
    
    // Close dashboard to reveal the form
    setShowDashboard(false);
    
    // Reset form for a fresh start if needed, but keeping repName
    setForm(f => ({
      ...f,
      address: "",
      homeownerName: "",
      homeownerEmail: "",
      homeownerMobile: "",
      insurerName: "",
      claimNumber: "",
      workingDateOfLoss: "05/04/2026",
      stormBasis: "Madison metro hail event",
      accessNotes: "",
    }));
  };

  const handleSelectRep = (rep: RepIdentity) => {
    setSelectedRep(rep);
    set("repName", rep.name);
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
        console.error("Geo-Engine Failure", e);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchAddresses, 400);
    return () => clearTimeout(timer);
  }, [form.address]);

  useEffect(() => {
    setLiveReps(getLiveReps());
    setDrafts(listDrafts().filter((d) => !d.sessionStatus.startsWith("closed_")));
  }, [showDashboard]);

  useEffect(() => {
    if (form.address.trim().length > 5) {
      const existing = hasSameDayDraft(form.address);
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
  }, [form.address, session.sessionId]);

  if (showDashboard && selectedRep) {
    return (
      <RepCommandCenter 
        onLoadDraft={(id) => {
          onLoadDraft(id);
          setShowDashboard(false);
        }} 
        onNewSession={handleStartNew}
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
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    // CREATE A TRULY NEW SESSION
    const repId = (authSession?.user as any)?.id || selectedRep?.id || "rep_001";
    const baseNewSession = createSession(repId, form.repName);

    const updated: SessionState = {
      ...baseNewSession,
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
    onUpdate(updated);
    onNext();
  };

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
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
      {/* Interactive 3D Spline Background (The Hustad) */}
      <div className="absolute inset-0 z-0">
        <SplineScene 
          scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
          className="w-full h-full opacity-50 scale-110 translate-x-[15%]"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-[#060606] via-[#060606]/80 to-transparent z-0" />

      {/* Header */}
      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="absolute top-10 right-10 z-30 flex items-center gap-4">
        <div className="px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 backdrop-blur-md flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
          <span className="text-[10px] font-mono uppercase tracking-widest">The Hustad: Online</span>
        </div>
        <div className={cn(
          "px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all duration-500 backdrop-blur-md",
          isOnline ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-rose-500 animate-pulse")} />
          <span className="text-[10px] font-mono uppercase tracking-widest">{isOnline ? "Sync Active" : "Offline"}</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 pt-44 pb-48">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Column: Launch Area */}
          <div className="lg:col-span-7 space-y-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6 w-fit">
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">Autonomous Property Guardian: ACTIVE</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-medium bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 leading-[1.1] tracking-tighter">
                Always Ready.<br />
                <span className="text-indigo-400">Launch Shield.</span>
              </h1>
              <p className="mt-6 text-neutral-400 max-w-lg text-lg font-light leading-relaxed">
                The Hustad stands ready in any condition. From severe storms to routine maintenance, our autonomous system is always ahead, protecting your home from damage and ensuring forensic-grade restoration.
              </p>
            </motion.div>

            {/* Enterprise Login / Rep Selection */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">Production Identity Layer</p>
                {authStatus === "authenticated" && (
                  <button onClick={() => signOut()} className="text-[9px] font-mono text-white/30 hover:text-white uppercase tracking-widest">Switch Account</button>
                )}
              </div>

              {authStatus === "authenticated" ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 rounded-[40px] bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500 flex items-center justify-center text-white shadow-[0_0_30px_rgba(99,102,241,0.4)]">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest mb-1">Authenticated Operative</p>
                      <h3 className="text-2xl font-display font-medium text-white">{authSession.user?.name}</h3>
                      <p className="text-xs text-white/40">{authSession.user?.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDashboard(true)} className="h-14 w-14 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <button 
                    onClick={() => signIn("azure-ad")}
                    className="w-full p-8 rounded-[40px] bg-white text-black flex items-center justify-between hover:bg-neutral-200 transition-all group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-display font-medium">Login with Outlook</h3>
                        <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest">Enterprise Identity</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="flex items-center gap-4 px-4">
                    <div className="h-[1px] flex-1 bg-white/10" />
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Or Select Operative</span>
                    <div className="h-[1px] flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {liveReps.map((rep) => (
                      <button
                        key={rep.id}
                        onClick={() => handleSelectRep(rep)}
                        className={cn(
                          "group relative p-8 rounded-[40px] border transition-all duration-500 text-left overflow-hidden",
                          selectedRep?.id === rep.id 
                            ? "bg-white/10 border-white/30" 
                            : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                        )}
                      >
                        <div className="flex flex-col gap-4">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", selectedRep?.id === rep.id ? "bg-indigo-500" : "bg-white/5")}>
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-white">{rep.name}</h3>
                            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest leading-tight">{rep.role}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Property Intake Form — Appears after rep selection or auth */}
            <AnimatePresence>
              {(selectedRep || authStatus === "authenticated") && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                  <div className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl space-y-8">
                    {/* Property Identification */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 px-2">
                        <div className="h-px flex-1 bg-white/[0.05]" />
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Property Identification</span>
                        <div className="h-px flex-1 bg-white/[0.05]" />
                      </div>

                      <div className="space-y-2 relative">
                        <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest pl-2">Property Address <span className="text-rose-400">*</span></p>
                        <div className="relative group">
                          <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/50 group-focus-within:text-indigo-400 transition-colors" />
                          <input
                            value={form.address}
                            onChange={(e) => set("address", e.target.value)}
                            onFocus={() => setIsAddressFocused(true)}
                            onBlur={() => setTimeout(() => setIsAddressFocused(false), 200)}
                            className={cn(
                              "w-full bg-white/[0.04] border rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-white/20 outline-none transition-all text-lg",
                              errors.address ? "border-rose-500/50" : "border-white/[0.1] focus:border-indigo-500/30 focus:bg-white/[0.06] focus:ring-4 focus:ring-indigo-500/5"
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
                                    <p className="text-sm text-white font-medium">{s.main}</p>
                                    <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider">{s.sub}</p>
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
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">Ownership Details</span>
                        <div className="h-px flex-1 bg-white/[0.05]" />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-2">Homeowner Name</p>
                          <div className="relative group">
                            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-white/50 transition-colors" />
                            <input value={form.homeownerName} onChange={(e) => set("homeownerName", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-white/20 outline-none focus:border-indigo-500/30 focus:bg-white/[0.06] transition-all" placeholder="Full Name" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-2">Mobile Number</p>
                          <div className="relative group">
                            <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-white/50 transition-colors" />
                            <input value={form.homeownerMobile} onChange={(e) => set("homeownerMobile", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-white/20 outline-none focus:border-indigo-500/30 focus:bg-white/[0.06] transition-all" placeholder="(608) 000-0000" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest pl-2">Email Address</p>
                        <div className="relative group max-w-sm">
                          <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-white/50 transition-colors" />
                          <input value={form.homeownerEmail} onChange={(e) => set("homeownerEmail", e.target.value)} type="email" className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 pl-14 pr-6 text-white placeholder:text-white/20 outline-none focus:border-indigo-500/30 focus:bg-white/[0.06] transition-all" placeholder="homeowner@example.com" />
                        </div>
                      </div>
                    </div>

                    <div className="h-[1px] bg-white/[0.06]" />

                    {/* Rep Identity */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest pl-2">Rep Identity <span className="text-rose-400">*</span></p>
                      <input value={form.repName} onChange={(e) => set("repName", e.target.value)} className={cn("w-full bg-white/[0.04] border rounded-2xl py-4 px-6 text-white outline-none transition-all", errors.repName ? "border-rose-500/50" : "border-white/[0.1] focus:border-indigo-500/50")} />
                      {errors.repName && <p className="text-[10px] text-rose-400 pl-2">{errors.repName}</p>}
                    </div>

                    <div className="h-[1px] bg-white/[0.06]" />

                    {/* Carrier & Storm Context */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest pl-2">Carrier & Storm Context</p>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-2">Insurance Carrier</p>
                          <input value={form.insurerName} onChange={(e) => set("insurerName", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-white placeholder:text-white/30 outline-none focus:border-indigo-500/50" placeholder="e.g. State Farm" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-2">Claim Number (if known)</p>
                          <input value={form.claimNumber} onChange={(e) => set("claimNumber", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-white placeholder:text-white/30 outline-none focus:border-indigo-500/50" placeholder="e.g. 123-456-789" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-2">Date of Loss</p>
                          <input value={form.workingDateOfLoss} onChange={(e) => set("workingDateOfLoss", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-white placeholder:text-white/30 outline-none focus:border-indigo-500/50" placeholder="MM/DD/YYYY" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-2">Storm Basis</p>
                          <input value={form.stormBasis} onChange={(e) => set("stormBasis", e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.1] rounded-2xl py-4 px-6 text-white placeholder:text-white/30 outline-none focus:border-indigo-500/50" placeholder="Madison metro hail event" />
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
              <p className="text-xs text-white/70 leading-relaxed font-light">
                <span className="text-white font-medium uppercase tracking-widest text-[9px] mr-2">Advisory</span>
                Strictly forensic session. No claim promises or deductible guarantees during the buyer walkthrough.
              </p>
            </div>
          </div>

          {/* Right Column: Drafts & Tools */}
          <div className="lg:col-span-5 space-y-10">
            {/* Drafts Card */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-mono text-white/70 uppercase tracking-widest">Resume a Draft</p>
                {drafts.length > 0 && <span className="text-[10px] font-mono text-indigo-400">{drafts.length} Active</span>}
              </div>
              
              <div className="space-y-3">
                {drafts.length > 0 ? (
                  drafts.slice(0, 4).map((d) => (
                    <motion.div 
                      key={d.sessionId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group relative p-6 rounded-[32px] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer"
                      onClick={() => onLoadDraft(d.sessionId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-display font-medium text-white truncate max-w-[200px]">
                            {d.address || "Untitled Session"}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-mono text-white/50 uppercase tracking-widest">{new Date(d.lastSavedAt).toLocaleDateString()}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest">{d.sessionStatus.replace(/_/g, " ")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteDraft(d.sessionId); setDrafts(listDrafts().filter(x => !x.sessionStatus.startsWith("closed_"))); }}
                            className="p-2 rounded-xl text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white transition-all" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-10 rounded-[32px] border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                    <History className="w-8 h-8 text-white/20" />
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">No Recent Drafts</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="absolute bottom-0 inset-x-0 p-8 z-30 bg-gradient-to-t from-[#060606] via-[#060606]/90 to-transparent pt-24">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center gap-4">
            {(selectedRep || authStatus === "authenticated") && (
              <>
                <button 
                  onClick={() => setShowDashboard(true)}
                  className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                >
                  <LayoutGrid className="w-4 h-4 text-white/70" />
                  <span className="text-sm font-display font-medium text-white">Command Center</span>
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
    </div>
  );
}

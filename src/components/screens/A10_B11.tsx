"use client";

import { useState, useEffect } from "react";
import type { SessionState, OutcomeType } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { SplineScene } from "@/components/ui/splite";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Camera, 
  Lock, 
  Check, 
  LayoutGrid, 
  Plus, 
  Minus,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Upload,
  Wrench,
  Scan,
  Database,
  Shield,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { lockSummary, setOutcomeType } from "@/lib/session";
import { AIAssistSummary } from "@/components/AIAssistSummary";
import { PhotoAnnotationLayer } from "@/components/PhotoAnnotationLayer";
import { ProofRefinementModal } from "@/components/ProofRefinementModal";
import { Reorder } from "framer-motion";
import type { Annotation, PhotoAsset } from "@/types/session";

// ─────────────────────────────────────────────────────────────────────────────
// A10 – Inspection In Progress Hold Screen
// ─────────────────────────────────────────────────────────────────────────────

interface HoldProps {
  session: SessionState;
  onRepReturn: () => void;
}

export function A10InspectionHold({ session, onRepReturn }: HoldProps) {
  const [showRepReturn, setShowRepReturn] = useState(false);
  const [wakeCount, setWakeCount] = useState(0);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setWakeCount((c) => c + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#060606]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />
        <motion.div 
          animate={{ opacity: [0.03, 0.06, 0.03], scale: [1, 1.02, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-20 grayscale" />
        </motion.div>
      </div>

      <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display font-bold text-white text-2xl tracking-[0.1em]">HUSTAD</span>
          <span className="text-[10px] font-mono text-white/70 uppercase tracking-[0.3em]">Madison Residential</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="max-w-4xl w-full space-y-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-[350px] rounded-[48px] overflow-hidden bg-white/[0.04] border border-white/20 backdrop-blur-3xl group"
          >
            <div className="absolute inset-0 z-0">
              <SplineScene 
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full opacity-60"
              />
            </div>
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 pointer-events-none">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border border-indigo-500/30 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border border-indigo-400/20 animate-ping" />
              </div>
              <p className="font-mono text-[10px] text-indigo-300 uppercase tracking-[0.4em]">Inspection Active</p>
            </div>
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-display font-medium text-white tracking-tighter leading-[1.1]">
              The rep is finishing
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">the exterior review.</span>
            </h1>
            <p className="text-lg text-white/50 font-light leading-relaxed max-w-lg mx-auto">
              They will return with documented findings, one recommendation,
              and the correct next step.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-30 p-8 pt-0">
        <div className="max-w-md mx-auto w-full">
          {!showRepReturn ? (
            <button
              onClick={() => setShowRepReturn(true)}
              className="w-full py-5 rounded-3xl bg-white/10 border border-white/20 text-white font-display text-sm hover:bg-white/20 transition-all active:scale-[0.98]"
            >
              I am ready for the review
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <p className="text-[10px] font-mono text-amber-400/60 uppercase tracking-widest pt-0.5">
                  Rep Takeover Required
                </p>
              </div>
              <StarButton 
                onClick={onRepReturn}
                lightColor="#FAFAFA"
                backgroundColor="#060606"
                className="w-full h-18 rounded-3xl active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-display font-medium">Begin Findings Review</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </StarButton>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B11 – Rep Findings Prep
// ─────────────────────────────────────────────────────────────────────────────

interface RepPrepProps {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

const OUTCOME_OPTIONS: { value: OutcomeType; label: string; description: string; icon: any; color: string }[] = [
  { value: "no_damage", label: "No Damage", description: "Forensic integrity maintained.", icon: ShieldCheck, color: "emerald" },
  { value: "monitor_only", label: "Monitor Only", description: "Proactive baseline tracking.", icon: Eye, color: "sky" },
  { value: "repair_only", label: "Repair Only", description: "Surgical restoration path.", icon: Wrench, color: "indigo" },
  { value: "claim_review_candidate", label: "Claim Review", description: "Positive storm evidence file.", icon: Zap, color: "amber" },
  { value: "full_restoration_candidate", label: "Full Restoration", description: "Complete asset restoration.", icon: LayoutGrid, color: "rose" },
];

export function B11RepFindingsPrep({ session, onUpdate, onNext, onBack }: RepPrepProps) {
  const f = session.findings;
  const [outcomeType, setOutcome] = useState<OutcomeType | null>(f.outcomeType);
  const [urgentCount, setUrgentCount] = useState(f.urgentItemsCount);
  const [stormCount, setStormCount] = useState(f.stormRelatedItemsCount);
  const [monitorCount, setMonitorCount] = useState(f.monitorItemsCount);
  const [headline, setHeadline] = useState(f.summaryHeadline);
  const [body, setBody] = useState(f.summaryBody);
  const [roofingArea, setRoofingArea] = useState(f.roofingArea || "3,200");
  const [estimatedValue, setEstimatedValue] = useState(f.estimatedClaimValue || "$28,800");
  const [weatherEvents, setWeatherEvents] = useState(f.weatherEvents || [
    { time: "5:39 PM CDT", reference: "NWS MKX LSR: 1 E Madison, 3.25 inch hail", relevance: "Same east Madison trade area near property." },
    { time: "5:34 PM CDT", reference: "NWS MKX LSR: 1 E Maple Bluff, 3.00 inch hail", relevance: "Confirms large hail north of the property." },
    { time: "5:33 PM CDT", reference: "NWS MKX LSR: 1 S Maple Bluff, 2.00 inch hail", relevance: "Provides additional nearby hail support." },
  ]);
  const [stormSummary, setStormSummary] = useState(f.stormSummary || "NWS Milwaukee and Sullivan products support a severe Dane County hail event on April 14, 2026.");
  const [internalNotes, setInternalNotes] = useState(f.internalNotes);
  const [urgentRecommended, setUrgentRecommended] = useState(f.urgentProtectionRecommended);
  const [findingCategories, setFindingCategories] = useState<string[]>(f.findingCategories || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const COMMON_CATEGORIES = [
    "Hail Impact", "Wind Displacement", "Granule Loss", "Thermal Cracking",
    "Mechanical Damage", "Flashing Failure", "Gutter Compromise", "Collateral Metal Impact"
  ];

  const toggleCategory = (cat: string) => {
    setFindingCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [annotatingAssetId, setAnnotatingAssetId] = useState<string | null>(null);
  const [refiningAssetId, setRefiningAssetId] = useState<string | null>(null);

  const photoAssets = session.photoAssets || [];
  
  const setPhotoAssets = (newAssets: PhotoAsset[]) => {
    onUpdate({ ...session, photoAssets: newAssets });
  };

  const fetchLiveWeather = async () => {
    setIsWeatherLoading(true);
    
    const getCoords = () => new Promise<{lat: number, lon: number} | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });

    try {
      const coords = await getCoords();
      const url = coords 
        ? `/api/weather/nws?lat=${coords.lat}&lon=${coords.lon}`
        : "/api/weather/nws?office=MKX";

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.reports && data.reports.length > 0) {
        const newEvents = data.reports.slice(0, 3).map((r: any) => ({
          time: r.time,
          reference: r.reference,
          relevance: `Located in ${r.county} county. ${r.details || "Forensic validation of storm intensity."}`
        }));
        setWeatherEvents(newEvents);
        setStormSummary(`NWS forensic data from the ${data.office} office confirms a significant ${data.reports[0].type.toLowerCase()} event in the region. Local storm reports (LSRs) provide authoritative verification of intensity.`);
      } else {
        alert(`No official NWS storm reports found for the ${data.office || "local"} region in the last 48 hours. The area is currently "Forensic Clear" according to official records.`);
      }
    } catch (err) {
      console.error("Failed to fetch weather:", err);
      alert("Weather Sync Error: Could not connect to NWS Forensic Terminal. Please check your connection or enter data manually.");
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!outcomeType) e.outcome = "Select an outcome type.";
    if (!headline.trim()) e.headline = "Headline required.";
    if (!body.trim()) e.body = "Body required.";
    return e;
  };

  const handleLock = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    let updated: SessionState = {
      ...session,
      findings: {
        ...session.findings,
        outcomeType: outcomeType!,
        urgentItemsCount: urgentCount,
        stormRelatedItemsCount: stormCount,
        monitorItemsCount: monitorCount,
        roofingArea,
        estimatedClaimValue: estimatedValue,
        summaryHeadline: headline,
        summaryBody: body,
        weatherEvents,
        stormSummary,
        internalNotes,
        urgentProtectionRecommended: urgentRecommended,
        findingCategories,
      },
    };
    updated = setOutcomeType(updated, outcomeType!);
    updated = lockSummary(updated);
    onUpdate(updated);
    onNext();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const newAsset = {
          assetId: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          dataUrl,
          caption: "Inspection Detail",
          category: "storm_related" as const,
          displayOrder: (session.photoAssets || []).length,
          selectedForSummary: true,
          createdAt: new Date().toISOString(),
        };
        onUpdate({
          ...session,
          photoAssets: [...(session.photoAssets || []), newAsset],
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const annotatingAsset = (session.photoAssets || []).find(p => p.assetId === annotatingAssetId);

  return (
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[#0A0A0A]">
      <AnimatePresence>
        {annotatingAsset && (
          <PhotoAnnotationLayer 
            photo={annotatingAsset}
            onSave={(annotations) => {
              const updatedAssets = session.photoAssets.map(p => 
                p.assetId === annotatingAssetId ? { ...p, annotations } : p
              );
              onUpdate({ ...session, photoAssets: updatedAssets });
              setAnnotatingAssetId(null);
            }}
            onCancel={() => setAnnotatingAssetId(null)}
          />
        )}
        {refiningAssetId && (
          <ProofRefinementModal 
            photo={photoAssets.find(p => p.assetId === refiningAssetId)!}
            allPhotos={photoAssets}
            onSave={(updated) => {
              const newAssets = photoAssets.map(p => p.assetId === refiningAssetId ? updated : p);
              setPhotoAssets(newAssets);
              setRefiningAssetId(null);
            }}
            onCancel={() => setRefiningAssetId(null)}
          />
        )}
      </AnimatePresence>
      {/* HUD Background Layers */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-500/5 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[url('/images/grid.png')] bg-repeat opacity-[0.03]" />
      </div>

      {/* Institutional Header */}
      <div className="relative z-40 flex items-center justify-between px-12 pt-10 pb-6 border-b border-white/[0.05] bg-[#0A0A0A]/80 backdrop-blur-2xl">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-white text-2xl tracking-[0.15em]">HUSTAD</span>
            <div className="h-4 w-[1px] bg-white/20 mx-1" />
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.4em] font-medium pt-1">Forensic Analysis Hub</span>
          </div>
          <div className="flex items-center gap-2 text-white/30 font-mono text-[9px] uppercase tracking-widest mt-1">
            <Scan className="w-3 h-3" />
            <span>S11 Control Terminal // Active Session: {session.sessionId.slice(-6)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Lead Inspector</span>
            <span className="text-sm font-display font-medium text-white/90">{session.repName}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/30 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-mono text-amber-500 uppercase tracking-[0.2em] font-bold">Internal Ops</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-12 pt-10 pb-48 custom-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Outcome & Quantitative */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Outcome Terminal */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Database className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-[0.3em]">Result Classification</h2>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-6" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {OUTCOME_OPTIONS.map((opt) => {
                  const isSelected = outcomeType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setOutcome(opt.value); setErrors((e) => { const n = { ...e }; delete n.outcome; return n; }); }}
                      className={cn(
                        "relative group flex flex-col p-6 rounded-[32px] border transition-all duration-500 text-left overflow-hidden",
                        isSelected 
                          ? "bg-white/[0.06] border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]" 
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10"
                      )}
                    >
                      {isSelected && (
                        <motion.div layoutId="active-bg" className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.08] to-transparent pointer-events-none" />
                      )}
                      <div className="relative z-10 flex items-center justify-between mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          isSelected ? "bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "bg-white/[0.05] text-white/30"
                        )}>
                          <opt.icon className={cn("w-6 h-6", isSelected ? "text-white" : "text-white/40")} />
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-indigo-400" />}
                      </div>
                      <div className="relative z-10">
                        <p className={cn("font-display font-medium text-lg tracking-tight mb-1", isSelected ? "text-white" : "text-white/60")}>{opt.label}</p>
                        <p className="text-xs font-light text-white/30 leading-relaxed uppercase tracking-widest">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Instrument Panel (Counts) */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <Activity className="w-4 h-4 text-rose-400" />
                </div>
                <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-[0.3em]">Forensic Data Points</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-6" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Urgent", value: urgentCount, set: setUrgentCount, color: "text-rose-500", bg: "bg-rose-500/5" },
                  { label: "Storm", value: stormCount, set: setStormCount, color: "text-indigo-400", bg: "bg-indigo-500/5" },
                  { label: "Monitor", value: monitorCount, set: setMonitorCount, color: "text-white/50", bg: "bg-white/5" },
                ].map((item) => (
                  <div key={item.label} className="relative group p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300 flex flex-col items-center">
                    <div className="absolute top-4 right-6 text-[10px] font-mono text-white/10 uppercase tracking-widest">{item.label} Metric</div>
                    <p className={cn("text-6xl font-display font-medium tracking-tighter mb-6", item.color)}>{item.value}</p>
                    <div className="flex items-center gap-3 w-full max-w-[140px]">
                      <button 
                        onClick={() => item.set(Math.max(0, item.value - 1))}
                        className="flex-1 h-12 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-white/50 flex items-center justify-center transition-all active:scale-90"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => item.set(item.value + 1)}
                        className="flex-1 h-12 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-white/50 flex items-center justify-center transition-all active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Technical Property Metrics */}
              <div className="p-10 rounded-[40px] bg-white/[0.02] border border-white/[0.05] grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Roofing Area (SF)</p>
                  <input
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-5 px-6 text-white text-xl font-display placeholder:text-white/10 outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all"
                    placeholder="e.g. 3,200"
                    value={roofingArea}
                    onChange={(e) => setRoofingArea(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Estimated Claim Value</p>
                  <input
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-5 px-6 text-indigo-400 text-xl font-display placeholder:text-white/10 outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all"
                    placeholder="e.g. $28,800"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Weather Validation Terminal */}
              <section className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                    <Zap className="w-4 h-4 text-sky-400" />
                  </div>
                  <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-[0.3em]">Forensic Weather Validation</h2>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-6" />
                  <button 
                    onClick={fetchLiveWeather}
                    disabled={isWeatherLoading}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl border border-sky-500/30 bg-sky-500/5 text-[10px] font-mono text-sky-400 uppercase tracking-widest hover:bg-sky-500/10 transition-all",
                      isWeatherLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Upload className={cn("w-3 h-3", isWeatherLoading && "animate-spin")} />
                    {isWeatherLoading ? "Fetching..." : "Fetch Live NWS Data"}
                  </button>
                </div>

                <div className="p-10 rounded-[40px] bg-white/[0.02] border border-white/[0.05] space-y-8">
                  <div className="space-y-4">
                    {weatherEvents.map((ev, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <input 
                          className="md:col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 px-4 text-white/60 text-[10px] font-mono outline-none focus:border-sky-500/30"
                          value={ev.time}
                          onChange={(e) => {
                            const n = [...weatherEvents];
                            n[i].time = e.target.value;
                            setWeatherEvents(n);
                          }}
                        />
                        <input 
                          className="md:col-span-6 bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 px-4 text-white/90 text-xs outline-none focus:border-sky-500/30"
                          value={ev.reference}
                          onChange={(e) => {
                            const n = [...weatherEvents];
                            n[i].reference = e.target.value;
                            setWeatherEvents(n);
                          }}
                        />
                        <input 
                          className="md:col-span-4 bg-white/[0.03] border border-white/[0.08] rounded-xl py-3 px-4 text-white/60 text-xs outline-none focus:border-sky-500/30"
                          value={ev.relevance}
                          onChange={(e) => {
                            const n = [...weatherEvents];
                            n[i].relevance = e.target.value;
                            setWeatherEvents(n);
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Storm Data Summary</p>
                    <textarea
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-white/60 text-[11px] leading-relaxed outline-none focus:border-sky-500/30 resize-none h-24"
                      value={stormSummary}
                      onChange={(e) => setStormSummary(e.target.value)}
                    />
                  </div>
                </div>
              </section>
            </section>
          </div>

          {/* Right Column: Documentation & Summary */}
          <div className="lg:col-span-4 space-y-12">
            
            {/* AI Findings Intelligence */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Activity className="w-4 h-4 text-indigo-400" />
                </div>
                <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-[0.3em]">AI Findings Support</h2>
              </div>
              
              {/* Finding Categories Multi-Select */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] space-y-4">
                <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Documented Forensic Categories</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider border transition-all",
                        findingCategories.includes(cat)
                          ? "bg-indigo-500 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                          : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <AIAssistSummary 
                findings={findingCategories.length > 0 ? findingCategories : [OUTCOME_OPTIONS.find(o => o.value === outcomeType)?.label || "General Damage"]}
                outcome={outcomeType || "no_damage"}
                onApprove={(draft) => {
                  setHeadline(draft.headline);
                  setBody(draft.findingSummary);
                  onUpdate({
                    ...session,
                    findings: {
                      ...session.findings,
                      summaryHeadline: draft.headline,
                      summaryBody: draft.findingSummary,
                      aiPdfCopy: draft.pdfCopy,
                      aiFollowUpNote: draft.followUpNote
                    }
                  });
                }}
              />
            </section>

            {/* Summary Instrument */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <FileText className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-[0.3em]">Buyer Briefing</h2>
              </div>

              <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.05] space-y-8 backdrop-blur-xl">
                <div className="space-y-4">
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Executive Headline</p>
                  <input
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-5 px-6 text-white text-lg font-display placeholder:text-white/10 outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all"
                    placeholder="E.g. Documented Forensic Storm File"
                    value={headline}
                    onChange={(e) => { setHeadline(e.target.value); setErrors((err) => { const n = { ...err }; delete n.headline; return n; }); }}
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Technical Summary</p>
                  <textarea
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 text-white/80 text-sm font-light leading-relaxed placeholder:text-white/10 outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all resize-none min-h-[160px] custom-scrollbar"
                    placeholder="Input detailed findings summary here..."
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setErrors((err) => { const n = { ...err }; delete n.body; return n; }); }}
                  />
                </div>
              </div>
            </section>

            {/* Asset Library */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Camera className="w-4 h-4 text-amber-400" />
                  </div>
                  <h2 className="text-xs font-mono font-bold text-white/80 uppercase tracking-[0.3em]">Evidence Log</h2>
                </div>
                <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]">{photoAssets.length} Assets Attached</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label className="h-24 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-indigo-500/30 flex items-center justify-center gap-3 cursor-pointer transition-all duration-500 group overflow-hidden">
                  <Upload className="w-5 h-5 text-white/20 group-hover:text-indigo-400" />
                  <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em] font-bold">Upload Forensic Data</span>
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFileChange} />
                </label>

                <Reorder.Group axis="y" values={photoAssets} onReorder={setPhotoAssets} className="space-y-3">
                  {photoAssets.map((photo) => (
                    <Reorder.Item 
                      key={photo.assetId} 
                      value={photo}
                      className={cn(
                        "group relative h-24 rounded-[28px] overflow-hidden border border-white/[0.05] bg-white/[0.03] flex items-center gap-6 p-3 cursor-grab active:cursor-grabbing",
                        photo.isSensitive && "opacity-50 grayscale"
                      )}
                    >
                      <div className="w-20 h-full rounded-2xl overflow-hidden bg-black flex-shrink-0">
                        <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {photo.tags?.map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded-md bg-white/5 text-[7px] font-mono text-white/40 uppercase tracking-widest">{t}</span>
                          ))}
                          {photo.isSensitive && <EyeOff className="w-3 h-3 text-rose-500" />}
                        </div>
                        <p className="text-[10px] font-display font-medium text-white/70 truncate">{photo.caption}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {photo.severity && (
                            <div className="flex items-center gap-1">
                              <div className={cn("w-1 h-1 rounded-full", 
                                photo.severity === 'critical' ? 'bg-rose-500' : 
                                photo.severity === 'high' ? 'bg-amber-500' : 'bg-emerald-500'
                              )} />
                              <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">{photo.severity}</span>
                            </div>
                          )}
                          <span className="text-[7px] font-mono text-white/20 uppercase tracking-widest">
                            {photo.annotations?.length || 0} Markups
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setAnnotatingAssetId(photo.assetId)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-400">
                          <Scan className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRefiningAssetId(photo.assetId)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400">
                          <Database className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPhotoAssets(photoAssets.filter(p => p.assetId !== photo.assetId))} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-rose-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Control Surface (Footer) */}
      <div className="absolute bottom-0 inset-x-0 p-10 z-50 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent pt-32 pointer-events-none">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-8 pointer-events-auto">
          <button onClick={onBack} className="group flex items-center gap-3 px-8 py-5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300">
            <ArrowLeft className="w-4 h-4 text-white/90 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-display font-medium text-white">Back</span>
          </button>
          <StarButton 
            onClick={handleLock}
            disabled={!outcomeType}
            lightColor="#FAFAFA"
            backgroundColor="#0A0A0A"
            className={cn(
              "flex-1 h-20 rounded-[40px] transition-all duration-500",
              !outcomeType ? "opacity-20 grayscale cursor-not-allowed" : "active:scale-95 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.2)]"
            )}
          >
            <div className="flex items-center gap-6">
              <div className="relative">
                {Object.keys(errors).length > 0 ? (
                  <AlertCircle className="w-7 h-7 text-rose-500 animate-pulse" />
                ) : (
                  <Lock className={cn("w-7 h-7 transition-colors", outcomeType ? "text-indigo-400" : "text-white/20")} />
                )}
              </div>
              <span className="text-xl font-display font-medium text-white tracking-wide">
                {!outcomeType ? "Classification Required" : "Execute Immutable Lock & Finalize"}
              </span>
              <ChevronRight className="w-6 h-6 text-white/30" />
            </div>
          </StarButton>
        </div>
      </div>
    </div>
  );
}

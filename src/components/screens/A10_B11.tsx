"use client";

import { useState, useEffect } from "react";
import { fetchWeatherNws } from "@/lib/api";
import type { SessionState, OutcomeType } from "@/types/session";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StarButton } from "@/components/ui/star-button";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
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
import type { Annotation, PhotoAsset, InspectionPhoto } from "@/types/session";
import { InspectionPhotoChecklist } from "@/components/InspectionPhotoChecklist";
import { INSPECTION_SHOT_LIST } from "@/lib/inspectionShotList";

// ─────────────────────────────────────────────────────────────────────────────
// A10 - Inspection In Progress Hold Screen
// ─────────────────────────────────────────────────────────────────────────────

interface HoldProps {
  session: SessionState;
  onRepReturn: () => void;
  onBack: () => void;
}

const PIN_STORAGE_KEY = "hustad_rep_pin";
const DEFAULT_PIN = "1234";

function getStoredPin(): string {
  if (typeof window === "undefined") return DEFAULT_PIN;
  return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
}

function RepPinModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (next === getStoredPin()) {
        setTimeout(onSuccess, 150);
      } else {
        setShake(true);
        setTimeout(() => { setPin(""); setShake(false); }, 600);
      }
    }
  };

  const handleBack = () => setPin(p => p.slice(0, -1));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[40px] p-8 space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-xl font-display font-medium text-[var(--tx1)] mt-4">Rep Authorization Required</h2>
          <p className="text-sm text-[var(--tx3)] font-light">Enter your 4-digit rep PIN to proceed.</p>
        </div>

        {/* PIN dots */}
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-4"
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-200",
                i < pin.length
                  ? shake ? "bg-rose-500 border-rose-500" : "bg-indigo-500 border-indigo-500"
                  : "bg-transparent border-[var(--border-color)]"
              )}
            />
          ))}
        </motion.div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((key, i) => (
            <button
              key={i}
              onClick={() => key === "⌫" ? handleBack() : key ? handleDigit(key) : undefined}
              disabled={!key}
              className={cn(
                "h-14 rounded-2xl font-display text-lg font-medium transition-all active:scale-95",
                !key ? "invisible" : key === "⌫"
                  ? "bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx3)] hover:text-[var(--tx1)] hover:bg-[var(--bg-base)]"
                  : "bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--tx1)] hover:bg-[var(--bg-base)] hover:border-indigo-500/30"
              )}
            >
              {key}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full text-center text-[10px] font-mono uppercase tracking-widest text-[var(--tx4)] hover:text-[var(--tx2)] transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

export function A10InspectionHold({ session, onRepReturn, onBack }: HoldProps) {
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    const handleVisibility = () => { /* wake signal */ };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <div className="relative flex flex-col h-screen w-full bg-[var(--bg-base)] text-[var(--tx1)]">
      <div className="absolute inset-0 pointer-events-none overflow-hidden theme-graphic">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(99,102,241,0.03),transparent_50%)]" />
      </div>

      <div className="absolute top-8 left-8 z-30 flex flex-col items-start pointer-events-none">
        <div className="flex flex-col items-start gap-1">
          <img src="/logo.svg" alt="Hustad Logo" className="h-10 w-auto dark:invert opacity-90 transition-all duration-300" />
        </div>
      </div>

      {/* Scrollable content area — grows to fill space above the sticky footer */}
      <div className="relative z-10 flex-1 overflow-y-auto flex flex-col items-center justify-center px-8 py-16 text-center min-h-0">
        <div className="max-w-4xl w-full space-y-8 md:space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full h-[220px] md:h-[300px] lg:h-[350px] rounded-[48px] overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)] backdrop-blur-3xl group flex flex-col items-center justify-center"
          >
            <div className="absolute inset-0 z-0 opacity-20 bg-[url('/images/grid.png')] bg-repeat" />
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-50" />

            <div className="relative z-10 flex flex-col items-center justify-center space-y-6 pointer-events-none">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border border-indigo-500/30 bg-[var(--bg-base)] flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                  <Activity className="w-10 h-10 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/40 animate-ping theme-graphic" />
              </div>
              <div className="space-y-2 text-center">
                <p className="font-mono text-[10px] text-indigo-500 dark:text-indigo-300 uppercase tracking-[0.4em] font-bold">
                  Status
                </p>
                <div className="h-6 overflow-hidden relative">
                  <motion.div
                    animate={{ y: [0, -24, -48, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="flex flex-col text-sm text-[var(--tx2)] uppercase tracking-widest font-mono"
                  >
                    <span className="h-6 flex items-center justify-center">Documenting Exterior</span>
                    <span className="h-6 flex items-center justify-center">Organizing Photos</span>
                    <span className="h-6 flex items-center justify-center">Preparing Review</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl lg:text-7xl xl:text-8xl font-display font-medium text-[var(--tx1)] tracking-tight leading-[1.05]">
              Your Hustad rep is finishing
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-[var(--tx1)] to-indigo-500 dark:from-indigo-300 dark:via-white dark:to-indigo-300">the exterior review.</span>
            </h1>
            <p className="text-lg text-[var(--tx3)] font-light leading-relaxed max-w-lg mx-auto">
              When your rep returns, they will start with your selected priorities and actual photos from your home.
            </p>
          </div>
        </div>
      </div>

      {/* PIN modal */}
      <AnimatePresence>
        {showPinModal && (
          <RepPinModal
            onSuccess={() => { setShowPinModal(false); onRepReturn(); }}
            onCancel={() => setShowPinModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom Navigation — in flex flow so it never overlaps content */}
      <div className="relative z-30 shrink-0 px-4 pb-4 md:pb-6 pt-4">
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-transparent to-[var(--bg-base)] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--tx3)] hover:text-[var(--tx1)] hover:bg-[var(--bg-subtle)] transition-all text-[10px] font-mono uppercase tracking-widest active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              Rep: Return to Prep
            </button>
            <button
              onClick={() => setShowPinModal(true)}
              className="flex-1 py-5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--tx1)] font-display text-sm hover:bg-[var(--bg-subtle)] transition-all active:scale-[0.98]"
            >
              I am ready for the review
            </button>
          </motion.div>
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// B11 - Rep Findings Prep
// ─────────────────────────────────────────────────────────────────────────────

interface RepPrepProps {
  session: SessionState;
  onUpdate: (s: SessionState) => void;
  onNext: () => void;
  onBack: () => void;
}

const OUTCOME_OPTIONS: { value: OutcomeType; label: string; description: string; icon: any; color: string }[] = [
  { value: "no_damage", label: "No Damage / Monitor Only", description: "Property integrity maintained or proactive baseline tracking.", icon: ShieldCheck, color: "emerald" },
  { value: "repair_only", label: "Repair Only", description: "Targeted restoration path.", icon: Wrench, color: "indigo" },
  { value: "claim_review_candidate", label: "Claim Review", description: "Storm damage documentation.", icon: Zap, color: "amber" },
  { value: "full_restoration_candidate", label: "Full Restoration", description: "Complete home restoration.", icon: LayoutGrid, color: "rose" },
];

// ─── Decision Tree ────────────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  question: string;
  detail: string;
  yesLabel?: string;
  noLabel?: string;
  yes: string;
  no: string;
}

const TREE_NODES: Record<string, TreeNode> = {
  metal_impact: {
    id: "metal_impact",
    question: "Did you observe impact marks, bruising, or dents on metal surfaces?",
    detail: "Check gutters, downspouts, A/C fins, vents, and flashing.",
    yes: "widespread_damage",
    no: "shingle_damage",
  },
  widespread_damage: {
    id: "widespread_damage",
    question: "Is the damage widespread across multiple slopes or surfaces?",
    detail: "Roof + siding, gutters, or windows all showing consistent storm impact.",
    yesLabel: "Yes, multiple surfaces",
    noLabel: "No, localized area",
    yes: "result_full_restoration",
    no: "result_claim_review",
  },
  shingle_damage: {
    id: "shingle_damage",
    question: "Did you observe granule loss, cracking, or displaced shingles?",
    detail: "Look for bare spots, tab cracks, lifted edges, or missing sections.",
    yes: "storm_or_aging",
    no: "result_no_damage",
  },
  storm_or_aging: {
    id: "storm_or_aging",
    question: "Does the wear appear storm-related or gradual aging?",
    detail: "Storm damage is concentrated and consistent. Aging is gradual and uniform across the surface.",
    yesLabel: "Storm-related",
    noLabel: "Gradual aging",
    yes: "result_repair_only",
    no: "result_monitor_only",
  },
};

const TREE_RESULTS: Record<string, { value: OutcomeType; label: string; reason: string }> = {
  result_full_restoration: {
    value: "full_restoration_candidate",
    label: "Full Restoration Candidate",
    reason: "Metal impact confirmed across multiple surfaces — consistent with a significant storm event requiring full exterior restoration.",
  },
  result_claim_review: {
    value: "claim_review_candidate",
    label: "Claim Review Candidate",
    reason: "Metal impact confirmed with localized storm damage — document the findings and support an insurance claim review.",
  },
  result_repair_only: {
    value: "repair_only",
    label: "Repair Only",
    reason: "Shingle damage is present and storm-related but localized — a targeted repair is the right path.",
  },
  result_monitor_only: {
    value: "no_damage",
    label: "Monitor Only",
    reason: "Wear observed is consistent with normal aging, not storm impact — set a baseline and monitor over time.",
  },
  result_no_damage: {
    value: "no_damage",
    label: "No Damage",
    reason: "No significant damage indicators found — property integrity appears maintained.",
  },
};

interface DecisionTreeModalProps {
  onAccept: (outcome: OutcomeType) => void;
  onDismiss: () => void;
  isHighContrast: boolean;
}

function DecisionTreeModal({ onAccept, onDismiss, isHighContrast }: DecisionTreeModalProps) {
  const [currentNodeId, setCurrentNodeId] = useState("metal_impact");
  const [history, setHistory] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const currentNode = TREE_NODES[currentNodeId];
  const currentResult = result ? TREE_RESULTS[result] : null;
  const currentStep = history.length + (result ? 1 : 0);
  const totalSteps = 4;

  const handleAnswer = (answer: "yes" | "no") => {
    const next = answer === "yes" ? currentNode.yes : currentNode.no;
    setHistory(prev => [...prev, currentNodeId]);
    if (next.startsWith("result_")) {
      setResult(next);
    } else {
      setCurrentNodeId(next);
    }
  };

  const handleBack = () => {
    if (result) { setResult(null); return; }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setCurrentNodeId(prev);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "w-full max-w-lg rounded-[40px] border p-8 space-y-8",
          isHighContrast
            ? "bg-white border-black text-black"
            : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--tx1)]"
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border",
              isHighContrast ? "bg-white border-black" : "bg-indigo-500/10 border-indigo-500/20"
            )}>
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--tx3)]">
              Classification Guide
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-[10px] font-mono uppercase tracking-widest text-[var(--tx4)] hover:text-[var(--tx2)] transition-colors"
          >
            Close
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i < currentStep ? "bg-indigo-500" : "bg-[var(--border-color)]"
              )}
            />
          ))}
        </div>

        {/* Question or Result */}
        <AnimatePresence mode="wait">
          {!currentResult ? (
            <motion.div
              key={currentNodeId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <p className="text-xl font-display font-medium text-[var(--tx1)] leading-snug">
                  {currentNode.question}
                </p>
                <p className="text-sm text-[var(--tx3)] font-light leading-relaxed">
                  {currentNode.detail}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAnswer("yes")}
                  className={cn(
                    "py-4 rounded-2xl border font-display font-semibold text-sm transition-all active:scale-95",
                    isHighContrast
                      ? "bg-black text-white border-black"
                      : "bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600"
                  )}
                >
                  {currentNode.yesLabel || "Yes"}
                </button>
                <button
                  onClick={() => handleAnswer("no")}
                  className={cn(
                    "py-4 rounded-2xl border font-display font-semibold text-sm transition-all active:scale-95",
                    isHighContrast
                      ? "bg-white text-black border-black"
                      : "bg-[var(--bg-subtle)] text-[var(--tx2)] border-[var(--border-color)] hover:bg-[var(--bg-base)]"
                  )}
                >
                  {currentNode.noLabel || "No"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-3 p-6 rounded-3xl bg-indigo-500/[0.06] border border-indigo-500/20">
                <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-indigo-500">
                  Recommended Classification
                </p>
                <p className="text-2xl font-display font-semibold text-[var(--tx1)]">
                  {currentResult.label}
                </p>
                <p className="text-sm text-[var(--tx3)] font-light leading-relaxed">
                  {currentResult.reason}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onAccept(currentResult.value)}
                  className={cn(
                    "py-4 rounded-2xl border font-display font-semibold text-sm transition-all active:scale-95",
                    isHighContrast
                      ? "bg-black text-white border-black"
                      : "bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600"
                  )}
                >
                  Accept
                </button>
                <button
                  onClick={onDismiss}
                  className={cn(
                    "py-4 rounded-2xl border font-display font-semibold text-sm transition-all active:scale-95",
                    isHighContrast
                      ? "bg-white text-black border-black"
                      : "bg-[var(--bg-subtle)] text-[var(--tx2)] border-[var(--border-color)] hover:bg-[var(--bg-base)]"
                  )}
                >
                  Choose Manually
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back */}
        {(history.length > 0 || result) && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[var(--tx4)] hover:text-[var(--tx2)] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function B11RepFindingsPrep({ session, onUpdate, onNext, onBack }: RepPrepProps) {
  const { theme } = useTheme();
  const isHighContrast = theme === "high-contrast";
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
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);
  const [autoClassifyResult, setAutoClassifyResult] = useState<{
    classification: string; confidence: number; headline: string;
    reasoning: string; signals: string[];
    urgentCount?: number; stormCount?: number; monitorCount?: number;
  } | null>(null);
  const [autoClassifyError, setAutoClassifyError] = useState<string | null>(null);
  const [repConfirmed, setRepConfirmed] = useState(false);
  const [showHandoffPanel, setShowHandoffPanel] = useState(true);

  const availablePhotoCount =
    (session.photoAssets?.filter(p => p.dataUrl).length ?? 0) +
    (session.photos?.filter(p => p.localUri || p.remoteUrl).length ?? 0);

  const handleAutoClassify = async () => {
    const photos = session.photoAssets?.map(p => p.dataUrl).filter(Boolean) ?? [];
    const inspectionPhotos = session.photos?.map(p => p.localUri || p.remoteUrl).filter(Boolean) ?? [];
    const allPhotos = [...photos, ...inspectionPhotos];

    if (allPhotos.length === 0) {
      setAutoClassifyError("No photos found. Upload inspection photos using the camera below first.");
      return;
    }

    setIsAutoClassifying(true);
    setAutoClassifyError(null);
    setAutoClassifyResult(null);

    try {
      const res = await fetch("/api/classify-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: allPhotos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Classification failed");
      setAutoClassifyResult(data);
    } catch (err: any) {
      setAutoClassifyError(err.message ?? "Something went wrong");
    } finally {
      setIsAutoClassifying(false);
    }
  };

  const COMMON_CATEGORIES = [
    "Hail Impact", "Wind Displacement", "Granule Loss", "Thermal Cracking",
    "Mechanical Damage", "Flashing Failure", "Gutter Compromise", "Collateral Metal Impact"
  ];

  const SIGNAL_CATEGORY_MAP: [RegExp, string][] = [
    [/hail/i, "Hail Impact"],
    [/wind|displace/i, "Wind Displacement"],
    [/granule/i, "Granule Loss"],
    [/crack|thermal/i, "Thermal Cracking"],
    [/mechanical|dent|bruise/i, "Mechanical Damage"],
    [/flash/i, "Flashing Failure"],
    [/gutter|downspout/i, "Gutter Compromise"],
    [/metal|collateral/i, "Collateral Metal Impact"],
  ];

  const applyAutoClassify = () => {
    if (!autoClassifyResult) return;
    const cls = autoClassifyResult.classification as OutcomeType;
    setOutcome(cls);
    setUrgentCount(autoClassifyResult.urgentCount ?? 0);
    setStormCount(autoClassifyResult.stormCount ?? 0);
    setMonitorCount(autoClassifyResult.monitorCount ?? 0);
    setHeadline(autoClassifyResult.headline);
    setBody(autoClassifyResult.reasoning);
    // Map signals to known categories
    const matched = new Set<string>();
    for (const signal of autoClassifyResult.signals ?? []) {
      for (const [pattern, cat] of SIGNAL_CATEGORY_MAP) {
        if (pattern.test(signal)) matched.add(cat);
      }
    }
    if (matched.size > 0) setFindingCategories(Array.from(matched));
    setErrors({});
    setAutoClassifyResult(null);
  };

  const toggleCategory = (cat: string) => {
    setFindingCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [isPropertyLoading, setIsPropertyLoading] = useState(false);
  const [propertyDataNote, setPropertyDataNote] = useState<string | null>(null);

  const fetchPropertyData = async () => {
    const { address, cityStateZip } = session.property;
    if (!address) {
      setPropertyDataNote("No property address in session. Enter address first.");
      return;
    }
    setIsPropertyLoading(true);
    setPropertyDataNote(null);
    try {
      const res = await fetch(
        `/api/property-data?address=${encodeURIComponent(address)}&cityStateZip=${encodeURIComponent(cityStateZip ?? "")}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      if (data.roofingSqFt) {
        setRoofingArea(data.roofingSqFt.toLocaleString());
        setPropertyDataNote(`${data.note} (${data.confidence})`);
      } else {
        setPropertyDataNote(data.note ?? "No footprint data found for this address.");
      }
    } catch (err: any) {
      setPropertyDataNote(err.message ?? "Property lookup failed.");
    } finally {
      setIsPropertyLoading(false);
    }
  };

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
      const res = await fetchWeatherNws(coords);
      const data = await res.json();
      
      if (data.reports && data.reports.length > 0) {
        const newEvents = data.reports.slice(0, 3).map((r: any) => ({
          time: r.time,
          reference: r.reference,
          relevance: `Located in ${r.county} county. ${r.details || "Storm intensity validation."}`
        }));
        setWeatherEvents(newEvents);
        setStormSummary(`NWS weather data from the ${data.office} office confirms a significant ${data.reports[0].type.toLowerCase()} event in the region. Local storm reports (LSRs) provide authoritative verification of intensity.`);
      } else {
        alert(`No official NWS storm reports found for the ${data.office || "local"} region in the last 48 hours. The area is currently clear according to official records.`);
      }
    } catch (err) {
      /* non-fatal */
      alert("Weather Sync Error: Could not connect to NWS Terminal. Please check your connection or enter data manually.");
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
    <div className="relative flex flex-col h-screen w-full overflow-hidden bg-[var(--bg-base)] text-[var(--tx1)]">
      <AnimatePresence>
        {showHandoffPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.96 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "w-full max-w-2xl rounded-[40px] border p-10 space-y-8 shadow-2xl relative overflow-hidden",
                isHighContrast
                  ? "bg-white border-black text-black"
                  : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--tx1)]"
              )}
            >
              {/* Highlight Background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
              
              <div className="relative z-10 flex items-center gap-5">
                <div className="w-14 h-14 rounded-[20px] bg-indigo-500 border border-indigo-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-display font-medium tracking-tight">Mandatory Rep Handoff</h2>
                  <p className="text-[var(--tx3)] text-sm font-light mt-1">Review homeowner inputs before opening the live review.</p>
                </div>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-indigo-500/30 transition-colors group">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--tx4)] mb-2 group-hover:text-indigo-400 transition-colors">Priorities</p>
                    <p className="font-display font-medium text-lg leading-snug">
                      {session.buyerData.buyerPriorities?.length 
                        ? session.buyerData.buyerPriorities.map(p => p.replace(/_/g, ' ')).join(', ') 
                        : "None selected"}
                    </p>
                  </div>
                  <div className="p-5 rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-indigo-500/30 transition-colors group">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--tx4)] mb-2 group-hover:text-indigo-400 transition-colors">Carrier Status</p>
                    <p className="font-display font-medium text-lg leading-snug">
                      {session.buyerData.insurerContactStatus?.replace(/_/g, ' ') || "Not specified"}
                    </p>
                  </div>
                  <div className="p-5 rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-indigo-500/30 transition-colors group">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--tx4)] mb-2 group-hover:text-indigo-400 transition-colors">Decision-Maker Status</p>
                    <p className="font-display font-medium text-lg leading-snug">
                      {session.buyerData.anotherDecisionMakerPresent 
                        ? `Yes (${session.buyerData.decisionMakerRelation?.replace(/_/g, ' ')})` 
                        : "No, just me"}
                    </p>
                  </div>
                  <div className="p-5 rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-indigo-500/30 transition-colors group">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--tx4)] mb-2 group-hover:text-indigo-400 transition-colors">Decision Comfort Need</p>
                    <p className="font-display font-medium text-lg leading-snug text-indigo-400">
                      {session.buyerData.decisionComfort?.replace(/_/g, ' ') || "Not specified"}
                    </p>
                  </div>
                </div>
                
                <div className="p-5 rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-indigo-500/30 transition-colors group">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--tx4)] mb-2 group-hover:text-indigo-400 transition-colors">Open Question for Rep</p>
                  <p className="font-body font-light text-[var(--tx1)] leading-relaxed italic">
                    "{session.buyerData.buyerQuestions || "No questions provided."}"
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-2">
                <button
                  onClick={() => setShowHandoffPanel(false)}
                  className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] bg-indigo-500 hover:bg-indigo-600 text-white font-display font-semibold text-lg transition-all active:scale-[0.98] shadow-[0_10px_40px_rgba(99,102,241,0.3)]"
                >
                  <Check className="w-5 h-5" />
                  I have reviewed these inputs
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
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
        {showDecisionTree && (
          <DecisionTreeModal
            onAccept={(outcome) => {
              setOutcome(outcome);
              setErrors((e) => { const n = { ...e }; delete n.outcome; return n; });
              setShowDecisionTree(false);
            }}
            onDismiss={() => setShowDecisionTree(false)}
            isHighContrast={isHighContrast}
          />
        )}
        {(autoClassifyResult || autoClassifyError) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => { setAutoClassifyResult(null); setAutoClassifyError(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "w-full max-w-lg rounded-[40px] border p-8 space-y-6",
                isHighContrast ? "bg-white border-black" : "bg-[var(--bg-surface)] border-[var(--border-color)]"
              )}
              onClick={e => e.stopPropagation()}
            >
              {autoClassifyError ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-rose-500">Analysis Error</p>
                  <p className="text-base text-[var(--tx2)] font-light">{autoClassifyError}</p>
                  <button onClick={() => setAutoClassifyError(null)} className="text-[10px] font-mono uppercase tracking-widest text-[var(--tx4)] hover:text-[var(--tx2)] transition-colors">Dismiss</button>
                </div>
              ) : autoClassifyResult && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", isHighContrast ? "bg-white border-black" : "bg-indigo-500/10 border-indigo-500/20")}>
                        <Camera className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--tx3)]">AI Photo Analysis</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-mono px-3 py-1 rounded-full border",
                      autoClassifyResult.confidence >= 75
                        ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                        : autoClassifyResult.confidence >= 50
                        ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
                        : "text-rose-500 border-rose-500/30 bg-rose-500/5"
                    )}>
                      {autoClassifyResult.confidence}% confidence
                    </span>
                  </div>

                  {/* Result */}
                  <div className="p-6 rounded-3xl bg-indigo-500/[0.06] border border-indigo-500/20 space-y-3">
                    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-indigo-500">Recommended Classification</p>
                    <p className="text-2xl font-display font-semibold text-[var(--tx1)]">
                      {OUTCOME_OPTIONS.find(o => o.value === autoClassifyResult.classification)?.label ?? autoClassifyResult.classification}
                    </p>
                    <p className="text-sm text-[var(--tx3)] font-light leading-relaxed">{autoClassifyResult.reasoning}</p>
                  </div>

                  {/* Auto-fill preview */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--tx4)]">Will auto-fill</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Urgent", value: autoClassifyResult.urgentCount ?? 0, color: "text-rose-500" },
                        { label: "Storm", value: autoClassifyResult.stormCount ?? 0, color: "text-indigo-400" },
                        { label: "Monitor", value: autoClassifyResult.monitorCount ?? 0, color: "text-[var(--tx2)]" },
                      ].map(item => (
                        <div key={item.label} className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-center">
                          <p className={cn("text-2xl font-display font-semibold", item.color)}>{item.value}</p>
                          <p className="text-[9px] font-mono text-[var(--tx4)] uppercase tracking-widest mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[var(--tx4)] font-light pt-1">Headline, summary body, and damage categories will also be populated.</p>
                  </div>

                  {/* Signals */}
                  {autoClassifyResult.signals?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--tx4)]">Damage signals detected</p>
                      <ul className="space-y-1.5">
                        {autoClassifyResult.signals.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[var(--tx3)] font-light">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={applyAutoClassify}
                      className={cn(
                        "py-4 rounded-2xl border font-display font-semibold text-sm transition-all active:scale-95",
                        isHighContrast ? "bg-black text-white border-black" : "bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600"
                      )}
                    >
                      Accept & Auto-fill
                    </button>
                    <button
                      onClick={() => setAutoClassifyResult(null)}
                      className={cn(
                        "py-4 rounded-2xl border font-display font-semibold text-sm transition-all active:scale-95",
                        isHighContrast ? "bg-white text-black border-black" : "bg-[var(--bg-subtle)] text-[var(--tx2)] border-[var(--border-color)] hover:bg-[var(--bg-base)]"
                      )}
                    >
                      Choose Manually
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* HUD Background Layers */}
      <div className="absolute inset-0 pointer-events-none opacity-30 theme-graphic">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-500/5 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[url('/images/grid.png')] bg-repeat opacity-[0.03]" />
      </div>

      {/* Institutional Header */}
      <div className="relative z-40 flex items-center justify-between px-12 pt-10 pb-6 border-b border-[var(--border-color)] bg-[var(--bg-base)]/80 backdrop-blur-2xl">
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Hustad Logo" className="h-10 w-auto dark:invert opacity-90 transition-all duration-300" />
            <div className="h-4 w-[1px] bg-[var(--border-color)] mx-1" />
            <span className="text-[10px] font-mono text-[var(--tx2)] uppercase tracking-[0.4em] font-medium pt-1">Inspection Analysis Builder</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--tx3)] font-mono text-[9px] uppercase tracking-widest mt-1">
            <Scan className="w-3 h-3" />
            <span>S11 Control Portal // Active Session: {session.sessionId.slice(-6)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono text-[var(--tx4)] uppercase tracking-widest">Lead Inspector</span>
            <span className="text-sm font-display font-medium text-[var(--tx1)]">{session.repName}</span>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-xl flex items-center gap-3 border",
            isHighContrast 
              ? "bg-white border-black text-black" 
              : "bg-amber-500/[0.08] border-amber-500/30 text-amber-500"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", isHighContrast ? "bg-black" : "bg-amber-500 animate-pulse")} />
            <span className={cn("text-[10px] font-mono uppercase tracking-[0.2em] font-bold", isHighContrast ? "text-black" : "text-amber-500")}>Internal Ops</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto min-h-0 px-6 md:px-12 pt-10 pb-64">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-12">
          
          {/* Left Column: Outcome & Quantitative */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Outcome Terminal */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border",
                    isHighContrast ? "bg-white border-black text-black" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  )}>
                    <Database className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-mono font-bold text-[var(--tx2)] uppercase tracking-[0.3em]">Result Classification</h2>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--border-color)] to-transparent ml-6" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {OUTCOME_OPTIONS.map((opt) => {
                  const isSelected = outcomeType === opt.value || (opt.value === "no_damage" && outcomeType === "monitor_only");
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setOutcome(opt.value); setErrors((e) => { const n = { ...e }; delete n.outcome; return n; }); }}
                      className={cn(
                        "relative group flex flex-col p-6 rounded-[32px] border transition-all duration-500 text-left overflow-hidden",
                        isHighContrast
                          ? (isSelected ? "bg-white border-2 border-black text-black" : "bg-white border border-black/20 text-black/60 hover:border-black")
                          : (isSelected 
                              ? "bg-[var(--bg-surface)] border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)]" 
                              : "bg-[var(--bg-subtle)] border-[var(--border-color)] hover:bg-white/[0.04] hover:border-white/10")
                      )}
                    >
                      {isSelected && !isHighContrast && (
                        <motion.div layoutId="active-bg" className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.08] to-transparent pointer-events-none" />
                      )}
                      <div className="relative z-10 flex items-center justify-between mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          isHighContrast
                            ? (isSelected ? "bg-black text-white" : "bg-white border border-black text-black")
                            : (isSelected ? "bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "bg-white/[0.05] text-[#3F5878]")
                        )}>
                          <opt.icon className={cn("w-6 h-6", isHighContrast ? (isSelected ? "text-white" : "text-black") : (isSelected ? "text-[#E8EDF8]" : "text-[#567090]"))} />
                        </div>
                        {isSelected && <Check className={cn("w-5 h-5", isHighContrast ? "text-black" : "text-indigo-400")} />}
                      </div>
                      <div className="relative z-10">
                        <p className={cn("font-display font-medium text-lg tracking-tight mb-1", 
                          isHighContrast 
                            ? "text-black" 
                            : (isSelected ? "text-[var(--tx1)]" : "text-[var(--tx3)]")
                        )}>{opt.label}</p>
                        <p className={cn("text-xs font-light leading-relaxed uppercase tracking-widest",
                          isHighContrast ? "text-black/80" : "text-[var(--tx4)]"
                        )}>{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Classification helpers */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  onClick={handleAutoClassify}
                  disabled={isAutoClassifying || availablePhotoCount === 0}
                  title={availablePhotoCount === 0 ? "Add inspection photos below before classifying" : `Analyze ${availablePhotoCount} photo${availablePhotoCount !== 1 ? "s" : ""}`}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-mono uppercase tracking-widest transition-all active:scale-95",
                    (isAutoClassifying || availablePhotoCount === 0) ? "opacity-40 cursor-not-allowed" : "",
                    isHighContrast
                      ? "bg-white border-black text-black hover:bg-black hover:text-white"
                      : "bg-indigo-500/10 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/20"
                  )}
                >
                  <Camera className={cn("w-3 h-3", isAutoClassifying && "animate-pulse")} />
                  {isAutoClassifying
                    ? "Analyzing photos…"
                    : availablePhotoCount > 0
                    ? `Auto-classify from ${availablePhotoCount} photo${availablePhotoCount !== 1 ? "s" : ""}`
                    : "Auto-classify (no photos yet)"}
                </button>
                <button
                  onClick={() => setShowDecisionTree(true)}
                  className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors"
                >
                  <Layers className="w-3 h-3" />
                  Not sure? Use Classification Guide
                </button>
              </div>
            </section>

            {/* Instrument Panel (Counts) */}
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", 
                  isHighContrast ? "bg-white border-black text-black" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                )}>
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-mono font-bold text-[var(--tx2)] uppercase tracking-[0.3em]">Inspection Data Points</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--border-color)] to-transparent ml-6" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Urgent", value: urgentCount, set: setUrgentCount, color: isHighContrast ? "text-black" : "text-rose-500", bg: isHighContrast ? "bg-white border-2 border-black" : "bg-rose-500/5 border-rose-500/10" },
                  { label: "Storm", value: stormCount, set: setStormCount, color: isHighContrast ? "text-black" : "text-indigo-400", bg: isHighContrast ? "bg-white border-2 border-black" : "bg-indigo-500/5 border-indigo-500/10" },
                  { label: "Monitor", value: monitorCount, set: setMonitorCount, color: isHighContrast ? "text-black" : "text-[var(--tx2)]", bg: isHighContrast ? "bg-white border-2 border-black" : "bg-white/5 border-white/10" },
                ].map((item) => (
                  <div key={item.label} className={cn("relative group p-8 rounded-[40px] border flex flex-col items-center", 
                    isHighContrast ? "bg-white border-black text-black" : "bg-[var(--bg-surface)] border-[var(--border-color)]"
                  )}>
                    <div className="absolute top-4 right-6 text-[10px] font-mono text-[var(--tx4)] uppercase tracking-widest">{item.label} Metric</div>
                    <p className={cn("text-6xl font-display font-medium tracking-tighter mb-6", item.color)}>{item.value}</p>
                    <div className="flex items-center gap-3 w-full max-w-[140px]">
                      <button 
                        onClick={() => item.set(Math.max(0, item.value - 1))}
                        className="flex-1 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--bg-base)] text-[var(--tx1)] flex items-center justify-center transition-all active:scale-90"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => item.set(item.value + 1)}
                        className="flex-1 h-12 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--bg-base)] text-[var(--tx1)] flex items-center justify-center transition-all active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Technical Property Metrics */}
              <div className={cn("p-10 rounded-[40px] border grid grid-cols-1 md:grid-cols-2 gap-10",
                isHighContrast ? "bg-white border-black" : "bg-[var(--bg-surface)] border-[var(--border-color)]"
              )}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between pl-1">
                    <p className="text-[9px] font-mono text-[var(--tx3)] uppercase tracking-[0.4em] font-bold">Roofing Area (SF)</p>
                    <button
                      onClick={fetchPropertyData}
                      disabled={isPropertyLoading}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border uppercase tracking-widest font-mono text-[9px] transition-all active:scale-95",
                        isPropertyLoading ? "opacity-50 cursor-not-allowed" : "",
                        isHighContrast
                          ? "bg-white border-black text-black hover:bg-black hover:text-white"
                          : "border-emerald-500/30 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10"
                      )}
                    >
                      <Upload className={cn("w-3 h-3", isPropertyLoading && "animate-spin")} />
                      {isPropertyLoading ? "Looking up…" : "Fetch Live"}
                    </button>
                  </div>
                  <input
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl py-5 px-6 text-[var(--tx1)] text-xl font-display placeholder:text-[var(--tx4)] outline-none focus:border-indigo-500/40 focus:bg-[var(--bg-base)] transition-all"
                    placeholder="e.g. 3,200"
                    value={roofingArea}
                    onChange={(e) => setRoofingArea(e.target.value)}
                  />
                  {propertyDataNote && (
                    <p className="text-[10px] text-[var(--tx4)] font-light pl-1 leading-relaxed">{propertyDataNote}</p>
                  )}
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] font-mono text-[var(--tx3)] uppercase tracking-[0.4em] pl-1 font-bold">Preliminary Restoration Value Range</p>
                  <input
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl py-5 px-6 text-[var(--tx1)] text-xl font-display placeholder:text-[var(--tx4)] outline-none focus:border-indigo-500/40 focus:bg-[var(--bg-base)] transition-all"
                    placeholder="e.g. $28,800"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Weather Validation Terminal */}
              <section className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border",
                    isHighContrast ? "bg-white border-black text-black" : "bg-sky-500/10 border-sky-500/20 text-sky-400"
                  )}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-mono font-bold text-[var(--tx2)] uppercase tracking-[0.3em]">Weather Validation</h2>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-[var(--border-color)] to-transparent ml-6" />
                  <button 
                    onClick={fetchLiveWeather}
                    disabled={isWeatherLoading}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl border uppercase tracking-widest font-mono text-[10px] transition-all",
                      isHighContrast
                        ? "bg-white border-black text-black hover:bg-black hover:text-white"
                        : "border-sky-500/30 bg-sky-500/5 text-sky-400 hover:bg-sky-500/10",
                      isWeatherLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Upload className={cn("w-3 h-3", isWeatherLoading && "animate-spin")} />
                    {isWeatherLoading ? "Fetching..." : "Fetch Live NWS Data"}
                  </button>
                </div>

                <div className={cn("p-10 rounded-[40px] border space-y-8",
                  isHighContrast ? "bg-white border-black" : "bg-[var(--bg-surface)] border-[var(--border-color)]"
                )}>
                  <div className="space-y-4">
                    {weatherEvents.map((ev, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <input 
                          className="md:col-span-2 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--tx2)] text-[10px] font-mono outline-none focus:border-sky-500/30"
                          value={ev.time}
                          onChange={(e) => {
                            const n = [...weatherEvents];
                            n[i].time = e.target.value;
                            setWeatherEvents(n);
                          }}
                        />
                        <input 
                          className="md:col-span-6 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--tx1)] text-xs outline-none focus:border-sky-500/30"
                          value={ev.reference}
                          onChange={(e) => {
                            const n = [...weatherEvents];
                            n[i].reference = e.target.value;
                            setWeatherEvents(n);
                          }}
                        />
                        <input 
                          className="md:col-span-4 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-xl py-3 px-4 text-[var(--tx3)] text-xs outline-none focus:border-sky-500/30"
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

                  <div className="pt-6 border-t border-[var(--border-color)] space-y-4">
                    <p className="text-[9px] font-mono text-[var(--tx3)] uppercase tracking-[0.4em] pl-1 font-bold">Storm Data Summary</p>
                    <textarea
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl p-6 text-[var(--tx2)] text-[11px] leading-relaxed outline-none focus:border-sky-500/30 resize-none h-24"
                      value={stormSummary}
                      onChange={(e) => setStormSummary(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              {/* Guided Inspection Photo Checklist */}
              <section className="space-y-8 mt-12 pt-12 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border",
                      isHighContrast ? "bg-white border-black text-black" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}>
                      <Camera className="w-4 h-4" />
                    </div>
                    <h2 className="text-xs font-mono font-bold text-[var(--tx2)] uppercase tracking-[0.3em]">Inspection Photo Capture</h2>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-[9px] font-mono text-[var(--tx4)] uppercase tracking-widest bg-[var(--bg-subtle)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                      {session.photos?.length || 0} Inspection Photos
                    </span>
                    <span className="text-[9px] font-mono text-[var(--tx4)] uppercase tracking-widest bg-[var(--bg-subtle)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                      {session.photoAssets?.length || 0} Supplemental Photos
                    </span>
                  </div>
                </div>

                <InspectionPhotoChecklist 
                  session={session}
                  onUpdate={onUpdate}
                />
              </section>
            </section>
          </div>

          {/* Right Column: Documentation & Summary */}
          <div className="xl:col-span-4 space-y-12">
            
            {/* Findings Intelligence Support */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border",
                  isHighContrast ? "bg-white border-black text-black" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                )}>
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-mono font-bold text-[var(--tx2)] uppercase tracking-[0.3em]">Findings Support</h2>
              </div>
              
              {/* Finding Categories Multi-Select */}
              <div className={cn("p-6 rounded-3xl border space-y-4",
                isHighContrast ? "bg-white border-black" : "bg-[var(--bg-surface)] border-[var(--border-color)]"
              )}>
                <p className="text-[9px] font-mono text-[var(--tx3)] uppercase tracking-[0.4em] pl-1 font-bold">Documented Damage Categories</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[9px] font-mono uppercase tracking-wider border transition-all",
                        findingCategories.includes(cat)
                          ? (isHighContrast 
                              ? "bg-black border-black text-white" 
                              : "bg-indigo-500 border-indigo-400 text-[#E8EDF8] shadow-[0_0_15px_rgba(99,102,241,0.3)]")
                          : (isHighContrast
                              ? "bg-white border-black/20 text-black/60 hover:border-black"
                              : "bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--tx3)] hover:border-white/20")
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <AIAssistSummary 
                findings={findingCategories}
                photosCount={session.photos?.length || 0}
                outcome={outcomeType || "no_damage"}
                internalNotes={internalNotes}
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
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border",
                  isHighContrast ? "bg-white border-black text-black" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                )}>
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-mono font-bold text-[var(--tx2)] uppercase tracking-[0.3em]">Homeowner Briefing</h2>
              </div>

              <div className={cn("p-8 rounded-[40px] border space-y-8 backdrop-blur-xl",
                isHighContrast ? "bg-white border-black text-black" : "bg-[var(--bg-surface)] border-[var(--border-color)]"
              )}>
                <div className="space-y-4">
                  <p className="text-[9px] font-mono text-[var(--tx3)] uppercase tracking-[0.4em] pl-1 font-bold">Executive Headline</p>
                  <input
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl py-5 px-6 text-[var(--tx1)] text-lg font-display placeholder:text-[var(--tx4)] outline-none focus:border-indigo-500/40 focus:bg-[var(--bg-base)] transition-all"
                    placeholder="E.g. Documented Storm Damage File"
                    value={headline}
                    onChange={(e) => { setHeadline(e.target.value); setErrors((err) => { const n = { ...err }; delete n.headline; return n; }); }}
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] font-mono text-[var(--tx3)] uppercase tracking-[0.4em] pl-1 font-bold">Technical Summary</p>
                  <textarea
                    className="w-full bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-3xl p-6 text-[var(--tx1)] text-sm font-light leading-relaxed placeholder:text-[var(--tx4)] outline-none focus:border-indigo-500/40 focus:bg-[var(--bg-base)] transition-all resize-none min-h-[160px] custom-scrollbar"
                    placeholder="Input detailed findings summary here..."
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setErrors((err) => { const n = { ...err }; delete n.body; return n; }); }}
                  />
                </div>
              </div>
            </section>

            {/* Supplemental Evidence Log (Legacy/General) */}
            <section className="space-y-8 mt-12 pt-12 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border",
                    isHighContrast ? "bg-white border-black text-black" : "bg-white/5 border-white/10 text-[var(--tx3)]"
                  )}>
                    <Upload className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-mono font-bold text-[var(--tx3)] uppercase tracking-[0.3em]">Supplemental Photos</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <label className={cn(
                  "h-24 rounded-3xl border border-dashed flex items-center justify-center gap-3 cursor-pointer transition-all duration-500 group overflow-hidden",
                  isHighContrast 
                    ? "bg-white border-black text-black hover:bg-black hover:text-white"
                    : "border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-indigo-500/30"
                )}>
                  <Upload className={cn("w-5 h-5", isHighContrast ? "text-inherit" : "text-[var(--tx4)] group-hover:text-indigo-400")} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold">Add Supplemental Photos</span>
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFileChange} />
                </label>

                {photoAssets.length > 0 && (
                  <Reorder.Group axis="y" values={photoAssets} onReorder={setPhotoAssets} className="space-y-3">
                    {photoAssets.map((photo) => (
                      <Reorder.Item 
                        key={photo.assetId} 
                        value={photo}
                        className={cn(
                          "group relative h-24 rounded-[28px] overflow-hidden border flex items-center gap-6 p-3 cursor-grab active:cursor-grabbing",
                          isHighContrast 
                            ? "bg-white border-black text-black" 
                            : "border-white/[0.05] bg-white/[0.03] text-[var(--tx1)]",
                          photo.isSensitive && "opacity-50 grayscale"
                        )}
                      >
                        <div className="w-20 h-full rounded-2xl overflow-hidden bg-black flex-shrink-0">
                          <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {photo.tags?.map(t => (
                              <span key={t} className="px-1.5 py-0.5 rounded-md bg-white/5 text-[7px] font-mono text-[var(--tx4)] uppercase tracking-widest">{t}</span>
                            ))}
                            {photo.isSensitive && <EyeOff className="w-3 h-3 text-rose-500" />}
                          </div>
                          <p className="text-[10px] font-display font-medium text-[var(--tx2)] truncate">{photo.caption}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {photo.severity && (
                              <div className="flex items-center gap-1">
                                <div className={cn("w-1 h-1 rounded-full", 
                                  photo.severity === 'critical' ? 'bg-rose-500' : 
                                  photo.severity === 'high' ? 'bg-amber-500' : 'bg-emerald-500'
                                )} />
                                <span className="text-[7px] font-mono text-[var(--tx4)] uppercase tracking-widest">{photo.severity}</span>
                              </div>
                            )}
                            <span className="text-[7px] font-mono text-[var(--tx4)] uppercase tracking-widest">
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
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Control Surface (Footer) */}
      <div className="absolute bottom-0 inset-x-0 px-4 md:px-10 pb-8 pt-12 md:pt-20 z-50 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/80 to-transparent pt-32 theme-graphic" />
        <div className={cn(
          "relative max-w-5xl mx-auto flex items-center justify-between gap-3 md:gap-8 pointer-events-auto p-4 rounded-3xl border",
          isHighContrast
            ? "bg-white border-black text-black"
            : "bg-[var(--bg-surface)]/90 border-[var(--border-color)] text-[var(--tx1)] backdrop-blur-md"
        )}>
          <button
            onClick={onBack}
            className={cn(
              "group flex items-center gap-2 md:gap-3 px-4 md:px-8 py-4 md:py-5 rounded-full border transition-all duration-300 shrink-0",
              isHighContrast
                ? "bg-white border-black text-black hover:bg-black hover:text-white"
                : "bg-white/10 border-white/20 hover:bg-white/20"
            )}
          >
            <ArrowLeft className={cn("w-4 h-4 group-hover:-translate-x-1 transition-transform", isHighContrast ? "text-black group-hover:text-white" : "text-[var(--tx1)]")} />
            <span className="text-sm font-display font-medium text-inherit">Back</span>
          </button>
          <div className="flex-1 flex flex-col gap-3">
            <button
              onClick={() => setRepConfirmed(!repConfirmed)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all duration-300 text-left",
                repConfirmed
                  ? "bg-indigo-500/10 border-indigo-500/30"
                  : "bg-white/[0.03] border-white/10 hover:border-white/20"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                repConfirmed ? "bg-indigo-500 border-indigo-500" : "border-white/30"
              )}>
                {repConfirmed && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={cn("text-xs font-mono uppercase tracking-widest", repConfirmed ? "text-[var(--tx1)]" : "text-[var(--tx3)]")}>
                I confirm these findings are accurate and ready for homeowner review
              </span>
            </button>
            <StarButton
              onClick={handleLock}
              disabled={!outcomeType || !repConfirmed}
              lightColor={isHighContrast ? "#000000" : "#FAFAFA"}
              backgroundColor={isHighContrast ? "#FFFFFF" : "#0A0A0A"}
              className={cn(
                "w-full h-14 md:h-20 rounded-[40px] transition-all duration-500 group border",
                (!outcomeType || !repConfirmed)
                  ? "opacity-20 grayscale cursor-not-allowed"
                  : "active:scale-95",
                isHighContrast
                  ? "border-black text-black"
                  : "shadow-[0_20px_60px_rgba(99,102,241,0.2)] border-[var(--border-color)]"
              )}
            >
              <div className="flex items-center justify-center gap-6">
                <div className="relative">
                  {Object.keys(errors).length > 0 ? (
                    <AlertCircle className="w-7 h-7 text-rose-500 animate-pulse" />
                  ) : (
                    <Lock className={cn("w-7 h-7 transition-colors", (outcomeType && repConfirmed) ? (isHighContrast ? "text-black" : "text-indigo-400") : "text-[var(--tx4)]")} />
                  )}
                </div>
                <span className="text-sm md:text-xl font-display font-medium tracking-wide">
                  {!outcomeType ? "Classification Required" : !repConfirmed ? "Confirmation Required" : "Finalize Report for Homeowner Review"}
                </span>
                <ChevronRight className={cn("w-6 h-6 group-hover:translate-x-1 transition-transform", isHighContrast ? "text-black" : "text-[var(--tx4)]")} />
              </div>
            </StarButton>
          </div>
        </div>
      </div>
    </div>
  );
}

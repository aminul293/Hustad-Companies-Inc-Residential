"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Zap, Wind, AlertCircle, Camera, CheckCircle2, ChevronDown,
  ChevronRight, RefreshCw, FileText, LayoutGrid,
  Users, Activity, Layers, BookOpen, Settings, Info, X, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INSPECTION_SHOT_LIST } from "@/lib/inspectionShotList";
import { AppWalkthrough } from "@/components/guide/AppWalkthrough";

// ── Workflow map data ─────────────────────────────────────────────────────────

const PHASE_A = [
  { id: "P00", label: "Command Center",          desc: "Select or create a session. Import jobs from the New Leads tab.",                              img: "/screenshots/P00_rep_launch.png" },
  { id: "A01", label: "Welcome",                 desc: "Greet the homeowner by name. Sets professional tone before the walkthrough.",                  img: "/screenshots/A01_welcome.png" },
  { id: "A02", label: "Why We Inspect",          desc: "Frame the purpose: documented evidence, not a sales pitch.",                                  img: "/screenshots/A02_why_inspection.png" },
  { id: "A03", label: "What We Inspect",         desc: "Three categories: Exterior, Roof Assembly, Storm Evidence.",                                   img: "/screenshots/A03_what_we_inspect.png" },
  { id: "A04", label: "How Findings Are Sorted", desc: "Explain the three outcome paths: Carrier Review, Urgent Repair, No Action.",                   img: "/screenshots/A04_how_findings_sorted.png" },
  { id: "A05", label: "Insurance Clarity",       desc: "Deductible, ACV vs. RCV; set accurate expectations before findings.",                         img: "/screenshots/A05_insurance_clarity.png" },
  { id: "A06", label: "Warranty Impact",         desc: "How storm damage affects existing manufacturer warranties.",                                   img: "/screenshots/A06_warranty_impact.png" },
  { id: "A07", label: "Why Hustad",              desc: "Credentials, restoration volume, and insurance expertise.",                                    img: "/screenshots/A07_why_hustad.png" },
  { id: "A08", label: "What You Receive",        desc: "Photo dossier, documented findings record, and next steps.",                                   img: "/screenshots/A08_what_you_receive.png" },
  { id: "A09", label: "Buyer Priorities",        desc: "Homeowner selects their top concerns to personalize the finding presentation.",                 img: "/screenshots/A09_buyer_priorities.png" },
  { id: "A11", label: "Innovation",              desc: "Hustad documentation technology and the inspection process." },
  { id: "A10", label: "Inspection Hold",         desc: "Pause here. Rep goes to the roof. Homeowner waits on this screen." },
];

const PHASE_B = [
  { id: "B11", label: "Findings Prep",       desc: "Rep privately reviews captured photos before presenting to homeowner." },
  { id: "B12", label: "Findings Summary",    desc: "Present documented storm damage with full photo evidence." },
  { id: "B13", label: "Recommended Path",    desc: "Rep recommends Carrier Review, Urgent Repair, or No Action based on evidence." },
  { id: "B14", label: "Path Decision",       desc: "Homeowner selects their preferred path with full understanding." },
  { id: "B15", label: "Urgent Protection",   desc: "If urgent repairs are needed: scope, timeline, and authorization." },
  { id: "B16", label: "System Options",      desc: "Material selections, package tiers, and upgrade options." },
  { id: "B17", label: "Agreement Summary",   desc: "Review full scope, terms, and pricing. Rep answers final questions." },
  { id: "B18", label: "Signature",           desc: "Digital signature capture on-device, or schedule a deferral appointment." },
  { id: "B19", label: "Next Steps",          desc: "Confirm adjuster appointment, production timeline, and follow-up contacts." },
];

// ── Shot list section config ──────────────────────────────────────────────────

const SHOT_META: Record<string, { icon: React.ElementType; color: string; bg: string; tip: string }> = {
  "General Exterior": {
    icon: Home, color: "text-indigo-400", bg: "bg-indigo-400/10",
    tip: "Shoot from the street / property edge. Capture the full plane: roof edge, siding, gutters, and any visible damage in one frame.",
  },
  "General Roof": {
    icon: Zap, color: "text-sky-400", bg: "bg-sky-400/10",
    tip: "Stand back enough to show full planes and slope. For assembly shots, get close enough to show shingle layers and substrate.",
  },
  "Hail and Wind": {
    icon: Wind, color: "text-rose-400", bg: "bg-rose-400/10",
    tip: "Angle shots to catch shadows in dents. Hail close-ups: get within 12 inches. Test squares: chalk the grid before shooting.",
  },
  "Urgent Repairs": {
    icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10",
    tip: "Document active leaks, exposed decking, or structural concerns. Note location and recommend immediate action in your session notes.",
  },
};

// ── Sync status data ──────────────────────────────────────────────────────────

const SYNC_STATUSES = [
  {
    label: "Synced",
    dot: "bg-green-400",
    border: "border-green-400/30",
    pulseColor: "bg-green-400",
    pulseSpeed: "2s",
    meaning: "Session data has been successfully written to CenterPoint. The rep's work is visible in the office pipeline.",
    action: "No action needed.",
  },
  {
    label: "Pending",
    dot: "bg-amber-400",
    border: "border-amber-400/30",
    pulseColor: "bg-amber-400",
    pulseSpeed: "1.2s",
    meaning: "Session is queued in the Outbound Queue and awaiting the next process cycle. This is normal directly after completing a session.",
    action: "Wait up to 15 minutes. If still pending, check connectivity and trigger a manual sync from the Command Center.",
  },
  {
    label: "Failed",
    dot: "bg-rose-400",
    border: "border-rose-400/30",
    pulseColor: "bg-rose-400",
    pulseSpeed: "0.7s",
    meaning: "Sync attempt failed. CenterPoint may be unreachable, or the record may have a conflict.",
    action: "Tap the retry icon in the session card. If it fails again, contact your manager. Do not start a new session for the same property.",
  },
];

// ── Troubleshooting items ─────────────────────────────────────────────────────

const TROUBLESHOOT = [
  {
    q: "Login fails and the screen just spins.",
    a: "The login redirects to Microsoft (Azure AD). Ensure your Hustad company email and password are current. If your account was recently set up, contact IT to confirm your Azure AD access is provisioned.",
  },
  {
    q: "Photos are stuck on 'uploading'.",
    a: "Check your iPad's cellular or Wi-Fi signal. Photos upload in the background; stay on the capture screen until each shows a green checkmark. If a photo shows a red error icon, tap it to retry.",
  },
  {
    q: "My session disappeared from the dashboard.",
    a: "Sessions are saved as drafts. Tap the Drafts tab in the Command Center. If the session isn't there, it may have been deleted due to a duplicate address. Contact your manager to restore.",
  },
  {
    q: "The homeowner signed but I don't see a confirmation.",
    a: "Complete the B19 Next Steps screen; this finalizes the session. If the screen will not advance, check that all required fields on B17/B18 are filled. The session must reach B19 to trigger the CenterPoint sync.",
  },
  {
    q: "CenterPoint Import shows no jobs.",
    a: "Jobs are pulled from CenterPoint on each refresh. Tap the refresh icon on the New Leads tab. If jobs that should be there are missing, ask your manager to verify the job is assigned to your rep ID in CenterPoint.",
  },
];

// ── Pipeline stage definitions ────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { label: "New Leads",     color: "text-hustad-tx3", desc: "Raw job synced from CenterPoint. Not yet worked by a rep." },
  { label: "Pipeline",      color: "text-sky-400",    desc: "Rep has added the job to their active pipeline. Calling, scheduling, or nurturing in progress." },
  { label: "Scheduled",     color: "text-indigo-400", desc: "Appointment confirmed. Appears on the Calendar view with date and time." },
  { label: "In Inspection", color: "text-amber-400",  desc: "Active tablet session in progress. Record is locked from duplicate entry until session completes." },
  { label: "Completed",     color: "text-green-400",  desc: "Session finalized (reached B19). Queued for CenterPoint sync." },
  { label: "Synced",        color: "text-teal-400",   desc: "Outbound queue confirmed receipt by CenterPoint. Visible in office pipeline." },
];

const MANAGER_ACTIONS = [
  {
    title: "Remove from Pipeline",
    risk: "safe",
    desc: "Resets a lead's inbox_status to 'new', returning it to the New Leads tab without deleting any CenterPoint data. Use when a lead was incorrectly added or the appointment was cancelled.",
  },
  {
    title: "Approve / Reject Inspection",
    risk: "safe",
    desc: "Managers receive an email with a review link (/review/[token]) after each completed session. Approve to trigger final sync, or reject with notes to send back to the rep for correction.",
  },
  {
    title: "Manual Sync Trigger",
    risk: "caution",
    desc: "The /api/centerpoint/process-queue endpoint can be called manually to flush pending sync records without waiting for the automated cron cycle. Use when a rep needs immediate confirmation.",
  },
  {
    title: "Override Inspection Lock",
    risk: "dev",
    desc: "Admin UI to force-unlock a record that is stuck in 'In Inspection' state (e.g., rep's device crashed mid-session). Currently in development; contact engineering to unlock manually.",
  },
];

// ── AI outcome data ───────────────────────────────────────────────────────────

const OUTCOMES = [
  {
    value: "no_damage",
    label: "No Damage",
    color: "text-[var(--tx3)]",
    dotColor: "bg-[var(--tx4)]",
    activeBg: "bg-[var(--bg-elevated)]",
    activeBorder: "border-[var(--tx4)]",
    pathLabel: "No Action",
    pathColor: "text-[var(--tx4)]",
    desc: "No meaningful damage indicators found. Property integrity is maintained. Recommend saving the documentation as a baseline for future reference.",
    signals: ["No visible impact marks", "Normal weathering for roof age", "Structural elements intact"],
    confidence: "Typically high. Clean result.",
  },
  {
    value: "monitor_only",
    label: "Monitor Only",
    color: "text-sky-400",
    dotColor: "bg-sky-400",
    activeBg: "bg-sky-400/5",
    activeBorder: "border-sky-400/40",
    pathLabel: "No Action, recheck in 6–12 months",
    pathColor: "text-sky-400",
    desc: "Minor wear consistent with aging; not storm-related. No immediate action needed. Schedule a free recheck in 6–12 months.",
    signals: ["Minor granule loss on older shingles", "Surface oxidation or fading", "Small isolated surface cracks"],
    confidence: "High. Aging pattern clearly distinguishable.",
  },
  {
    value: "repair_only",
    label: "Repair Only",
    color: "text-amber-400",
    dotColor: "bg-amber-400",
    activeBg: "bg-amber-400/5",
    activeBorder: "border-amber-400/40",
    pathLabel: "Direct Repair",
    pathColor: "text-amber-400",
    desc: "Localised damage present: cracked tabs, minor displacement, gutter holes, but below the threshold for an insurance claim. Quote a direct repair scope.",
    signals: ["Cracked or lifted shingles", "Gutter holes or loose downspouts", "Minor flashing separation"],
    confidence: "Moderate to high; item count drives urgentCount",
  },
  {
    value: "claim_review_candidate",
    label: "Claim Review Candidate",
    color: "text-orange-400",
    dotColor: "bg-orange-400",
    activeBg: "bg-orange-400/5",
    activeBorder: "border-orange-400/40",
    pathLabel: "Carrier Review",
    pathColor: "text-orange-400",
    desc: "Clear storm-related damage with hail bruising, granule loss, or metal impact marks consistent with a hail or wind event. Recommend carrier review before any out-of-pocket spend.",
    signals: ["Hail bruising on ridge cap or shingles", "Dents on aluminum gutter flashing", "Concentrated granule loss from impact"],
    confidence: "Moderate; verify with manual signal review",
  },
  {
    value: "full_restoration_candidate",
    label: "Full Restoration Candidate",
    color: "text-rose-400",
    dotColor: "bg-rose-400",
    activeBg: "bg-rose-400/5",
    activeBorder: "border-rose-400/40",
    pathLabel: "Full Restoration / Carrier Review",
    pathColor: "text-rose-400",
    desc: "Widespread damage across multiple slopes or surfaces: roof, siding, gutters, windows. Full system replacement pathway via carrier review.",
    signals: ["Multiple damaged roof planes", "Collateral siding or window impact", "Structural exposure or missing sections"],
    confidence: "High; requires broad photo coverage across all elevations",
  },
];

// ── Animation variants ────────────────────────────────────────────────────────

const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const staggerList = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  hidden: { opacity: 0, x: -16 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// ── Shared components ─────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={cardReveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-card"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-color)]">
        <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center">
          <Icon size={14} className="text-hustad-sky" />
        </div>
        <h2 className="font-display text-base font-semibold text-[var(--tx1)]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </motion.section>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "required" | "optional" | "dev" | "caution" }) {
  const styles = {
    default:  "bg-[var(--bg-elevated)] text-[var(--tx4)] border-[var(--border-color)]",
    required: "bg-sky-400/10 text-sky-300 border-sky-400/20",
    optional: "bg-[var(--bg-elevated)] text-[var(--tx4)] border-[var(--border-color)]",
    dev:      "bg-amber-400/10 text-amber-300 border-amber-400/20",
    caution:  "bg-orange-400/10 text-orange-300 border-orange-400/20",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border", styles[variant])}>
      {children}
    </span>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-[420px] w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-mono text-[var(--tx3)] uppercase tracking-widest">{label}</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--tx3)] hover:text-[var(--tx1)] transition-colors"
          >
            <X size={13} />
          </button>
        </div>
        <img
          src={src}
          alt={label}
          className="w-full rounded-2xl border border-[var(--border-color)] shadow-elevated"
        />
        <p className="text-center text-[10px] text-[var(--tx5)] mt-2 font-mono">Tap outside or press Esc to close</p>
      </motion.div>
    </motion.div>
  );
}

// ── StepList: animated numbered steps ───────────────────────────────────────

function StepList({ steps, color = "sky" }: {
  steps: Array<{ n: number; title: string; body: string }>;
  color?: "sky" | "teal";
}) {
  const ring = color === "sky"
    ? "bg-hustad-sky/10 border-hustad-sky/30 text-sky-400"
    : "bg-hustad-teal/10 border-hustad-teal/30 text-teal-400";

  return (
    <motion.ol
      variants={staggerList}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      className="space-y-4"
    >
      {steps.map(step => (
        <motion.li key={step.n} variants={staggerItem} className="flex gap-4">
          <span className={cn("w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 mt-0.5", ring)}>
            {step.n}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--tx1)]">{step.title}</p>
            <p className="text-xs text-[var(--tx3)] mt-0.5 leading-relaxed">{step.body}</p>
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
}

// ── PhaseStep: workflow step with optional thumbnail ─────────────────────────

function PhaseStep({ id, label, desc, phase, img }: { id: string; label: string; desc: string; phase: "A" | "B"; img?: string }) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      <div className="flex gap-2.5 pb-3">
        <div className="flex flex-col items-center pt-0.5">
          <span className={cn(
            "font-mono text-[9px] tracking-widest px-1.5 py-0.5 rounded border font-medium shrink-0",
            phase === "A"
              ? "text-sky-300 border-sky-400/30 bg-sky-400/10"
              : "text-teal-300 border-teal-400/30 bg-teal-400/10",
          )}>
            {id}
          </span>
          <div className="w-px flex-1 min-h-[16px] bg-[var(--border-color)] mt-1" />
        </div>
        {img && (
          <button
            onClick={() => setLightbox(true)}
            className="shrink-0 mt-0.5 rounded-md overflow-hidden border border-[var(--border-color)] hover:border-hustad-sky hover:shadow-[0_0_0_2px_rgba(74,143,212,0.25)] transition-all group"
            title="Click to enlarge"
          >
            <img
              src={img}
              alt={label}
              className="w-[60px] h-[44px] object-cover object-top group-hover:opacity-90 transition-opacity"
            />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--tx1)] leading-tight">{label}</p>
          <p className="text-xs text-[var(--tx3)] mt-0.5 leading-relaxed">{desc}</p>
          {img && (
            <button
              onClick={() => setLightbox(true)}
              className="text-[10px] text-hustad-sky mt-1 font-mono hover:underline"
            >
              Preview screen →
            </button>
          )}
        </div>
      </div>
      <AnimatePresence>
        {lightbox && img && (
          <Lightbox src={img} label={`${id}: ${label}`} onClose={() => setLightbox(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ── ShotListSection: animated accordion ─────────────────────────────────────

function ShotListSection({ section }: { section: (typeof INSPECTION_SHOT_LIST)[number] }) {
  const [open, setOpen] = useState(false);
  const meta = SHOT_META[section.title];
  const Icon = meta.icon;
  const required = section.items.filter(i => i.requiredCount > 0).length;
  const total = section.items.length;

  return (
    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors text-left"
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", meta.bg)}>
          <Icon size={15} className={meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--tx1)]">{section.title}</p>
          <p className="text-xs text-[var(--tx4)] mt-0.5">
            {total} shots &nbsp;·&nbsp; {required} required
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" as const }}
        >
          <ChevronDown size={15} className="text-[var(--tx4)]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" as const }}
            style={{ overflow: "hidden" }}
          >
            <div className="border-t border-[var(--border-color)] divide-y divide-[var(--border-color)]">
              <div className="px-4 py-2.5 flex gap-2 bg-[var(--bg-elevated)]">
                <Info size={12} className="text-[var(--tx4)] shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--tx3)] leading-relaxed">{meta.tip}</p>
              </div>
              {section.items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="px-4 py-3 flex gap-3 items-start"
                >
                  <div className="mt-0.5">
                    {item.requiredCount > 0 ? (
                      <CheckCircle2 size={13} className="text-sky-400" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-[var(--tx5)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-medium text-[var(--tx1)]">{item.label}</span>
                      {item.requiredCount > 0 ? (
                        <Badge variant="required">
                          {item.requiredCount > 1 ? `Min ${item.requiredCount}` : "Required"}
                        </Badge>
                      ) : (
                        <Badge variant="optional">Optional</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--tx3)] mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── TroubleshootItem: animated expand ────────────────────────────────────────

function TroubleshootItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3 text-left gap-3 group"
      >
        <p className="text-sm font-medium text-[var(--tx2)] group-hover:text-[var(--tx1)] transition-colors">{q}</p>
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" as const }}
        >
          <ChevronRight size={14} className="text-[var(--tx4)] shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" as const }}
            style={{ overflow: "hidden" }}
          >
            <p className="text-xs text-[var(--tx3)] leading-relaxed pb-3 pr-6">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── OutcomeExplorer: interactive AI classification explorer ──────────────────

function OutcomeExplorer() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div>
      {/* Severity gradient bar */}
      <div className="mb-4 space-y-1.5">
        <div className="flex justify-between text-[9px] font-mono text-[var(--tx5)] uppercase tracking-widest">
          <span>Low severity</span>
          <span>High severity</span>
        </div>
        <div
          className="h-1.5 rounded-full"
          style={{ background: "linear-gradient(to right, #3d5a80, #4a8fd4, #c8923a, #f97316, #e11d48)" }}
        />
        <div className="flex justify-between">
          {OUTCOMES.map(o => (
            <div key={o.value} className={cn("w-1.5 h-1.5 rounded-full", o.dotColor)} />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {OUTCOMES.map(o => {
          const isActive = active === o.value;
          return (
            <div
              key={o.value}
              className={cn(
                "rounded-xl border cursor-pointer transition-all duration-200",
                isActive ? cn(o.activeBg, o.activeBorder) : "border-[var(--border-color)] hover:border-[var(--tx5)]"
              )}
              onClick={() => setActive(isActive ? null : o.value)}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", o.dotColor)} />
                  <span className={cn("font-mono text-xs font-semibold", o.color)}>{o.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {!isActive && (
                    <span className="text-[10px] font-mono text-[var(--tx5)] hidden sm:block">
                      → {o.pathLabel}
                    </span>
                  )}
                  <motion.div
                    animate={{ rotate: isActive ? 180 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" as const }}
                  >
                    <ChevronDown size={12} className="text-[var(--tx4)]" />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" as const }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-3 pb-3 pt-3 border-t border-[var(--border-color)] space-y-3">
                      <p className="text-xs text-[var(--tx3)] leading-relaxed">{o.desc}</p>

                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--tx5)] mb-1.5">Typical AI-detected signals</p>
                        <div className="space-y-1">
                          {o.signals.map(s => (
                            <div key={s} className="flex gap-2 items-center">
                              <ChevronRight size={10} className={cn("shrink-0", o.color)} />
                              <span className="text-xs text-[var(--tx3)]">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 border-t border-[var(--border-color)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--tx5)]">Confidence</span>
                          <span className="text-[10px] text-[var(--tx4)]">{o.confidence}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--tx5)]">Path</span>
                          <span className={cn("text-[10px] font-mono font-semibold", o.pathColor)}>{o.pathLabel}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[var(--tx5)] text-center mt-3 font-mono">Tap any classification to expand</p>
    </div>
  );
}

// ── SyncStatusCard: pulsing dot ──────────────────────────────────────────────

function SyncStatusCard({ s, i }: { s: typeof SYNC_STATUSES[number]; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.1, duration: 0.35, ease: "easeOut" as const }}
      className={cn("rounded-xl border p-4", s.border)}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="relative w-2.5 h-2.5 shrink-0">
          <span
            className={cn("absolute inset-0 rounded-full animate-ping opacity-40", s.pulseColor)}
            style={{ animationDuration: s.pulseSpeed }}
          />
          <span className={cn("relative block w-2.5 h-2.5 rounded-full", s.dot)} />
        </div>
        <span className="text-sm font-semibold text-[var(--tx1)]">{s.label}</span>
      </div>
      <p className="text-xs text-[var(--tx3)] leading-relaxed">{s.meaning}</p>
      <p className="text-xs text-[var(--tx2)] font-medium mt-1.5">{s.action}</p>
    </motion.div>
  );
}

// ── PipelineStageRow: hover shift ────────────────────────────────────────────

function PipelineStageRow({ stage, i }: { stage: typeof PIPELINE_STAGES[number]; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.06, duration: 0.32, ease: "easeOut" as const }}
      whileHover={{ x: 5, transition: { duration: 0.15 } }}
      className="flex gap-3 items-start p-3 rounded-xl border border-[var(--border-color)] hover:border-[var(--tx5)] cursor-default transition-colors"
    >
      <span className={cn("font-mono text-xs font-semibold w-28 shrink-0 pt-0.5", stage.color)}>
        {stage.label}
      </span>
      <p className="text-xs text-[var(--tx3)] leading-relaxed">{stage.desc}</p>
    </motion.div>
  );
}

// ── Rep Guide ─────────────────────────────────────────────────────────────────

function RepGuide() {
  return (
    <div className="space-y-6">

      {/* 1: Workflow Map */}
      <SectionCard title="Your Workflow at a Glance" icon={Layers}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-5">
          Every appointment follows this fixed sequence. Phase A runs while the homeowner watches; you are presenting and building trust.
          At the Inspection Hold screen you step away to the roof. Phase B begins when you return with documented findings.
        </p>
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-sky-400 mb-3">Phase A: Presentation</p>
            <div>
              {PHASE_A.map(s => <PhaseStep key={s.id} {...s} phase="A" />)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-teal-400 mb-3">Phase B: Findings & Close</p>
            <div>
              {PHASE_B.map(s => <PhaseStep key={s.id} {...s} phase="B" />)}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 2: Starting a Session */}
      <SectionCard title="Starting a Session" icon={BookOpen}>
        <StepList steps={[
          { n: 1, title: "Open the Command Center",        body: "Navigate to /rep. You will land on the Rep Command Center. If prompted, sign in with your Hustad Microsoft account." },
          { n: 2, title: "Import from CenterPoint or create manually", body: "Tap the New Leads tab to see jobs assigned to you in CenterPoint. Tap a job row to prefill the session with the homeowner's address and contact info. For walk-up appointments, tap New Session and enter details manually." },
          { n: 3, title: "Verify homeowner information",   body: "Confirm the name, address, and contact number before advancing. The homeowner name appears on the Welcome screen (A01); an incorrect name undermines trust at the first moment." },
          { n: 4, title: "Hand the iPad to start Phase A", body: "Tap Continue on P00. The Welcome screen (A01) loads. You are now live. Proceed through Phase A with the homeowner present." },
        ]} />
      </SectionCard>

      {/* 3: Shot List */}
      <SectionCard title="The Inspection Shot List" icon={Camera}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-4">
          Every inspection requires a complete, consistent set of photos across four categories. Required shots (
          <CheckCircle2 size={11} className="inline text-sky-400 mx-0.5" />
          ) must be captured before the session can be submitted. Optional shots strengthen the insurance claim; capture them whenever present.
        </p>
        <div className="space-y-2">
          {INSPECTION_SHOT_LIST.map(section => (
            <ShotListSection key={section.title} section={section} />
          ))}
        </div>
      </SectionCard>

      {/* 4: AI Photo Classification */}
      <SectionCard title="AI Photo Classification" icon={Sparkles}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-4">
          After you return from the roof, the app can analyze your inspection photos and automatically suggest the outcome classification, damage counts, headline, and per-photo captions, powered by GPT-4o Vision.
          You review the suggestion and apply it; the app never locks in an outcome without your confirmation.
        </p>

        <div className="mb-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-sky-400 mb-3">How to Use It</p>
          <StepList steps={[
            { n: 1, title: "Capture all inspection photos first",  body: "Complete the shot list during the B-phase inspection. The AI analyses every photo you have uploaded; more photos produce a more confident result." },
            { n: 2, title: "Open Findings Prep (B11)",             body: "Return to the tablet after the roof walk. The Findings Prep screen is the first B-phase step where you summarise what you found." },
            { n: 3, title: "Tap \"Auto-classify\"",                body: "The button shows how many photos are ready (e.g. \"Auto-classify from 14 photos\"). Tapping it sends all photos to GPT-4o Vision. The request takes 5–15 seconds." },
            { n: 4, title: "Review the AI result card",            body: "A result card appears showing the suggested classification, a confidence score (0–100), a one-line headline, 2–3 sentences of reasoning, and specific damage signals observed." },
            { n: 5, title: "Tap \"Apply\" to populate the form",   body: "Applying fills in: Outcome Type, Urgent / Storm / Monitor counts, Summary Headline, Summary Body, matched Damage Categories, and per-photo captions." },
            { n: 6, title: "Confirm and proceed",                  body: "Check the \"I have reviewed the findings\" box. The Finalize button unlocks only after your confirmation; the AI suggestion never bypasses your professional judgement." },
          ]} />
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-sky-400 mb-3">The 5 Outcome Classifications</p>
          <OutcomeExplorer />
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--tx4)] mb-2">Tips</p>
          {[
            "Low-light or blurry photos reduce confidence. Retake any unclear shots before classifying.",
            "The AI writes a unique caption for every photo; review them before sharing the homeowner dossier.",
            "If the confidence score is below 50, the reasoning will explain why. Use your own judgement and edit freely.",
            "You can re-run Auto-classify at any time before finalising; the latest result always replaces the previous one.",
          ].map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="flex gap-2 items-start"
            >
              <CheckCircle2 size={11} className="text-sky-400 shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--tx3)] leading-relaxed">{tip}</p>
            </motion.div>
          ))}
        </div>
      </SectionCard>

      {/* 6: Sync Status */}
      <SectionCard title="Sync & Status Reference" icon={RefreshCw}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-4">
          After completing a session, your data moves through an Outbound Queue before reaching CenterPoint. Each status below tells you exactly where it stands.
        </p>
        <div className="space-y-3">
          {SYNC_STATUSES.map((s, i) => (
            <SyncStatusCard key={s.label} s={s} i={i} />
          ))}
        </div>
      </SectionCard>

      {/* 7: Pipeline Stage Reference */}
      <SectionCard title="Pipeline Stage Reference" icon={LayoutGrid}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-4">
          Your leads move through these stages in order. Knowing where a job stands helps you prioritize calls, avoid duplicate entries, and understand what the office can see.
        </p>
        <div className="space-y-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <PipelineStageRow key={stage.label} stage={stage} i={i} />
          ))}
        </div>
      </SectionCard>

      {/* 8: Reviewing Submitted Inspections */}
      <SectionCard title="Reviewing Submitted Inspections" icon={FileText}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-4">
          After you complete a session (B19 Next Steps), your manager receives a review email. Here is what happens on their end, and what to expect back.
        </p>
        <StepList steps={[
          { n: 1, title: "Manager receives the review email", body: "An automatic email is sent to your manager with a secure one-time link to the full session record: your photos, findings, path selection, and agreement details." },
          { n: 2, title: "Manager approves or rejects",       body: "If approved, the session is marked complete and synced to CenterPoint. If rejected, you will see a rejection notice and correction notes in your Command Center session card." },
          { n: 3, title: "If your session is rejected",       body: "Open the session from your Drafts tab. Review the manager's notes, correct the flagged items (usually missing photos or an incomplete agreement), then resubmit by completing B19 again." },
          { n: 4, title: "Confirming sync",                   body: "Once approved, the session status in your Command Center will change from Pending to Synced within 15 minutes. That confirms the office can see the completed record in CenterPoint." },
        ]} />
      </SectionCard>

      {/* 9: Troubleshooting */}
      <SectionCard title="Troubleshooting" icon={AlertCircle}>
        <div className="divide-y divide-[var(--border-color)]">
          {TROUBLESHOOT.map((item, i) => (
            <TroubleshootItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </SectionCard>

    </div>
  );
}

// ── Manager Guide ─────────────────────────────────────────────────────────────

function ManagerGuide() {
  return (
    <div className="space-y-6">

      {/* 1: Pipeline Overview */}
      <SectionCard title="Pipeline Stage Reference" icon={LayoutGrid}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-4">
          Every lead moves linearly through these stages. The Command Center view for each rep reflects this lifecycle in real time.
        </p>
        <div className="space-y-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <PipelineStageRow key={stage.label} stage={stage} i={i} />
          ))}
        </div>
      </SectionCard>

      {/* 2: Reviewing Inspections */}
      <SectionCard title="Reviewing Submitted Inspections" icon={FileText}>
        <StepList color="teal" steps={[
          { n: 1, title: "Receive the review email",  body: "When a rep completes a session (reaches B19), an email is automatically sent to the manager on file. It contains a secure one-time review link." },
          { n: 2, title: "Open the review link",      body: "The link navigates to /review/[token]. This page displays the full session: homeowner info, all captured photos organized by category, path selection, and agreement details." },
          { n: 3, title: "Approve or reject",         body: "Tap Approve to confirm the session is complete and trigger the final CenterPoint sync. Tap Reject to send the session back to the rep with required correction notes. The rep sees the rejection reason in their Command Center." },
          { n: 4, title: "Confirm sync",              body: "After approval, the session status changes to Synced within 15 minutes (or immediately if the process-queue endpoint is triggered manually). Verify in the CenterPoint Opportunities tab." },
        ]} />
      </SectionCard>

      {/* 3: Outbound Queue */}
      <SectionCard title="CenterPoint Sync & Outbound Queue" icon={Activity}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-4">
          All completed sessions pass through a Retry-Safe Outbound Queue before reaching CenterPoint. This prevents data loss during connectivity gaps.
        </p>
        <div className="space-y-3 mb-5">
          {[
            { status: "pending", dot: "bg-amber-400", pulseColor: "bg-amber-400", pulseSpeed: "1.2s", border: "border-amber-400/30", desc: "Session is queued. Waiting for the next process cycle (every 15 min via cron)." },
            { status: "synced",  dot: "bg-green-400",  pulseColor: "bg-green-400",  pulseSpeed: "2s",   border: "border-green-400/30",  desc: "CenterPoint confirmed receipt. Data is live in the office system." },
            { status: "failed",  dot: "bg-rose-400",   pulseColor: "bg-rose-400",   pulseSpeed: "0.7s", border: "border-rose-400/30",   desc: "Sync failed after retry attempts. Requires manual intervention." },
          ].map((q, i) => (
            <motion.div
              key={q.status}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className={cn("flex gap-3 items-center p-3 rounded-xl border", q.border)}
            >
              <div className="relative w-2.5 h-2.5 shrink-0">
                <span className={cn("absolute inset-0 rounded-full animate-ping opacity-40", q.pulseColor)} style={{ animationDuration: q.pulseSpeed }} />
                <span className={cn("relative block w-2.5 h-2.5 rounded-full", q.dot)} />
              </div>
              <span className="font-mono text-xs text-[var(--tx1)] w-16 shrink-0">{q.status}</span>
              <p className="text-xs text-[var(--tx3)]">{q.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs font-semibold text-[var(--tx2)] mb-1">Manual sync trigger</p>
          <p className="text-xs text-[var(--tx3)] leading-relaxed">
            Call <code className="font-mono text-sky-300 bg-sky-400/10 px-1.5 py-0.5 rounded text-[11px]">POST /api/centerpoint/process-queue</code> to
            flush all pending records immediately without waiting for the cron cycle. Requires manager-level authentication.
          </p>
        </div>
      </SectionCard>

      {/* 4: Admin Actions */}
      <SectionCard title="Admin Actions Reference" icon={Settings}>
        <p className="text-xs text-[var(--tx3)] leading-relaxed mb-4">
          The actions below modify pipeline state. All are logged in the audit trail.
        </p>
        <div className="space-y-3">
          {MANAGER_ACTIONS.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="p-4 rounded-xl border border-[var(--border-color)]"
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <p className="text-sm font-semibold text-[var(--tx1)]">{action.title}</p>
                {action.risk === "safe"    && <Badge variant="default">Safe</Badge>}
                {action.risk === "caution" && <Badge variant="caution">Use With Care</Badge>}
                {action.risk === "dev"     && <Badge variant="dev">In Development</Badge>}
              </div>
              <p className="text-xs text-[var(--tx3)] leading-relaxed">{action.desc}</p>
            </motion.div>
          ))}
        </div>
      </SectionCard>

      {/* 5: Rep Management */}
      <SectionCard title="Rep Management" icon={Users}>
        <div className="space-y-3">
          {[
            {
              title: "Adding a new rep",
              body: "Reps are provisioned via Azure AD. Once a Hustad email account is created in Microsoft Entra, the rep can sign in immediately. Rep identity (name, territory) is pulled from the Azure AD profile.",
            },
            {
              title: "Removing a rep",
              body: "Disable or remove the rep's Microsoft account in Azure AD. Their existing sessions and completed records remain in the database. Active drafts will become inaccessible to the rep on next login.",
            },
            {
              title: "Custom rep entries",
              body: "Managers can add custom rep identities via the RepCommandCenter settings (gear icon). Custom reps are stored locally in Supabase and are not linked to Azure AD; use for contract or temporary reps only.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="p-4 rounded-xl border border-[var(--border-color)]"
            >
              <p className="text-sm font-semibold text-[var(--tx1)] mb-1">{item.title}</p>
              <p className="text-xs text-[var(--tx3)] leading-relaxed">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </SectionCard>

    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const { status } = useSession();
  const [tab, setTab] = useState<"reps" | "managers">("reps");

  const qaMode = process.env.NEXT_PUBLIC_QA_MODE === "true";

  useEffect(() => {
    if (!qaMode && status === "unauthenticated") {
      signIn("azure-ad", { callbackUrl: "/guide" });
    }
  }, [status, qaMode]);

  if (!qaMode && status !== "authenticated") {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-hustad-sky border-t-transparent animate-spin" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--tx4)]">
          {status === "loading" ? "Loading…" : "Redirecting to sign in…"}
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-[var(--bg-base)] text-[var(--tx1)]">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" as const }}
            className="flex items-center justify-between py-4"
          >
            <div className="flex items-center gap-4">
              <img
                src="/logo.svg"
                alt="Hustad Companies"
                className="h-7 w-auto dark:invert opacity-90"
              />
              <div className="w-px h-5 bg-[var(--border-color)]" />
              <p className="text-xs font-mono uppercase tracking-widest text-[var(--tx4)]">
                Platform User Guide
              </p>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--tx4)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded-full">
              v1.0
            </span>
          </motion.div>

          {/* Tab bar with animated indicator */}
          <div className="flex gap-1 -mb-px">
            {(["reps", "managers"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-medium transition-colors",
                  tab === t ? "text-[var(--tx1)]" : "text-[var(--tx4)] hover:text-[var(--tx2)]"
                )}
              >
                {tab === t && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-hustad-sky rounded-t-full"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                {t === "reps" ? "For Field Reps" : "For Managers"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* App walkthrough */}
      <div className="max-w-3xl mx-auto px-6 pt-6">
        <AppWalkthrough />
      </div>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" as const }}
          >
            {tab === "reps" ? <RepGuide /> : <ManagerGuide />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-6 pb-12 pt-2">
        <p className="text-center text-xs text-[var(--tx5)] font-mono">
          Hustad Companies Inc. · Residential Division · Internal Use Only
        </p>
      </footer>
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Camera, CheckCircle2, RotateCcw, ChevronRight,
  ArrowLeft, Home, Zap, Wind, Loader2, AlertCircle, Upload, Tablet, Ban, Undo2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INSPECTION_SHOT_LIST, ShotListItem } from "@/lib/inspectionShotList";
import { compressImage } from "@/lib/images";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CapturedLocal {
  category: string;
  previewUrl: string;
  status: "uploading" | "done" | "error";
}

interface CaptureOverlay {
  item: ShotListItem;
  sectionLabel: string;
  step: "guide" | "preview";
  previewUrl?: string;
  previewFile?: File;
}

// ── Section meta ──────────────────────────────────────────────────────────────

const SECTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "Roof Inspection Photos": { label: "Roof",       icon: Home, color: "text-indigo-400" },
  "Storm Inspection":       { label: "Storm",      icon: Zap,  color: "text-sky-400"    },
  "Hail/Wind Shot List":    { label: "Hail & Wind",icon: Wind, color: "text-rose-400"   },
};

const CAPTURE_HINTS: Record<string, string> = {
  general_observations:     "Step back. Capture the full roof slope from eave to ridge.",
  membrane_shingle_condition:"Fill the frame with the shingle surface. Granule loss or splits should be clear.",
  edge_metal_detail:        "Photograph along the drip edge or gutter apron — show dents or separation.",
  roof_assembly_core_cut:   "Show all layers clearly: felt, substrate, shingles.",
  eave_edge_detail:         "Lift the first course slightly to show the underlayment at the eave.",
  roof_to_wall_detail:      "Focus on counter flashing and any gaps where the roof meets the wall.",
  headwall_flashing:        "Show the full headwall flashing width — rust, gaps, or lifting.",
  roof_penetrations:        "Pipe boots, chimney base, any penetration. Focus on the seal.",
  roof_ventilation:         "Ridge vents or box vents — show dents, crushed louvers, or debris.",
  non_storm_deficiencies:   "Document wear not related to the storm. Keep separate from damage.",
  test_squares:             "Show the full chalk outline of the 10×10 ft test square.",
  best_hail_hit_closeups:   "Get within 12 inches. Each impact should fill 25% of the frame.",
  collateral_damage:        "AC units, fences, siding — any non-roof storm impact.",
  test_square_hits_circled: "Circle every hit with chalk. Photograph the entire square.",
  hip_ridge_hits:           "Impacts on ridge or hip cap — high-value insurance evidence.",
  soft_metal_dents:         "Turtle vents, box vents, skylight frames. Angle to catch the shadows.",
  siding_paint_damage:      "Chips or cracks in siding/trim. Include a coin for scale if possible.",
  gutters_downspouts_damage:"Dents, bends, or detachment along the gutter and downspout.",
  broken_glass_casings:     "Cracked panes or damaged window frames from arm's length.",
  vehicle_damage:           "Whole vehicle first, then close-up of individual dents.",
};

// ── Main page component ───────────────────────────────────────────────────────

function RepCaptureInner() {
  const params = useSearchParams();
  const sessionId = params.get("s");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [overlay, setOverlay] = useState<CaptureOverlay | null>(null);
  const [captured, setCaptured] = useState<CapturedLocal[]>([]);
  const [naCategories, setNaCategories] = useState<Set<string>>(new Set());
  const [sessionAddress, setSessionAddress] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const overlayRef = useRef<CaptureOverlay | null>(null);
  overlayRef.current = overlay;

  // Load basic session info for display
  useEffect(() => {
    if (!sessionId) { setLoadError("No session ID in URL."); setLoading(false); return; }
    fetch(`/api/session?sessionId=${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.property?.address) setSessionAddress(data.property.address);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  // Stats
  const totalRequired = INSPECTION_SHOT_LIST.reduce(
    (s, sec) => s + sec.items.reduce((is, i) => is + i.requiredCount, 0), 0
  );
  const photosUploaded = captured.filter(c => c.status === "done").length;
  const naCount = naCategories.size;
  const effectiveRequired = Math.max(0, totalRequired - naCount);
  const doneCount = photosUploaded; // only real photos, used for display
  const pct = effectiveRequired > 0 ? Math.min(100, Math.round((photosUploaded / effectiveRequired) * 100)) : 100;

  const toggleNa = useCallback((categoryId: string) => {
    setNaCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const capturedForCategory = useCallback((categoryId: string) =>
    captured.filter(c => c.category === categoryId), [captured]);

  // Open capture overlay
  const openCapture = useCallback((item: ShotListItem, sectionLabel: string) => {
    setOverlay({ item, sectionLabel, step: "guide" });
  }, []);

  // File selected
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !overlayRef.current) return;
    const url = URL.createObjectURL(file);
    setOverlay(prev => prev ? { ...prev, step: "preview", previewUrl: url, previewFile: file } : null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Retake
  const handleRetake = useCallback(() => {
    if (overlayRef.current?.previewUrl) URL.revokeObjectURL(overlayRef.current.previewUrl);
    setOverlay(prev => prev ? { ...prev, step: "guide", previewUrl: undefined, previewFile: undefined } : null);
    setTimeout(() => fileInputRef.current?.click(), 80);
  }, []);

  // Accept & upload
  const handleAccept = useCallback(async () => {
    const ov = overlayRef.current;
    if (!ov?.previewFile || !sessionId) return;

    const { previewFile: file, previewUrl, item } = ov;
    const tempEntry: CapturedLocal = {
      category: item.id,
      previewUrl: previewUrl!,
      status: "uploading",
    };

    setCaptured(prev => [...prev, tempEntry]);
    setOverlay(null);

    // Compress then upload
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImage(reader.result as string, 1200, 0.8);
        const blob = await fetch(compressed).then(r => r.blob());
        const uploadFile = new File([blob], `${item.id}.jpg`, { type: "image/jpeg" });

        const form = new FormData();
        form.append("file", uploadFile);
        form.append("session_id", sessionId);
        form.append("category", item.id);
        form.append("label", item.label);
        form.append("section", item.section);

        const res = await fetch("/api/rep-upload", { method: "POST", body: form });

        setCaptured(prev =>
          prev.map(c =>
            c === tempEntry ? { ...c, status: res.ok ? "done" : "error" } : c
          )
        );
      } catch {
        setCaptured(prev => prev.map(c => c === tempEntry ? { ...c, status: "error" } : c));
      }
    };
    reader.readAsDataURL(file);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!sessionId || loadError) {
    return (
      <div className="min-h-screen bg-[#060606] flex flex-col items-center justify-center px-8 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <p className="text-white font-display text-xl">Invalid session link</p>
        <p className="text-white/40 text-sm">{loadError || "Ask your rep for the correct link."}</p>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <div className="min-h-screen bg-[#060606] pb-24">
        {/* ── Header ── */}
        <div className="sticky top-0 z-40 bg-[#060606]/95 backdrop-blur-xl border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.3em]">Rep Camera</p>
              <p className="text-sm font-display font-medium text-white mt-0.5 truncate max-w-[220px]">
                {sessionAddress || "Loading…"}
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-2xl font-display font-bold",
                pct === 100 ? "text-emerald-400" : "text-indigo-400"
              )}>{pct}%</span>
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mt-0.5">
                {photosUploaded}/{effectiveRequired}
                {naCount > 0 && <span className="text-white/15"> +{naCount}n/a</span>}
              </p>
            </div>
          </div>
          <div className="h-1 bg-white/[0.05] rounded-full mt-3 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-emerald-500" : "bg-indigo-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* ── Shot sections ── */}
        <div className="px-4 pt-6 space-y-6">
          {INSPECTION_SHOT_LIST.map(section => {
            const meta = SECTION_META[section.title];
            const SIcon = meta?.icon ?? Camera;

            return (
              <div key={section.title} className="space-y-2">
                <div className="flex items-center gap-2 px-1 mb-3">
                  <SIcon className={cn("w-4 h-4", meta?.color ?? "text-white/40")} />
                  <span className="text-xs font-mono text-white/40 uppercase tracking-[0.25em]">
                    {meta?.label ?? section.title}
                  </span>
                </div>

                {section.items.map(item => {
                  const mine = capturedForCategory(item.id);
                  const itemDone = mine.filter(c => c.status === "done").length;
                  const uploading = mine.some(c => c.status === "uploading");
                  const hasError = mine.some(c => c.status === "error");
                  const isNa = naCategories.has(item.id);
                  const isComplete = item.requiredCount > 0 && itemDone >= item.requiredCount;
                  const isOptional = item.requiredCount === 0;
                  const needed = Math.max(0, item.requiredCount - itemDone);

                  return (
                    <div key={item.id} className={cn(
                      "rounded-2xl border p-4 transition-all",
                      isNa ? "bg-white/[0.015] border-white/[0.04] opacity-50"
                        : isComplete ? "bg-emerald-500/[0.05] border-emerald-500/20"
                        : hasError ? "bg-rose-500/[0.05] border-rose-500/20"
                        : isOptional ? "bg-white/[0.015] border-white/[0.04]"
                        : "bg-white/[0.025] border-white/[0.08]"
                    )}>
                      <div className="flex items-start gap-3">
                        {/* Status icon */}
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          isNa ? "bg-white/[0.04]"
                            : isComplete ? "bg-emerald-500/20"
                            : uploading ? "bg-indigo-500/20"
                            : hasError ? "bg-rose-500/20"
                            : "bg-white/[0.06]"
                        )}>
                          {isNa ? <Ban className="w-4 h-4 text-white/20" />
                            : isComplete ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            : uploading ? <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            : hasError ? <AlertCircle className="w-4 h-4 text-rose-400" />
                            : <Camera className={cn("w-4 h-4", isOptional ? "text-white/20" : "text-white/40")} />
                          }
                        </div>

                        {/* Label + description */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium leading-snug",
                            isNa ? "text-white/25 line-through"
                              : isComplete ? "text-white/60"
                              : isOptional ? "text-white/30"
                              : "text-white/90"
                          )}>
                            {item.label}
                          </p>
                          {!isNa && (
                            <p className="text-[11px] text-white/25 mt-0.5 leading-relaxed">{item.description}</p>
                          )}
                          {isNa && (
                            <p className="text-[10px] font-mono text-white/20 mt-0.5 uppercase tracking-widest">Not on this roof</p>
                          )}

                          {/* Thumbnails */}
                          {!isNa && mine.length > 0 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {mine.map((c, i) => (
                                <div key={i} className="relative w-14 h-14">
                                  <img src={c.previewUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                                  <div className={cn(
                                    "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#060606] flex items-center justify-center",
                                    c.status === "done" ? "bg-emerald-500"
                                      : c.status === "uploading" ? "bg-indigo-500"
                                      : "bg-rose-500"
                                  )}>
                                    {c.status === "uploading"
                                      ? <Loader2 className="w-2 h-2 text-white animate-spin" />
                                      : c.status === "done"
                                      ? <CheckCircle2 className="w-2 h-2 text-white" />
                                      : <AlertCircle className="w-2 h-2 text-white" />
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {/* Capture / Add button */}
                          {!uploading && !isNa && (
                            <button
                              onClick={() => openCapture(item, meta?.label ?? section.title)}
                              className={cn(
                                "flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all active:scale-95",
                                isComplete
                                  ? "bg-white/[0.05] text-white/30 hover:bg-white/10"
                                  : isOptional
                                  ? "bg-white/[0.04] text-white/20 hover:bg-white/[0.08]"
                                  : "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-600"
                              )}
                            >
                              <Camera className="w-4 h-4" />
                              {isComplete ? "Add" : hasError ? "Retry" : needed > 1 ? `Photo (${needed})` : "Capture"}
                            </button>
                          )}

                          {/* N/A toggle — only on required items that aren't complete */}
                          {!isOptional && !isComplete && !uploading && (
                            <button
                              onClick={() => toggleNa(item.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all active:scale-95 text-white/20 hover:text-white/50"
                            >
                              {isNa
                                ? <><Undo2 className="w-3 h-3" /> Undo</>
                                : <><Ban className="w-3 h-3" /> N/A</>
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sticky done button — always visible at bottom once any photos taken */}
        {doneCount > 0 && (
          <div className="mx-4 mt-6 mb-2">
            <button
              onClick={() => setDone(true)}
              className={cn(
                "w-full h-14 rounded-2xl font-display font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                pct === 100
                  ? "bg-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                  : "bg-white/[0.08] border border-white/[0.12] text-white/60"
              )}
            >
              <CheckCircle2 className="w-5 h-5" />
              {pct === 100 ? "Done — All Photos Captured" : `Done for Now (${photosUploaded}/${effectiveRequired} photos)`}
            </button>
          </div>
        )}
      </div>

      {/* ── Full-screen done state ── */}
      {done && (
        <div className="fixed inset-0 z-[300] bg-[#060606] flex flex-col items-center justify-center px-8 text-center">
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mb-8",
            pct === 100 ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-indigo-500/15 border border-indigo-500/25"
          )}>
            {pct === 100
              ? <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              : <Tablet className="w-10 h-10 text-indigo-400" />
            }
          </div>

          <p className={cn(
            "text-[11px] font-mono uppercase tracking-[0.3em] mb-3",
            pct === 100 ? "text-emerald-400/70" : "text-indigo-400/70"
          )}>
            {pct === 100 ? "Capture complete" : "Photos uploaded"}
          </p>

          <h2 className="text-2xl font-display font-medium text-white mb-3">
            {pct === 100
              ? "All shots captured."
              : `${photosUploaded} of ${effectiveRequired} photos uploaded.`}
          </h2>

          <p className="text-sm text-white/40 font-light leading-relaxed max-w-xs mb-10">
            {pct === 100
              ? `All ${photosUploaded} photo${photosUploaded !== 1 ? "s" : ""} uploaded successfully.${naCount > 0 ? ` ${naCount} item${naCount !== 1 ? "s" : ""} marked N/A.` : ""} Switch to the tablet to continue the inspection.`
              : `${photosUploaded} photo${photosUploaded !== 1 ? "s" : ""} uploaded so far.${naCount > 0 ? ` ${naCount} item${naCount !== 1 ? "s" : ""} marked N/A.` : ""} Go back to capture more, or switch to the tablet to continue.`}
          </p>

          <div className="w-full max-w-xs space-y-3">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center gap-3">
              <Tablet className="w-5 h-5 text-white/30 shrink-0" />
              <p className="text-xs text-white/50 font-light text-left">Switch to the tablet to review your findings and continue the inspection.</p>
            </div>
            {pct < 100 && (
              <button
                onClick={() => setDone(false)}
                className="w-full h-12 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white/50 text-sm font-display active:scale-[0.98]"
              >
                ← Go back and add more photos
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Guided capture overlay ── */}
      {overlay && (
        <div className="fixed inset-0 z-[200] bg-[#060606] flex flex-col">
          {overlay.step === "guide" && (
            <MobileGuide overlay={overlay} onClose={() => setOverlay(null)} onOpenCamera={() => fileInputRef.current?.click()} />
          )}
          {overlay.step === "preview" && (
            <MobilePreview overlay={overlay} onRetake={handleRetake} onAccept={handleAccept} />
          )}
        </div>
      )}
    </>
  );
}

// ── Guided capture screen ─────────────────────────────────────────────────────
function MobileGuide({ overlay, onClose, onOpenCamera }: {
  overlay: CaptureOverlay; onClose: () => void; onOpenCamera: () => void;
}) {
  const hint = CAPTURE_HINTS[overlay.item.id];
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 pt-12 pb-6">
        <button onClick={onClose} className="flex items-center gap-2 text-white/50 active:text-white">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-mono uppercase tracking-widest">Back</span>
        </button>
        <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">{overlay.sectionLabel}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center mb-8">
          <Camera className="w-10 h-10 text-indigo-400" />
        </div>
        <p className="text-[11px] font-mono text-indigo-400/70 uppercase tracking-[0.3em] mb-3">Photo required</p>
        <h2 className="text-2xl font-display font-medium text-white leading-snug mb-3">{overlay.item.label}</h2>
        <p className="text-sm text-white/40 font-light leading-relaxed">{overlay.item.description}</p>

        {hint && (
          <div className="mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-left max-w-xs">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1.5">Tip</p>
            <p className="text-xs text-white/50 font-light leading-relaxed">{hint}</p>
          </div>
        )}
      </div>

      <div className="px-6 pb-10">
        <button
          onClick={onOpenCamera}
          className="w-full h-16 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] flex items-center justify-center gap-3 text-white font-display font-semibold text-lg shadow-[0_0_30px_rgba(99,102,241,0.3)]"
        >
          <Camera className="w-6 h-6" />
          Open Camera
          <ChevronRight className="w-4 h-4 text-indigo-300" />
        </button>
      </div>
    </div>
  );
}

// ── Preview screen ────────────────────────────────────────────────────────────
function MobilePreview({ overlay, onRetake, onAccept }: {
  overlay: CaptureOverlay; onRetake: () => void; onAccept: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative overflow-hidden bg-black">
        {overlay.previewUrl && (
          <img src={overlay.previewUrl} alt="Preview" className="w-full h-full object-contain" />
        )}
        <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/70 to-transparent pt-12 pb-12 px-6">
          <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1">Review photo</p>
          <p className="text-base font-display font-medium text-white">{overlay.item.label}</p>
        </div>
      </div>

      <div className="bg-[#060606] px-6 py-6 space-y-3">
        <p className="text-center text-xs text-white/35 font-light">Is the shot clear and in focus?</p>
        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="flex-1 h-14 rounded-2xl bg-white/[0.08] border border-white/[0.12] text-white/70 font-display font-medium flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" /> Retake
          </button>
          <button
            onClick={onAccept}
            className="flex-[2] h-14 rounded-2xl bg-indigo-500 text-white font-display font-semibold flex items-center justify-center gap-2 active:scale-[0.98] shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          >
            <Upload className="w-4 h-4" /> Upload Photo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Export with Suspense boundary (useSearchParams requires it) ───────────────
export default function RepCapturePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    }>
      <RepCaptureInner />
    </Suspense>
  );
}

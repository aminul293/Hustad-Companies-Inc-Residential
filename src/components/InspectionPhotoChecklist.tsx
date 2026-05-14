"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Camera, CheckCircle2, Trash2, RefreshCw,
  Plus, X, RotateCcw, ChevronRight, ArrowLeft,
  Home, Zap, Wind
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";
import { INSPECTION_SHOT_LIST, ShotListItem } from "@/lib/inspectionShotList";
import { InspectionPhoto, SessionState } from "@/types/session";
import { compressImage } from "@/lib/images";
import { savePhotoBlob, base64ToBlob, deletePhotoBlob } from "@/lib/photoStorage";
import { retryPhotoSync } from "@/lib/sync";

interface Props {
  session: SessionState;
  onUpdate: (updated: SessionState) => void;
}

interface CaptureState {
  item: ShotListItem;
  step: "guide" | "preview";
  previewUrl?: string;
  previewFile?: File;
  sectionLabel: string;
  itemIndex: number;
  totalItems: number;
}

// ── Section meta ──────────────────────────────────────────────────────────────
const SECTION_META: Record<string, { label: string; icon: React.ElementType; color: string; dot: string }> = {
  "Roof Inspection Photos": { label: "Roof", icon: Home, color: "text-indigo-400", dot: "bg-indigo-500" },
  "Storm Inspection":        { label: "Storm Damage", icon: Zap,  color: "text-sky-400",    dot: "bg-sky-500"    },
  "Hail/Wind Shot List":     { label: "Hail & Wind",  icon: Wind, color: "text-rose-400",   dot: "bg-rose-500"   },
};

// Hint copy shown in the guided capture overlay
const CAPTURE_HINTS: Record<string, string> = {
  general_observations:     "Step back and capture the full roof slope. Include ridgeline to eave edge.",
  membrane_shingle_condition:"Get close — fill the frame with the shingle surface so granule loss or splits are clear.",
  edge_metal_detail:        "Photograph along the drip edge or gutter apron, showing any dents or separation.",
  roof_assembly_core_cut:   "Photograph the core cut so all layers (felt, substrate, shingles) are visible.",
  eave_edge_detail:         "Lift the first course of shingles slightly to show the underlayment or ice & water shield.",
  roof_to_wall_detail:      "Capture where the roof meets the wall — focus on counter flashing and any gaps.",
  headwall_flashing:        "Show the full width of the headwall flashing and any rust, gaps, or lifting.",
  roof_penetrations:        "Include pipe boots, chimney base, or any penetration. Focus on seal condition.",
  roof_ventilation:         "Photograph ridge vents or box vents. Look for dents, crushed louvers, or debris.",
  non_storm_deficiencies:   "Document any wear or installation issues that aren't storm-related — keep separate from storm evidence.",
  test_squares:             "Mark and photograph 10×10 ft test squares. Show the chalk outline clearly.",
  best_hail_hit_closeups:   "Get within 12 inches. Each impact should fill at least 1/4 of the frame.",
  collateral_damage:        "Photograph AC units, fences, siding, or any non-roof items showing storm impact.",
  test_square_hits_circled: "Circle every hit inside the test square with chalk. Photograph the entire square.",
  hip_ridge_hits:           "Capture impacts along the hip or ridge cap — these are high-value insurance evidence.",
  soft_metal_dents:         "Show dents in turtle vents, box vents, or skylight frames. Angle to catch the shadows.",
  siding_paint_damage:      "Photograph chips or cracks in siding/trim. Include a coin for scale if possible.",
  gutters_downspouts_damage:"Photograph dents, bends, or detachment along the gutter length and downspout.",
  broken_glass_casings:     "Capture cracked panes or damaged window frames from arm's length.",
  vehicle_damage:           "Include the whole vehicle first, then a close-up of individual dents.",
};

export function InspectionPhotoChecklist({ session, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captureState, setCaptureState] = useState<CaptureState | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ photo: InspectionPhoto; item: ShotListItem } | null>(null);
  const photos = session.photos || [];

  // ── Progress ───────────────────────────────────────────────────────────────
  const totalRequired = INSPECTION_SHOT_LIST.reduce(
    (s, sec) => s + sec.items.reduce((is, i) => is + i.requiredCount, 0), 0
  );
  const completedRequired = INSPECTION_SHOT_LIST.reduce(
    (s, sec) => s + sec.items.reduce((is, i) => {
      const c = photos.filter(p => p.category === i.id).length;
      return is + Math.min(c, i.requiredCount);
    }, 0), 0
  );
  const pct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  const remaining = totalRequired - completedRequired;

  // Flat list of all required items for step counting
  const allRequiredItems = INSPECTION_SHOT_LIST.flatMap(sec =>
    sec.items.filter(i => i.requiredCount > 0).map(i => ({ item: i, sectionLabel: SECTION_META[sec.title]?.label ?? sec.title }))
  );

  // ── Open guided capture ────────────────────────────────────────────────────
  const openCapture = useCallback((item: ShotListItem, sectionLabel: string) => {
    const idx = allRequiredItems.findIndex(r => r.item.id === item.id);
    setCaptureState({
      item,
      step: "guide",
      sectionLabel,
      itemIndex: idx + 1,
      totalItems: allRequiredItems.length,
    });
  }, [allRequiredItems]);

  // ── File input handler (called after camera / file picker) ─────────────────
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !captureState) return;
    const previewUrl = URL.createObjectURL(file);
    setCaptureState(prev => prev ? { ...prev, step: "preview", previewUrl, previewFile: file } : null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [captureState]);

  // ── Retake ─────────────────────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    if (captureState?.previewUrl) URL.revokeObjectURL(captureState.previewUrl);
    setCaptureState(prev => prev ? { ...prev, step: "guide", previewUrl: undefined, previewFile: undefined } : null);
    setTimeout(() => fileInputRef.current?.click(), 80);
  }, [captureState]);

  // ── Accept photo ───────────────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!captureState?.previewFile || !captureState?.item) return;
    const { previewFile: file, item, previewUrl } = captureState;
    setCaptureState(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const raw = reader.result as string;
      const compressed = await compressImage(raw, 1200, 0.8);
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newPhoto: InspectionPhoto = {
        id: photoId,
        sessionId: session.sessionId,
        category: item.id,
        section: item.section,
        label: item.label,
        storageKey: photoId,
        selectedForSummary: true,
        createdAt: new Date().toISOString(),
        syncStatus: "local",
      };
      try {
        await savePhotoBlob(photoId, base64ToBlob(compressed));
        onUpdate({ ...session, photos: [...photos, newPhoto] });
      } catch {
        onUpdate({ ...session, photos: [...photos, { ...newPhoto, localUri: compressed }] });
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    reader.readAsDataURL(file);
  }, [captureState, session, photos, onUpdate]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deletePhoto = useCallback(async (id: string) => {
    await deletePhotoBlob(id);
    setViewingPhoto(null);
    onUpdate({ ...session, photos: photos.filter(p => p.id !== id) });
  }, [session, photos, onUpdate]);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* ── Main list ── */}
      <div className="space-y-8">
        {/* Progress banner */}
        <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.07]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-display font-medium text-white">
                {pct === 100 ? "All photos captured ✓" : `${remaining} photo${remaining !== 1 ? "s" : ""} still needed`}
              </p>
              <p className="text-[11px] text-white/35 mt-0.5">{completedRequired} of {totalRequired} required shots done</p>
            </div>
            <span className={cn(
              "text-2xl font-display font-bold",
              pct === 100 ? "text-emerald-400" : pct > 60 ? "text-indigo-400" : "text-white/50"
            )}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500")}
            />
          </div>
        </div>

        {/* Sections */}
        {INSPECTION_SHOT_LIST.map((section) => {
          const meta = SECTION_META[section.title];
          const SectionIcon = meta?.icon ?? Camera;
          const sectionDone = section.items.reduce((s, i) => {
            const c = photos.filter(p => p.category === i.id).length;
            return s + Math.min(c, i.requiredCount);
          }, 0);
          const sectionRequired = section.items.reduce((s, i) => s + i.requiredCount, 0);
          const sectionComplete = sectionDone >= sectionRequired;

          return (
            <div key={section.title} className="space-y-2">
              {/* Section header */}
              <div className="flex items-center gap-2.5 px-1 mb-3">
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", sectionComplete ? "bg-emerald-500/15" : "bg-white/[0.06]")}>
                  <SectionIcon className={cn("w-3.5 h-3.5", sectionComplete ? "text-emerald-400" : meta?.color ?? "text-white/40")} />
                </div>
                <span className="text-xs font-mono text-white/50 uppercase tracking-[0.25em]">
                  {meta?.label ?? section.title}
                </span>
                <span className="text-[10px] font-mono text-white/20 ml-auto">{sectionDone}/{sectionRequired}</span>
              </div>

              {/* Items */}
              {section.items.map((item) => {
                const itemPhotos = photos.filter(p => p.category === item.id);
                const captured = itemPhotos.length;
                const needed = Math.max(0, item.requiredCount - captured);
                const isComplete = item.requiredCount > 0 && needed === 0;
                const isOptional = item.requiredCount === 0;

                return (
                  <div key={item.id} className={cn(
                    "rounded-2xl border transition-all duration-300",
                    isComplete ? "bg-emerald-500/[0.04] border-emerald-500/15" : isOptional ? "bg-white/[0.015] border-white/[0.04]" : "bg-white/[0.025] border-white/[0.08]"
                  )}>
                    <div className="flex items-center gap-3 p-4">
                      {/* Status dot */}
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                        isComplete ? "bg-emerald-500/20" : isOptional ? "bg-white/[0.04]" : "bg-white/[0.06]"
                      )}>
                        {isComplete
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : <Camera className={cn("w-4 h-4", isOptional ? "text-white/20" : "text-white/40")} />
                        }
                      </div>

                      {/* Label + hint */}
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium leading-snug", isOptional ? "text-white/35" : isComplete ? "text-white/65" : "text-white/90")}>
                          {item.label}
                          {isOptional && <span className="ml-2 text-[9px] font-mono text-white/20 uppercase tracking-widest">Optional</span>}
                        </p>
                        <p className="text-[11px] text-white/25 mt-0.5 leading-relaxed">{item.description}</p>
                      </div>

                      {/* Thumbnails (tap to view full) */}
                      {captured > 0 && (
                        <div className="flex gap-1.5 shrink-0">
                          {itemPhotos.slice(0, 2).map(photo => (
                            <button key={photo.id} onClick={() => setViewingPhoto({ photo, item })} className="relative">
                              <PhotoThumbnail photo={photo} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                              {/* Sync pip */}
                              <div className="absolute -top-1 -right-1">
                                {photo.syncStatus === "synced" && <div className="w-3 h-3 bg-emerald-500 rounded-full border border-[#0a0a0a]" />}
                                {photo.syncStatus === "error" && (
                                  <button onClick={e => { e.stopPropagation(); retryPhotoSync(session, photo.id, onUpdate); }} className="w-3 h-3 bg-rose-500 rounded-full border border-[#0a0a0a] animate-pulse" />
                                )}
                                {photo.syncStatus === "syncing" && <div className="w-3 h-3 bg-indigo-500 rounded-full border border-[#0a0a0a]"><RefreshCw className="w-2 h-2 text-white animate-spin" /></div>}
                                {photo.syncStatus === "local" && <div className="w-3 h-3 bg-white/20 rounded-full border border-[#0a0a0a]" />}
                              </div>
                            </button>
                          ))}
                          {captured > 2 && (
                            <button onClick={() => setViewingPhoto({ photo: itemPhotos[2], item })} className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white/50">+{captured - 2}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Capture / Add button */}
                      <button
                        onClick={() => openCapture(item, meta?.label ?? section.title)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0",
                          isComplete
                            ? "bg-white/[0.05] text-white/35 hover:bg-white/10 hover:text-white/60"
                            : isOptional
                            ? "bg-white/[0.04] text-white/25 hover:bg-white/[0.08] hover:text-white/50"
                            : "bg-indigo-500 text-white shadow-[0_0_18px_rgba(99,102,241,0.25)] hover:bg-indigo-600"
                        )}
                      >
                        {isComplete
                          ? <><Plus className="w-3.5 h-3.5" /> Add</>
                          : <><Camera className="w-3.5 h-3.5" /> {item.requiredCount > 1 && needed > 0 ? `Capture (${needed})` : "Capture"}</>
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Guided Capture Overlay ── */}
      <AnimatePresence>
        {captureState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#060606] flex flex-col"
          >
            {captureState.step === "guide" && (
              <GuidedCapture
                captureState={captureState}
                onClose={() => setCaptureState(null)}
                onOpenCamera={() => fileInputRef.current?.click()}
              />
            )}
            {captureState.step === "preview" && (
              <PhotoPreview
                captureState={captureState}
                onRetake={handleRetake}
                onAccept={handleAccept}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Photo Viewer / Delete modal ── */}
      <AnimatePresence>
        {viewingPhoto && (
          <PhotoViewer
            photo={viewingPhoto.photo}
            item={viewingPhoto.item}
            allPhotos={photos.filter(p => p.category === viewingPhoto.item.id)}
            onDelete={deletePhoto}
            onRetake={() => {
              setViewingPhoto(null);
              const sec = INSPECTION_SHOT_LIST.find(s => s.items.some(i => i.id === viewingPhoto.item.id));
              const meta = sec ? SECTION_META[sec.title] : null;
              setTimeout(() => openCapture(viewingPhoto.item, meta?.label ?? ""), 150);
            }}
            onClose={() => setViewingPhoto(null)}
            onRetrySync={(id) => retryPhotoSync(session, id, onUpdate)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Guided Capture Screen ─────────────────────────────────────────────────────
function GuidedCapture({ captureState, onClose, onOpenCamera }: {
  captureState: CaptureState;
  onClose: () => void;
  onOpenCamera: () => void;
}) {
  const { item, sectionLabel, itemIndex, totalItems } = captureState;
  const hint = CAPTURE_HINTS[item.id];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-10 pb-6">
        <button onClick={onClose} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-mono uppercase tracking-widest">Back to list</span>
        </button>
        <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">
          {sectionLabel} · {itemIndex} of {totalItems}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        {/* Icon ring */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="relative mb-10"
        >
          <div className="w-28 h-28 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Camera className="w-12 h-12 text-indigo-400" />
          </div>
          <div className="absolute inset-0 rounded-full border border-indigo-400/10 animate-ping" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 max-w-lg"
        >
          <p className="text-[11px] font-mono text-indigo-400/80 uppercase tracking-[0.3em]">Capture required</p>
          <h2 className="text-3xl font-display font-medium text-white leading-snug">{item.label}</h2>
          <p className="text-base text-white/50 font-light leading-relaxed">{item.description}</p>
        </motion.div>

        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 max-w-md p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-left"
          >
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-2">Tip</p>
            <p className="text-sm text-white/60 font-light leading-relaxed">{hint}</p>
          </motion.div>
        )}
      </div>

      {/* Camera button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="px-8 pb-12"
      >
        <button
          onClick={onOpenCamera}
          className="w-full h-20 rounded-[32px] bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-[0_0_40px_rgba(99,102,241,0.3)]"
        >
          <Camera className="w-7 h-7 text-white" />
          <span className="text-xl font-display font-semibold text-white tracking-tight">Open Camera</span>
          <ChevronRight className="w-5 h-5 text-indigo-300" />
        </button>
        <p className="text-center text-[10px] font-mono text-white/20 uppercase tracking-widest mt-4">
          Camera opens automatically · Point &amp; shoot
        </p>
      </motion.div>
    </div>
  );
}

// ── Photo Preview (after capture) ─────────────────────────────────────────────
function PhotoPreview({ captureState, onRetake, onAccept }: {
  captureState: CaptureState;
  onRetake: () => void;
  onAccept: () => void;
}) {
  const { item, previewUrl } = captureState;

  return (
    <div className="flex flex-col h-full">
      {/* Photo fills the screen */}
      <div className="flex-1 relative overflow-hidden">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-contain bg-black"
          />
        )}
        {/* Top label overlay */}
        <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent pt-10 pb-16 px-8">
          <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.3em] mb-1">Review your photo</p>
          <p className="text-lg font-display font-medium text-white">{item.label}</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-[#060606] px-8 py-8 space-y-4">
        <p className="text-center text-xs text-white/40 font-light">Does this photo clearly show the damage or condition?</p>
        <div className="flex gap-4">
          <button
            onClick={onRetake}
            className="flex-1 h-16 rounded-2xl bg-white/[0.08] border border-white/[0.12] text-white/80 font-display font-medium flex items-center justify-center gap-3 hover:bg-white/[0.14] active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Retake
          </button>
          <button
            onClick={onAccept}
            className="flex-[2] h-16 rounded-2xl bg-indigo-500 text-white font-display font-semibold flex items-center justify-center gap-3 hover:bg-indigo-600 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)]"
          >
            <CheckCircle2 className="w-5 h-5" />
            Looks Good — Save
            <ChevronRight className="w-4 h-4 text-indigo-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Photo Viewer / Manage ─────────────────────────────────────────────────────
function PhotoViewer({ photo, item, allPhotos, onDelete, onRetake, onClose, onRetrySync }: {
  photo: InspectionPhoto;
  item: ShotListItem;
  allPhotos: InspectionPhoto[];
  onDelete: (id: string) => void;
  onRetake: () => void;
  onClose: () => void;
  onRetrySync: (id: string) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(() => allPhotos.findIndex(p => p.id === photo.id));
  const activePhoto = allPhotos[activeIdx] ?? photo;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/95 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-10 pb-4">
        <div>
          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{item.label}</p>
          {allPhotos.length > 1 && (
            <p className="text-xs text-white/40 mt-0.5">{activeIdx + 1} of {allPhotos.length} photos</p>
          )}
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        <PhotoThumbnail photo={activePhoto} className="max-w-full max-h-full rounded-2xl object-contain" />
      </div>

      {/* Thumbnails strip (if multiple) */}
      {allPhotos.length > 1 && (
        <div className="flex gap-2 justify-center px-8 py-4">
          {allPhotos.map((p, i) => (
            <button key={p.id} onClick={() => setActiveIdx(i)} className={cn("w-14 h-14 rounded-xl overflow-hidden border-2 transition-all", i === activeIdx ? "border-indigo-400" : "border-transparent opacity-50")}>
              <PhotoThumbnail photo={p} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-8 pb-10 pt-2 flex gap-3">
        <button
          onClick={() => onDelete(activePhoto.id)}
          className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium text-sm hover:bg-rose-500/20 active:scale-[0.98] transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
        {activePhoto.syncStatus === "error" && (
          <button
            onClick={() => onRetrySync(activePhoto.id)}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium text-sm hover:bg-amber-500/20 active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Sync
          </button>
        )}
        <button
          onClick={onRetake}
          className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold text-sm hover:bg-indigo-500/20 active:scale-[0.98] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Retake Photo
        </button>
      </div>
    </motion.div>
  );
}

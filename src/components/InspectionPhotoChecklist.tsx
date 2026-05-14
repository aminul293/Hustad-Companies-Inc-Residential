"use client";

import React, { useState, useRef } from "react";
import { Camera, CheckCircle2, Trash2, RefreshCw, Clock, Plus } from "lucide-react";
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

const SECTION_LABELS: Record<string, string> = {
  "Roof Inspection Photos": "Roof",
  "Storm Inspection": "Storm Damage",
  "Hail/Wind Shot List": "Hail & Wind",
};

export function InspectionPhotoChecklist({ session, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItem, setActiveItem] = useState<ShotListItem | null>(null);
  const [expandedPhotoItem, setExpandedPhotoItem] = useState<string | null>(null);
  const photos = session.photos || [];

  const totalRequired = INSPECTION_SHOT_LIST.reduce(
    (sum, s) => sum + s.items.reduce((is, i) => is + i.requiredCount, 0), 0
  );
  const completedRequired = INSPECTION_SHOT_LIST.reduce(
    (sum, s) =>
      sum +
      s.items.reduce((is, i) => {
        const count = photos.filter((p) => p.category === i.id).length;
        return is + Math.min(count, i.requiredCount);
      }, 0),
    0
  );
  const percentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  const remaining = totalRequired - completedRequired;

  const handleCapture = (item: ShotListItem) => {
    setActiveItem(item);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItem) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const raw = reader.result as string;
      const compressed = await compressImage(raw, 1200, 0.8);
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newPhoto: InspectionPhoto = {
        id: photoId,
        sessionId: session.sessionId,
        category: activeItem.id,
        section: activeItem.section,
        label: activeItem.label,
        storageKey: photoId,
        selectedForSummary: true,
        createdAt: new Date().toISOString(),
        syncStatus: "local",
      };

      try {
        const blob = base64ToBlob(compressed);
        await savePhotoBlob(photoId, blob);
        onUpdate({ ...session, photos: [...photos, newPhoto] });
      } catch {
        onUpdate({ ...session, photos: [...photos, { ...newPhoto, localUri: compressed }] });
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveItem(null);
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = async (id: string) => {
    await deletePhotoBlob(id);
    onUpdate({ ...session, photos: photos.filter((p) => p.id !== id) });
  };

  return (
    <div className="space-y-8">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* ── Progress Banner ── */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.07]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-base font-display font-medium text-white">
              {completedRequired === totalRequired ? "All photos captured" : `${remaining} photo${remaining !== 1 ? "s" : ""} still needed`}
            </p>
            <p className="text-xs text-white/40 mt-0.5">{completedRequired} of {totalRequired} required shots done</p>
          </div>
          <span className={cn(
            "text-3xl font-display font-bold",
            percentage === 100 ? "text-emerald-400" : percentage > 50 ? "text-indigo-400" : "text-white/60"
          )}>
            {percentage}%
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              percentage === 100
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-indigo-500 to-violet-500"
            )}
          />
        </div>
      </div>

      {/* ── Shot Sections ── */}
      {INSPECTION_SHOT_LIST.map((section) => {
        const sectionRequired = section.items.reduce((sum, i) => sum + i.requiredCount, 0);
        const sectionDone = section.items.reduce((sum, i) => {
          const c = photos.filter((p) => p.category === i.id).length;
          return sum + Math.min(c, i.requiredCount);
        }, 0);
        const sectionComplete = sectionDone >= sectionRequired;

        return (
          <div key={section.title} className="space-y-2">
            {/* Section label */}
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  sectionComplete ? "bg-emerald-500" : "bg-indigo-500/60"
                )} />
                <span className="text-xs font-mono text-white/50 uppercase tracking-[0.25em]">
                  {SECTION_LABELS[section.title] ?? section.title}
                </span>
              </div>
              <span className="text-[10px] font-mono text-white/25">
                {sectionDone}/{sectionRequired}
              </span>
            </div>

            {/* Items */}
            {section.items.map((item) => {
              const itemPhotos = photos.filter((p) => p.category === item.id);
              const captured = itemPhotos.length;
              const needed = Math.max(0, item.requiredCount - captured);
              const isComplete = item.requiredCount > 0 && needed === 0;
              const isOptional = item.requiredCount === 0;
              const isExpanded = expandedPhotoItem === item.id && captured > 0;

              return (
                <div key={item.id} className={cn(
                  "rounded-2xl border transition-all duration-300 overflow-hidden",
                  isComplete
                    ? "bg-emerald-500/[0.05] border-emerald-500/20"
                    : isOptional
                    ? "bg-white/[0.015] border-white/[0.04]"
                    : "bg-white/[0.03] border-white/[0.08]"
                )}>
                  {/* Main row */}
                  <div className="flex items-center gap-4 p-4">
                    {/* Status indicator */}
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isComplete ? "bg-emerald-500/20" : isOptional ? "bg-white/[0.04]" : "bg-white/[0.06]"
                    )}>
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Camera className={cn("w-4 h-4", isOptional ? "text-white/20" : "text-white/50")} />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium leading-snug",
                        isComplete ? "text-white/70 line-through decoration-white/20" : isOptional ? "text-white/40" : "text-white/90"
                      )}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">{item.description}</p>
                    </div>

                    {/* Thumbnail strip (up to 2) */}
                    {captured > 0 && (
                      <button
                        onClick={() => setExpandedPhotoItem(isExpanded ? null : item.id)}
                        className="flex items-center gap-1 shrink-0"
                      >
                        {itemPhotos.slice(0, 2).map((photo) => (
                          <PhotoThumbnail
                            key={photo.id}
                            photo={photo}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10"
                          />
                        ))}
                        {captured > 2 && (
                          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white/60">+{captured - 2}</span>
                          </div>
                        )}
                      </button>
                    )}

                    {/* Capture / Add button */}
                    <button
                      onClick={() => handleCapture(item)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0",
                        isComplete
                          ? "bg-white/[0.05] text-white/35 hover:bg-white/10 hover:text-white/60"
                          : isOptional
                          ? "bg-white/[0.04] text-white/25 hover:bg-white/[0.08] hover:text-white/50"
                          : "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:bg-indigo-600"
                      )}
                    >
                      {isComplete ? (
                        <><Plus className="w-3.5 h-3.5" /> Add</>
                      ) : (
                        <><Camera className="w-3.5 h-3.5" /> Capture{item.requiredCount > 1 && needed > 0 ? ` (${needed})` : ""}</>
                      )}
                    </button>
                  </div>

                  {/* Expanded photo management */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06]">
                          <div className="flex flex-wrap gap-3 mt-3">
                            {itemPhotos.map((photo) => (
                              <div key={photo.id} className="relative group">
                                <PhotoThumbnail
                                  photo={photo}
                                  className="w-20 h-20 rounded-2xl object-cover border border-white/10"
                                />
                                {/* Sync badge */}
                                <div className="absolute top-1 left-1">
                                  {photo.syncStatus === "synced" ? (
                                    <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                                      <CheckCircle2 size={8} className="text-white" />
                                    </div>
                                  ) : photo.syncStatus === "error" ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); retryPhotoSync(session, photo.id, onUpdate); }}
                                      className="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center shadow animate-pulse"
                                    >
                                      <RefreshCw size={8} className="text-white" />
                                    </button>
                                  ) : photo.syncStatus === "syncing" ? (
                                    <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center shadow">
                                      <RefreshCw size={8} className="text-white animate-spin" />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 bg-black/40 rounded-full flex items-center justify-center shadow">
                                      <Clock size={8} className="text-white/50" />
                                    </div>
                                  )}
                                </div>
                                {/* Delete */}
                                <button
                                  onClick={() => deletePhoto(photo.id)}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow active:scale-90"
                                >
                                  <Trash2 size={10} className="text-white" />
                                </button>
                              </div>
                            ))}
                            {/* Quick-add tile */}
                            <button
                              onClick={() => handleCapture(item)}
                              className="w-20 h-20 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:bg-white/[0.05] hover:border-indigo-500/40 transition-all active:scale-95"
                            >
                              <Plus className="w-4 h-4 text-white/30" />
                              <span className="text-[9px] font-mono text-white/20 uppercase tracking-wider">Add</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

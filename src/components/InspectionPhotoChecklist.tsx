"use client";

import React, { useState, useRef } from "react";
import { 
  Camera, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { INSPECTION_SHOT_LIST, ShotListItem, ShotListSection } from "@/lib/inspectionShotList";
import { InspectionPhoto, SessionState } from "@/types/session";
import { compressImage } from "@/lib/images";

interface InspectionPhotoChecklistProps {
  session: SessionState;
  onUpdate: (updated: SessionState) => void;
}

export function InspectionPhotoChecklist({ session, onUpdate }: InspectionPhotoChecklistProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(INSPECTION_SHOT_LIST.map(s => s.title));
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItem, setActiveItem] = useState<ShotListItem | null>(null);

  const photos = session.photos || [];

  // Summary calculation
  const totalRequired = INSPECTION_SHOT_LIST.reduce((sum, section) => 
    sum + section.items.reduce((iSum, item) => iSum + item.requiredCount, 0), 0);
  
  const completedRequired = INSPECTION_SHOT_LIST.reduce((sum, section) => 
    sum + section.items.reduce((iSum, item) => {
      const count = photos.filter(p => p.category === item.id).length;
      return iSum + Math.min(count, item.requiredCount);
    }, 0), 0);

  const percentage = Math.round((completedRequired / totalRequired) * 100) || 0;

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleCapture = (item: ShotListItem) => {
    setActiveItem(item);
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItem) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawBase64 = reader.result as string;
      
      // Compress before saving to session
      const compressedBase64 = await compressImage(rawBase64, 1200, 0.8);

      const newPhoto: InspectionPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sessionId: session.sessionId,
        category: activeItem.id,
        section: activeItem.section,
        label: activeItem.label,
        localUri: compressedBase64,
        selectedForSummary: true,
        createdAt: new Date().toISOString(),
        syncStatus: "local",
      };

      onUpdate({
        ...session,
        photos: [...(session.photos || []), newPhoto]
      });
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveItem(null);
    };
    reader.readAsDataURL(file);
  };

  const deletePhoto = (id: string) => {
    onUpdate({
      ...session,
      photos: photos.filter(p => p.id !== id)
    });
  };

  const updatePhotoDescription = (id: string, description: string) => {
    onUpdate({
      ...session,
      photos: photos.map(p => p.id === id ? { ...p, description } : p)
    });
  };

  const toggleSummarySelection = (id: string) => {
    onUpdate({
      ...session,
      photos: photos.map(p => p.id === id ? { ...p, selectedForSummary: !p.selectedForSummary } : p)
    });
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onFileChange} 
        accept="image/*" 
        capture="environment"
        className="hidden" 
      />

      {/* Summary Header */}
      <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Camera size={80} className="text-indigo-400" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-medium text-white">Forensic Photo Dossier</h3>
              <p className="text-sm text-white/50 mt-1">
                Captured: {completedRequired} / {totalRequired} required shots complete
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-indigo-400">{percentage}%</span>
            </div>
          </div>

          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Shot List Sections */}
      {INSPECTION_SHOT_LIST.map((section) => (
        <div key={section.title} className="space-y-3">
          <button 
            onClick={() => toggleSection(section.title)}
            className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <h4 className="text-sm font-bold uppercase tracking-wider text-white/70">{section.title}</h4>
            {expandedSections.includes(section.title) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <AnimatePresence>
            {expandedSections.includes(section.title) && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-3"
              >
                {section.items.map((item) => {
                  const itemPhotos = photos.filter(p => p.category === item.id);
                  const isComplete = itemPhotos.length >= item.requiredCount;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={cn(
                        "p-5 rounded-3xl border transition-all duration-300",
                        isComplete ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.02] border-white/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="text-white font-medium">{item.label}</h5>
                            {isComplete && <CheckCircle2 size={16} className="text-emerald-400" />}
                            {item.requiredCount > 0 && !isComplete && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold uppercase tracking-tighter">
                                Missing
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/40 leading-relaxed">{item.description}</p>
                          <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-2">
                            Status: {itemPhotos.length} / {item.requiredCount} required
                          </p>
                        </div>

                        <button 
                          onClick={() => handleCapture(item)}
                          disabled={!item.allowMultiple && isComplete}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95",
                            isComplete 
                              ? "bg-white/10 text-white/70 hover:bg-white/20" 
                              : "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-600"
                          )}
                        >
                          <Camera size={16} />
                          Capture
                        </button>
                      </div>

                      {/* Thumbnails */}
                      {itemPhotos.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
                          {itemPhotos.map((photo) => (
                            <div key={photo.id} className="relative group aspect-square">
                              <img 
                                src={photo.localUri} 
                                alt={photo.label} 
                                className="w-full h-full object-cover rounded-xl border border-white/10"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
                                <button 
                                  onClick={() => setEditingPhotoId(photo.id)}
                                  className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 text-white"
                                >
                                  <Info size={14} />
                                </button>
                                <button 
                                  onClick={() => deletePhoto(photo.id)}
                                  className="p-1.5 bg-red-500/20 rounded-lg hover:bg-red-500/40 text-red-400"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              {photo.syncStatus === "error" && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                                  <AlertCircle size={8} className="text-white" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* Photo Edit Overlay */}
      <AnimatePresence>
        {editingPhotoId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-[#111] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl"
            >
              {(() => {
                const photo = photos.find(p => p.id === editingPhotoId);
                if (!photo) return null;
                return (
                  <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white">Edit Photo Note</h3>
                      <button onClick={() => setEditingPhotoId(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
                        <X size={24} />
                      </button>
                    </div>

                    <img src={photo.localUri} className="w-full aspect-video object-cover rounded-2xl border border-white/10" alt="Preview" />
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <StarButton 
                          onClick={() => toggleSummarySelection(photo.id)}
                          className={cn("w-10 h-10 rounded-xl", photo.selectedForSummary ? "bg-indigo-500" : "bg-white/10")}
                        >
                          <CheckCircle2 size={18} className={photo.selectedForSummary ? "text-white" : "text-white/20"} />
                        </StarButton>
                        <div>
                          <p className="text-sm font-medium text-white">Include in Briefing</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">Show this finding to the buyer</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">Description / Note</label>
                      <textarea
                        value={photo.description || ""}
                        onChange={(e) => updatePhotoDescription(photo.id, e.target.value)}
                        placeholder="Add specific details about this finding..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setEditingPhotoId(null)}
                        className="flex-1 py-4 rounded-2xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

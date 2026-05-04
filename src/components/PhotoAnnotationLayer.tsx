"use client";

import { useState, useRef, useEffect } from "react";
import { Circle, ArrowUpRight, Trash2, Check, X, Palette, Type, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Annotation, PhotoAsset } from "@/types/session";

interface Props {
  photo: PhotoAsset;
  onSave: (annotations: Annotation[]) => void;
  onCancel: () => void;
}

export function PhotoAnnotationLayer({ photo, onSave, onCancel }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>(photo.annotations || []);
  const [activeType, setActiveType] = useState<"circle" | "arrow" | "label" | "blur">("circle");
  const [activeColor, setActiveColor] = useState("#f43f5e"); // rose-500
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStart, setCurrentStart] = useState<{ x: number, y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    setCurrentStart(getPos(e));
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStart) return;
    // Real-time preview could be added here
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentStart) return;
    const end = getPos(e);
    
    let text = "";
    if (activeType === "label") {
      text = prompt("Enter Forensic Label:") || "";
      if (!text) { setIsDrawing(false); return; }
    }

    const newAnnotation: Annotation = {
      type: activeType,
      x: currentStart.x,
      y: currentStart.y,
      color: activeColor,
      text
    };

    if (activeType === "circle") {
      const dist = Math.sqrt(Math.pow(end.x - currentStart.x, 2) + Math.pow(end.y - currentStart.y, 2));
      newAnnotation.radius = Math.max(2, dist);
    } else {
      newAnnotation.toX = end.x;
      newAnnotation.toY = end.y;
    }

    setAnnotations([...annotations, newAnnotation]);
    setIsDrawing(false);
    setCurrentStart(null);
  };

  const removeAnnotation = (index: number) => {
    setAnnotations(annotations.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 transition-all">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-display font-medium text-white">Forensic Markup</h3>
            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Pixel-Level Damage Evidence</p>
          </div>
        </div>
        <button 
          onClick={() => onSave(annotations)}
          className="px-6 py-3 rounded-2xl bg-indigo-500 text-white text-xs font-display font-medium hover:bg-indigo-400 transition-all flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Apply Annotations
        </button>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative flex items-center justify-center p-12 overflow-hidden">
        <div 
          ref={containerRef}
          className="relative max-w-full max-h-full aspect-[4/3] bg-black shadow-2xl rounded-sm cursor-crosshair select-none touch-none"
          onMouseDown={handleStart}
          onMouseUp={handleEnd}
          onMouseMove={handleMove}
          onTouchStart={handleStart}
          onTouchEnd={handleEnd}
          onTouchMove={handleMove}
        >
          <img src={photo.dataUrl} alt="Markup Target" className="w-full h-full object-contain pointer-events-none" />
          
          {/* Render Annotations */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <filter id="blur-filter">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
              </filter>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={activeColor} />
              </marker>
            </defs>
            {annotations.map((ann, i) => (
              <g key={i}>
                {ann.type === "circle" && (
                  <circle cx={`${ann.x}%`} cy={`${ann.y}%`} r={`${ann.radius}%`} fill="transparent" stroke={ann.color} strokeWidth="2" />
                )}
                {ann.type === "arrow" && (
                  <line x1={`${ann.x}%`} y1={`${ann.y}%`} x2={`${ann.toX}%`} y2={`${ann.toY}%`} stroke={ann.color} strokeWidth="3" markerEnd="url(#arrowhead)" />
                )}
                {ann.type === "blur" && (
                  <rect 
                    x={`${Math.min(ann.x, ann.toX || ann.x)}%`} 
                    y={`${Math.min(ann.y, ann.toY || ann.y)}%`} 
                    width={`${Math.abs((ann.toX || ann.x) - ann.x)}%`} 
                    height={`${Math.abs((ann.toY || ann.y) - ann.y)}%`} 
                    fill="white"
                    fillOpacity="0.2"
                    filter="url(#blur-filter)"
                  />
                )}
                {ann.type === "label" && (
                  <g>
                    <rect x={`${ann.x}%`} y={`${ann.y}%`} width="60" height="16" rx="4" fill={ann.color} transform="translate(-30, -8)" />
                    <text x={`${ann.x}%`} y={`${ann.y}%`} fill="white" fontSize="6" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                      {ann.text?.toUpperCase()}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Floating Tool Palette */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-[32px] bg-[#1a1a1a] border border-white/10 shadow-2xl backdrop-blur-2xl">
          <button 
            onClick={() => setActiveType("circle")}
            className={cn("p-4 rounded-full transition-all", activeType === "circle" ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5")}
          >
            <Circle className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveType("arrow")}
            className={cn("p-4 rounded-full transition-all", activeType === "arrow" ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5")}
          >
            <ArrowUpRight className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveType("label")}
            className={cn("p-4 rounded-full transition-all", activeType === "label" ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5")}
          >
            <Type className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveType("blur")}
            className={cn("p-4 rounded-full transition-all", activeType === "blur" ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:bg-white/5")}
          >
            <ShieldAlert className="w-6 h-6" />
          </button>
          <div className="w-[1px] h-8 bg-white/10 mx-2" />
          {["#f43f5e", "#f59e0b", "#10b981", "#6366f1", "#ffffff"].map(c => (
            <button 
              key={c}
              onClick={() => setActiveColor(c)}
              className={cn("w-10 h-10 rounded-full border-2 transition-all", activeColor === c ? "scale-110 border-white shadow-lg" : "border-transparent opacity-40 hover:opacity-100")}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-[1px] h-8 bg-white/10 mx-2" />
          <button 
            onClick={() => setAnnotations([])}
            className="p-4 rounded-full text-rose-500 hover:bg-rose-500/10 transition-all"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* History sidebar (Mobile hidden) */}
      <div className="absolute right-0 top-24 bottom-0 w-64 border-l border-white/10 p-6 hidden lg:flex flex-col gap-4 overflow-y-auto">
        <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-2">Evidence Queue</p>
        {annotations.map((ann, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ann.color }} />
              <span className="text-xs text-white/70 capitalize">{ann.type} {i + 1}</span>
            </div>
            <button onClick={() => removeAnnotation(i)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {annotations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
            <Edit3 className="w-8 h-8 mb-4" />
            <p className="text-[10px] font-mono uppercase tracking-widest leading-relaxed">Touch canvas to<br/>begin marking evidence</p>
          </div>
        )}
      </div>
    </div>
  );
}

const Edit3 = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;

"use client";

import { fetchSessionByToken, syncSession, postReviewAction } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import type { SessionState, SelectedPath, Annotation } from "@/types/session";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, FileText, PenTool, CheckCircle2, AlertTriangle,
  Download, ChevronRight, Camera, MapPin, ArrowRight,
  Wrench, Zap, Eye, MessageSquare, Phone, Clock, XCircle,
  ThumbsUp, Send, User, Home, Shield, CalendarDays, ArrowLeft,
  Scan, Database, ShieldAlert, X
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { StarButton } from "@/components/ui/star-button";
import { cn } from "@/lib/utils";

export default function RemoteReviewPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [selectedPath, setSelectedPath] = useState<SelectedPath>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activePanel, setActivePanel] = useState<"sign"|"question"|"callback"|"decline"|null>(null);
  const [questionText, setQuestionText] = useState("");
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [actionSent, setActionSent] = useState<string|null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  
  const sigPad = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetchSessionByToken(token);
        
        if (res.status === 409) {
          const data = await res.json();
          setSession(data.session);
          setSuccess(true);
          return;
        }

        if (res.status === 410) {
          throw new Error("This review link has expired for security reasons. Please contact your Hustad representative for a fresh link.");
        }

        if (!res.ok) throw new Error("This review link is invalid or has been revoked.");
        
        const data = await res.json();
        setSession(data);
        setSignerName(data.property.homeownerPrimaryName || "");
        setSelectedPath(data.pathData.selectedPath);
        // Track opened status
        postReviewAction(token, 'opened');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [token]);

  const trackViewed = () => {
    postReviewAction(token, 'viewed');
  };

  const sendAction = async (action: string, payload: any) => {
    setIsSubmitting(true);
    try {
      const res = await postReviewAction(token, action, payload);
      if (!res.ok) throw new Error('Failed');
      setActionSent(action);
    } catch { alert('Failed to submit. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  const handleSubmit = async () => {
    if (!selectedPath) {
      alert("Please select a restoration path to continue.");
      return;
    }
    if (!sigPad.current || sigPad.current.isEmpty()) {
      alert("Please provide your signature to authorize.");
      return;
    }
    if (!signerName.trim()) {
      alert("Please enter your full name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureImage = sigPad.current.toDataURL();
      const now = new Date().toISOString();
      
      const updatedSession: SessionState = {
        ...session!,
        sessionStatus: "signed",
        pathData: {
          ...session!.pathData,
          selectedPath
        },
        signatureData: {
          ...session!.signatureData,
          signerName,
          signatureImage,
          signedAt: now
        },
        auditEvents: [
          ...session!.auditEvents,
          {
            eventName: "remote_signature_submitted",
            actorId: "homeowner",
            occurredAt: now,
            metadata: { method: "remote_link", path: selectedPath }
          }
        ]
      };

      const res = await syncSession(updatedSession);

      if (!res.ok) throw new Error("Failed to submit authorization.");
      setSession(updatedSession);
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { downloadSummaryPDF } = await import("@/lib/pdf-export");
      await downloadSummaryPDF(session!);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      alert("Failed to generate PDF: " + err.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#060606]">
      <motion.div animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-indigo-400 font-mono text-sm uppercase tracking-widest">
        Authenticating Secure Link...
      </motion.div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#060606] px-10 text-center">
      <AlertTriangle className="w-12 h-12 text-rose-500 mb-6" />
      <h1 className="text-2xl font-display font-medium text-[#E8EDF8] mb-2 tracking-tight">Access Denied</h1>
      <p className="text-[#7090B0] font-light max-w-sm leading-relaxed">{error}</p>
    </div>
  );

  if (success) return (
    <div className="fixed inset-0 overflow-y-auto bg-[#060606]">
    <div className="flex flex-col items-center justify-center min-h-full px-6 text-center py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.06),transparent_70%)]" />
      
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-10">
        <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
      </motion.div>
      
      <h1 className="relative z-10 text-5xl font-display font-medium text-[#E8EDF8] mb-6 tracking-tight">Authorization Complete</h1>
      <p className="relative z-10 text-[#7090B0] font-light max-w-md leading-relaxed text-lg mb-12">
        Thank you. Your digital authorization has been securely transmitted to Hustad Residential. A finalized copy of your Forensic Dossier is being sent to your inbox.
      </p>

      <StarButton
        onClick={handleDownload}
        lightColor="#FAFAFA"
        backgroundColor="#060606"
        className="px-12 h-20 rounded-full active:scale-95 transition-transform shadow-[0_20px_60px_rgba(16,185,129,0.2)] group"
      >
        <div className="flex items-center justify-center gap-4">
          <Download className="w-5 h-5 text-emerald-400" />
          <span className="text-xl font-display font-bold tracking-tight">Download Signed Dossier</span>
        </div>
      </StarButton>

      <div className="mt-12 flex items-center gap-2.5 opacity-20">
        <span className="font-display font-bold text-[#E8EDF8] text-lg tracking-[0.15em]">HUSTAD</span>
        <span className="text-[8px] font-mono text-[#AABDCF] uppercase tracking-[0.4em] pt-0.5">Madison Residential</span>
      </div>
    </div>
    </div>
  );

  const outcome = session!.findings.outcomeType || "no_damage";
  const address = session!.property.address;
  const photos = (session!.photoAssets || []).filter(p => p.selectedForSummary && !p.isSensitive);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#060606] text-[#E8EDF8] font-sans selection:bg-indigo-500/30 custom-scrollbar pb-32">
      {/* HUD Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('/images/grid.png')] bg-repeat opacity-[0.02]" />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-16 space-y-16">
        <motion.header 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8 }} 
          className="space-y-8 text-center"
        >
          <div className="flex items-baseline gap-3 justify-center">
            <span className="font-display font-bold text-[#E8EDF8] text-2xl tracking-[0.15em]">HUSTAD</span>
            <span className="text-[10px] font-mono text-[#567090] uppercase tracking-[0.4em] pt-0.5">Residential</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-display font-medium tracking-tight leading-[1.1]">Co-Decision Review</h1>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">{address || "Unspecified Property"}</span>
            </div>
          </div>
        </motion.header>

        {/* Property Context Bento */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-50px" }} 
          transition={{ duration: 0.8, staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.06] backdrop-blur-3xl space-y-6 md:col-span-2 hover:bg-white/[0.04] transition-colors duration-500">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono text-[#567090] uppercase tracking-[0.3em] pt-0.5">Property Intelligence</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {[
                { label: "Homeowner", value: (session!.property.homeownerPrimaryName || '').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '' },
                { label: "Carrier", value: session!.property.insurerNameKnown || '' },
                { label: "Storm Basis", value: session!.property.stormBasis || '' },
                { label: "Lead Inspector", value: session!.repName || '' },
                { label: "Working DOL", value: session!.property.workingDateOfLoss || '' },
                { label: "Ticket ID", value: session!.centerpointId || '', isId: true },
              ].filter(item => !!item.value).map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-1 group relative p-4 rounded-2xl hover:bg-white/[0.03] transition-colors cursor-default"
                >
                  <p className="text-[9px] font-mono text-[#2D4060] uppercase tracking-[0.3em] group-hover:text-indigo-400 transition-colors">{item.label}</p>
                  <p className={cn("text-base font-medium", item.isId ? "font-mono text-indigo-400/70" : "font-display text-[#DDE5F5]")}>{item.value}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Outcome Summary - High Impact */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }} 
          whileInView={{ opacity: 1, scale: 1 }} 
          viewport={{ once: true, margin: "-50px" }} 
          transition={{ duration: 0.8 }}
          onMouseEnter={trackViewed} 
          className="relative p-10 rounded-[56px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl overflow-hidden group hover:border-indigo-500/30 transition-all duration-700"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-1000">
            <ShieldCheck className="w-48 h-48 text-[#E8EDF8]" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,0.08),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="relative z-10 space-y-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.3em] pt-0.5">Forensic Findings Result</span>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-6xl md:text-8xl font-display font-medium tracking-tight leading-[1.05] capitalize bg-gradient-to-r from-white to-[#AABDCF] bg-clip-text text-transparent">
                {outcome.replace(/_/g, " ")}
              </h2>
              <p className="text-xl md:text-2xl text-[#AABDCF] font-light leading-relaxed max-w-2xl">
                {session!.findings.summaryBody}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Evidence Gallery */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-50px" }} 
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="flex items-center gap-3 px-4">
            <Camera className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-mono text-[#567090] uppercase tracking-[0.3em] pt-0.5">Forensic Documentation</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {photos.map((photo, idx) => (
              <motion.div 
                key={photo.assetId} 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setSelectedImage(photo)}
                className="group relative aspect-[4/3] rounded-[40px] overflow-hidden border border-white/10 bg-white/[0.02] hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-700 cursor-pointer"
              >
                <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center">
                  <div className="translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-white" />
                    <span className="text-xs font-mono text-white tracking-widest uppercase">Inspect</span>
                  </div>
                </div>
                <img src={photo.dataUrl} alt="Documentation" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
                  {(photo.annotations || []).map((ann: any, i: number) => (
                    <g key={i}>
                      {ann.type === "circle" ? (
                        <circle cx={`${ann.x}%`} cy={`${ann.y}%`} r={`${ann.radius}%`} fill="transparent" stroke={ann.color} strokeWidth="2.5" className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      ) : (
                        <line x1={`${ann.x}%`} y1={`${ann.y}%`} x2={`${ann.toX}%`} y2={`${ann.toY}%`} stroke={ann.color} strokeWidth="3.5" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      )}
                    </g>
                  ))}
                </svg>
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[8px] font-mono text-indigo-300 uppercase tracking-widest">{photo.category.replace('_', ' ')} Evidence</span>
                    {photo.severity && (
                      <span className={cn(
                        "text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md border",
                        photo.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-[#567090]'
                      )}>{photo.severity} Severity</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Path Decision Matrix */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, margin: "-50px" }} 
          transition={{ duration: 0.8 }}
          className="space-y-10"
        >
          <div className="flex items-center gap-3 px-4">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-mono text-[#567090] uppercase tracking-[0.3em] pt-0.5">Restoration Roadmap</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { id: "claim_review" as SelectedPath, label: "Insurance Path", detail: "Forensic filing for carrier determination.", icon: FileText, color: "indigo" },
              { id: "direct_repair" as SelectedPath, label: "Direct Path", detail: "Authorized restoration without carrier filing.", icon: Wrench, color: "emerald" }
            ] as const).filter(path =>
              outcome === "repair_only" ? path.id === "direct_repair" : true
            ).map(path => {
              const isSelected = selectedPath === path.id;
              const isOtherSelected = selectedPath && !isSelected;
              return (
                <button 
                  key={path.id}
                  onClick={() => setSelectedPath(path.id)}
                  className={cn(
                    "relative p-8 rounded-[48px] border text-left transition-all duration-700 overflow-hidden group",
                    isSelected 
                      ? `bg-${path.color}-500/10 border-${path.color}-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.4)] scale-100` 
                      : "bg-white/[0.02] border-white/5 hover:border-white/20",
                    isOtherSelected ? "opacity-40 scale-95 hover:opacity-70" : "opacity-100"
                  )}
                >
                  {isSelected && <motion.div layoutId="path-bg" className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />}
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 relative z-10",
                    isSelected ? `bg-${path.color}-500 text-[#E8EDF8] shadow-[0_0_20px_rgba(255,255,255,0.2)]` : "bg-white/5 text-[#2D4060] group-hover:text-[#567090]"
                  )}>
                    <path.icon className="w-6 h-6" />
                  </div>
                  <p className={cn("text-2xl font-display font-medium mb-2 tracking-tight relative z-10 transition-colors", isSelected ? "text-[#E8EDF8]" : "text-[#8BA5C5] group-hover:text-[#C2D0E4]")}>{path.label}</p>
                  <p className={cn("text-sm font-light leading-relaxed relative z-10 transition-colors", isSelected ? "text-[#DDE5F5]" : "text-[#3F5878] group-hover:text-[#567090]")}>{path.detail}</p>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Advisory Bento */}
        <section className="p-8 rounded-[40px] bg-rose-500/[0.02] border border-rose-500/[0.08] space-y-4">
          <div className="flex items-center gap-3 px-2">
            <ShieldAlert className="w-4 h-4 text-rose-500/60" />
            <span className="text-[10px] font-mono text-rose-500/60 uppercase tracking-[0.3em] pt-0.5">Advisory Disclosure</span>
          </div>
          <p className="text-xs text-[#3F5878] leading-relaxed font-light pl-2">
            This document is a forensic inspection summary only. No insurance outcome is guaranteed. Hustad does not represent that any carrier will approve, deny, or modify a claim. Warranty terms are manufacturer-specific and subject to product registration requirements. All decisions remain yours.
          </p>
        </section>

        {/* Action Interface */}
        {actionSent ? (
          <motion.section initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-12 rounded-[56px] bg-emerald-500/[0.04] border border-emerald-500/20 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-display font-medium text-[#E8EDF8]">Response Received</h3>
              <p className="text-[#567090] text-sm font-light max-w-sm mx-auto leading-relaxed uppercase tracking-widest">Your {actionSent.replace('_',' ')} has been securely transmitted to the Hustad Forensic terminal.</p>
            </div>
          </motion.section>
        ) : (
          <section className="space-y-10">
            <div className="flex items-center gap-3 px-4">
              <PenTool className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono text-[#567090] uppercase tracking-[0.3em] pt-0.5">Response Control Terminal</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {id:'question' as const, label:'Ask Question', icon: MessageSquare, color:'indigo'},
                {id:'callback' as const, label:'Request Call', icon: Phone, color:'emerald'},
                {id:'sign' as const, label:'Sign Remotely', icon: PenTool, color:'indigo'},
                {id:'decline' as const, label:'Defer Review', icon: XCircle, color:'rose'},
              ].map(a => (
                <button
                  key={a.id}
                  onClick={() => setActivePanel(a.id)}
                  className={cn(
                    'p-6 rounded-[32px] border text-left transition-all duration-500 flex flex-col items-start gap-4 group',
                    activePanel === a.id ? `bg-${a.color}-500/10 border-${a.color}-500/30` : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                    activePanel === a.id ? `bg-${a.color}-500 text-[#E8EDF8]` : 'bg-white/5 text-[#3F5878] group-hover:text-[#7090B0]'
                  )}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <p className={cn("text-sm font-display font-medium tracking-tight", activePanel === a.id ? "text-[#E8EDF8]" : "text-[#8BA5C5]")}>{a.label}</p>
                </button>
              ))}

              {/* Approve — full-width tile spanning both columns */}
              <button
                onClick={() => sendAction('approve', {})}
                disabled={isSubmitting}
                className="col-span-2 p-6 rounded-[32px] border text-left transition-all duration-500 flex items-center gap-4 group bg-emerald-500/[0.04] border-emerald-500/15 hover:bg-emerald-500/10 hover:border-emerald-500/30 disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <p className="text-sm font-display font-medium tracking-tight text-emerald-400/80 group-hover:text-emerald-300">Approve Next Step</p>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activePanel === 'question' && (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-6">
                  <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.4em] pl-1 font-bold">Question for Representative</p>
                  <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Type your question here..." className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-[#E8EDF8] text-base outline-none focus:border-indigo-500/40 resize-none h-40 font-light leading-relaxed" />
                  <StarButton onClick={() => sendAction('question', {questionText, askerName: signerName})} disabled={isSubmitting || !questionText.trim()} lightColor="#FAFAFA" backgroundColor="#060606" className="w-full h-16 rounded-full">
                    <div className="flex items-center justify-center gap-3">
                      <Send className="w-4 h-4 text-indigo-400" />
                      <span className="text-base font-display font-bold">{isSubmitting ? 'Sending...' : 'Dispatch Question'}</span>
                    </div>
                  </StarButton>
                </motion.div>
              )}
              {activePanel === 'callback' && (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-6">
                  <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.4em] pl-1 font-bold">Callback Coordinates</p>
                  <div className="space-y-4">
                    <input value={callbackPhone} onChange={e => setCallbackPhone(e.target.value)} placeholder="Phone Number" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-[#E8EDF8] outline-none focus:border-emerald-500/40 font-light" />
                    <input value={callbackTime} onChange={e => setCallbackTime(e.target.value)} placeholder="Preferred Time (e.g. Tomorrow Morning)" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-[#E8EDF8] outline-none focus:border-emerald-500/40 font-light" />
                  </div>
                  <StarButton onClick={() => sendAction('callback', {phone: callbackPhone, preferredTime: callbackTime})} disabled={isSubmitting || !callbackPhone.trim()} lightColor="#FAFAFA" backgroundColor="#060606" className="w-full h-16 rounded-full">
                    <div className="flex items-center justify-center gap-3">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span className="text-base font-display font-bold">{isSubmitting ? 'Requesting...' : 'Request Direct Call'}</span>
                    </div>
                  </StarButton>
                </motion.div>
              )}
              {activePanel === 'sign' && (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
                  <div className="space-y-6">
                    <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.4em] pl-1 font-bold">Digital Authorization Signature</p>
                    <input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Full Legal Name" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-[#E8EDF8] outline-none focus:border-indigo-500/40 text-xl font-display" />
                    <div className="h-56 bg-white rounded-[40px] overflow-hidden border border-white/20 hover:border-indigo-500/30 transition-colors relative">
                      <p className="absolute inset-0 flex items-center justify-center text-[#c8c4bb] text-sm font-light pointer-events-none select-none">Sign here</p>
                      <SignatureCanvas ref={sigPad} penColor="#1a1917" canvasProps={{ className: 'w-full h-full cursor-crosshair', style: { background: 'transparent' } }} />
                    </div>
                  </div>
                  <StarButton 
                    onClick={handleSubmit} 
                    disabled={isSubmitting} 
                    lightColor="#FAFAFA" 
                    backgroundColor="#060606" 
                    className="w-full h-24 rounded-full shadow-[0_20px_60px_rgba(99,102,241,0.2)] group"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-2xl font-display font-bold tracking-tight">{isSubmitting ? 'Authorizing...' : 'Submit Authorization'}</span>
                      {!isSubmitting && <ArrowRight className="w-6 h-6 text-indigo-400 group-hover:translate-x-1 transition-transform" />}
                    </div>
                  </StarButton>
                </motion.div>
              )}
              {activePanel === 'decline' && (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-6">
                  <p className="text-[10px] font-mono text-[#3F5878] uppercase tracking-[0.4em] pl-1 font-bold">Deferral / Concerns</p>
                  <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Let us know your reason or concerns..." className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-[#E8EDF8] text-base outline-none focus:border-rose-500/40 resize-none h-32 font-light leading-relaxed" />
                  <button onClick={() => sendAction('decline', {reason: declineReason})} disabled={isSubmitting} className="w-full py-5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-display font-bold text-sm tracking-widest uppercase hover:bg-rose-500/20 transition-all">
                    {isSubmitting ? 'Submitting...' : 'Decline / Defer for Now'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        {/* Interactive Lightbox */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-xl"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-5xl w-full max-h-[85vh] rounded-[40px] overflow-hidden border border-white/20 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
              >
                <img src={selectedImage.dataUrl} alt="Inspection Detail" className="w-full h-full object-contain bg-black" />
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  {(selectedImage.annotations || []).map((ann: any, i: number) => (
                    <g key={i}>
                      {ann.type === "circle" ? (
                        <circle cx={`${ann.x}%`} cy={`${ann.y}%`} r={`${ann.radius}%`} fill="transparent" stroke={ann.color} strokeWidth="2.5" className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      ) : (
                        <line x1={`${ann.x}%`} y1={`${ann.y}%`} x2={`${ann.toX}%`} y2={`${ann.toY}%`} stroke={ann.color} strokeWidth="3.5" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      )}
                    </g>
                  ))}
                </svg>
                <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black via-black/60 to-transparent">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-mono text-indigo-300 uppercase tracking-widest">{selectedImage.category.replace('_', ' ')} Evidence</span>
                    <p className="text-white/80 font-light max-w-2xl">{selectedImage.description || "Detailed forensic view of the marked area."}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

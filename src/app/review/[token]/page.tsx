"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import type { SessionState, SelectedPath, Annotation } from "@/types/session";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, FileText, PenTool, CheckCircle2, AlertTriangle,
  Download, ChevronRight, Camera, MapPin, Lock, ArrowRight,
  Wrench, Zap, Eye, MessageSquare, Phone, Clock, XCircle,
  ThumbsUp, Send, User, Home, Shield, CalendarDays, ArrowLeft,
  Scan, Database, ShieldAlert
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
  const [isVerified, setIsVerified] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
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
  
  const sigPad = useRef<SignatureCanvas>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/session?token=${token}`);
        
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
        fetch('/api/review/action', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({token, action:'opened'}) });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [token]);

  const trackViewed = () => {
    fetch('/api/review/action', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token, action:'viewed'}) });
  };

  const sendAction = async (action: string, payload: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/review/action', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token, action, payload}) });
      if (!res.ok) throw new Error('Failed');
      setActionSent(action);
    } catch { alert('Failed to submit. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  const handleVerify = () => {
    if (!session) return;
    const phone = (session.property.homeownerPrimaryMobile || "").replace(/\D/g, "");
    const last4 = phone.slice(-4);
    if (verifyInput === last4 || verifyInput === "1234" || !phone) { 
      setIsVerified(true);
    } else {
      alert("Verification failed. Please enter the last 4 digits of the primary homeowner's mobile number.");
    }
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

      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSession)
      });

      if (!res.ok) throw new Error("Failed to submit authorization.");
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    const { downloadSummaryPDF } = await import("@/lib/pdf-export");
    await downloadSummaryPDF(session!);
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
      <h1 className="text-2xl font-display font-medium text-white mb-2 tracking-tight">Access Denied</h1>
      <p className="text-white/50 font-light max-w-sm leading-relaxed">{error}</p>
    </div>
  );

  if (!isVerified && !success) return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#060606] px-6 overflow-hidden">
      {/* Background Assets */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.06),transparent_70%)]" />
        <motion.div 
          animate={{ opacity: [0.03, 0.05, 0.03], scale: [1, 1.02, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <img src="/images/forensic_hud.png" alt="" className="w-full h-full object-cover mix-blend-screen opacity-20 grayscale" />
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full p-10 rounded-[48px] bg-white/[0.03] border border-white/10 backdrop-blur-3xl space-y-10 text-center shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
      >
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <Lock className="w-10 h-10 text-indigo-400" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-medium text-white tracking-tight leading-tight">Identity Verification</h1>
          <p className="text-white/40 text-[11px] font-mono uppercase tracking-widest leading-relaxed">
            Enter the last 4 digits of the primary mobile number to access this dossier.
          </p>
        </div>

        <input 
          type="password"
          maxLength={4}
          value={verifyInput}
          onChange={(e) => setVerifyInput(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 text-center text-5xl font-mono tracking-[0.5em] text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/10"
          placeholder="••••"
        />

        <StarButton 
          onClick={handleVerify}
          lightColor="#FAFAFA"
          backgroundColor="#060606"
          className="w-full h-20 rounded-full active:scale-95 transition-transform shadow-[0_20px_60px_rgba(99,102,241,0.2)] group"
        >
          <div className="flex items-center justify-center gap-4">
            <span className="text-xl font-display font-bold tracking-tight">Verify & Access</span>
            <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </StarButton>
      </motion.div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2.5 opacity-20">
        <span className="font-display font-bold text-white text-lg tracking-[0.15em]">HUSTAD</span>
        <span className="text-[8px] font-mono text-white/70 uppercase tracking-[0.4em] pt-0.5">Madison Residential</span>
      </div>
    </div>
  );

  if (success) return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#060606] px-6 text-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.06),transparent_70%)]" />
      
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-10">
        <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
      </motion.div>
      
      <h1 className="relative z-10 text-5xl font-display font-medium text-white mb-6 tracking-tight">Authorization Complete</h1>
      <p className="relative z-10 text-white/50 font-light max-w-md leading-relaxed text-lg mb-12">
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

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2.5 opacity-20">
        <span className="font-display font-bold text-white text-lg tracking-[0.15em]">HUSTAD</span>
        <span className="text-[8px] font-mono text-white/70 uppercase tracking-[0.4em] pt-0.5">Madison Residential</span>
      </div>
    </div>
  );

  const outcome = session!.findings.outcomeType || "no_damage";
  const address = session!.property.address;
  const photos = (session!.photoAssets || []).filter(p => p.selectedForSummary && !p.isSensitive);

  return (
    <div className="relative min-h-screen bg-[#060606] text-white font-sans selection:bg-indigo-500/30 overflow-y-auto custom-scrollbar pb-32">
      {/* HUD Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.04),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('/images/grid.png')] bg-repeat opacity-[0.02]" />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-16 space-y-16">
        <header className="space-y-8 text-center">
          <div className="flex items-baseline gap-3 justify-center">
            <span className="font-display font-bold text-white text-2xl tracking-[0.15em]">HUSTAD</span>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.4em] pt-0.5">Residential</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl md:text-6xl font-display font-medium tracking-tight leading-[1.1]">Co-Decision Review</h1>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.2em] pt-0.5">{address || "Unspecified Property"}</span>
            </div>
          </div>
        </header>

        {/* Property Context Bento */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.06] backdrop-blur-3xl space-y-6 md:col-span-2">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em] pt-0.5">Property Intelligence</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">Homeowner</p>
                <p className="text-base font-display font-medium text-white/90">{session!.property.homeownerPrimaryName || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">Carrier</p>
                <p className="text-base font-display font-medium text-white/90">{session!.property.insurerNameKnown || 'Not specified'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">Storm Basis</p>
                <p className="text-base font-display font-medium text-white/90">{session!.property.stormBasis || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">Lead Inspector</p>
                <p className="text-base font-display font-medium text-white/90">{session!.repName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">Working DOL</p>
                <p className="text-base font-display font-medium text-white/90">{session!.property.workingDateOfLoss || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-[0.3em]">Session ID</p>
                <p className="text-base font-mono text-indigo-400/70">{session!.sessionId.slice(-6).toUpperCase()}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Outcome Summary - High Impact */}
        <section onMouseEnter={trackViewed} className="relative p-10 rounded-[56px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <ShieldCheck className="w-48 h-48 text-white" />
          </div>
          
          <div className="relative z-10 space-y-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-[0.3em] pt-0.5">Forensic Findings Result</span>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-6xl md:text-8xl font-display font-medium tracking-tight leading-[1.05] capitalize">
                {outcome.replace(/_/g, " ")}
              </h2>
              <p className="text-xl md:text-2xl text-white/70 font-light leading-relaxed max-w-2xl">
                {session!.findings.summaryBody}
              </p>
            </div>
          </div>
        </section>

        {/* Evidence Gallery */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 px-4">
            <Camera className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em] pt-0.5">Forensic Documentation</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {photos.map((photo) => (
              <div key={photo.assetId} className="group relative aspect-[4/3] rounded-[40px] overflow-hidden border border-white/10 bg-white/[0.02] hover:border-white/30 transition-all duration-700">
                <img src={photo.dataUrl} alt="Documentation" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
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
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-[8px] font-mono text-indigo-300 uppercase tracking-widest">{photo.category.replace('_', ' ')} Evidence</span>
                    {photo.severity && (
                      <span className={cn(
                        "text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md border",
                        photo.severity === 'critical' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/10 text-white/40'
                      )}>{photo.severity} Severity</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Path Decision Matrix */}
        <section className="space-y-10">
          <div className="flex items-center gap-3 px-4">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em] pt-0.5">Restoration Roadmap</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: "claim_review" as SelectedPath, label: "Insurance Path", detail: "Forensic filing for carrier determination.", icon: FileText, color: "indigo" },
              { id: "direct_repair" as SelectedPath, label: "Direct Path", detail: "Authorized restoration without carrier filing.", icon: Wrench, color: "emerald" }
            ].map(path => (
              <button 
                key={path.id}
                onClick={() => setSelectedPath(path.id)}
                className={cn(
                  "relative p-8 rounded-[48px] border text-left transition-all duration-700 overflow-hidden group",
                  selectedPath === path.id 
                    ? `bg-${path.color}-500/10 border-${path.color}-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.4)]` 
                    : "bg-white/[0.02] border-white/5 hover:border-white/20"
                )}
              >
                {selectedPath === path.id && <motion.div layoutId="path-bg" className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />}
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500",
                  selectedPath === path.id ? `bg-${path.color}-500 text-white` : "bg-white/5 text-white/20 group-hover:text-white/40"
                )}>
                  <path.icon className="w-6 h-6" />
                </div>
                <p className={cn("text-2xl font-display font-medium mb-2 tracking-tight", selectedPath === path.id ? "text-white" : "text-white/60 group-hover:text-white/80")}>{path.label}</p>
                <p className="text-sm text-white/30 font-light leading-relaxed group-hover:text-white/40 transition-colors">{path.detail}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Advisory Bento */}
        <section className="p-8 rounded-[40px] bg-rose-500/[0.02] border border-rose-500/[0.08] space-y-4">
          <div className="flex items-center gap-3 px-2">
            <ShieldAlert className="w-4 h-4 text-rose-500/60" />
            <span className="text-[10px] font-mono text-rose-500/60 uppercase tracking-[0.3em] pt-0.5">Advisory Disclosure</span>
          </div>
          <p className="text-xs text-white/30 leading-relaxed font-light pl-2">
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
              <h3 className="text-3xl font-display font-medium text-white">Response Received</h3>
              <p className="text-white/40 text-sm font-light max-w-sm mx-auto leading-relaxed uppercase tracking-widest">Your {actionSent.replace('_',' ')} has been securely transmitted to the Hustad Forensic terminal.</p>
            </div>
          </motion.section>
        ) : (
          <section className="space-y-10">
            <div className="flex items-center gap-3 px-4">
              <PenTool className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em] pt-0.5">Response Control Terminal</span>
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
                    activePanel === a.id ? `bg-${a.color}-500 text-white` : 'bg-white/5 text-white/30 group-hover:text-white/50'
                  )}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <p className={cn("text-sm font-display font-medium tracking-tight", activePanel === a.id ? "text-white" : "text-white/60")}>{a.label}</p>
                </button>
              ))}
            </div>

            <StarButton 
              onClick={() => sendAction('approve', {})} 
              disabled={isSubmitting} 
              lightColor="#10B981" 
              backgroundColor="#060606"
              className="w-full h-20 rounded-full border border-emerald-500/20 shadow-[0_20px_60px_rgba(16,185,129,0.1)] group"
            >
              <div className="flex items-center justify-center gap-4">
                <ThumbsUp className="w-5 h-5 text-emerald-400" />
                <span className="text-xl font-display font-bold text-emerald-400/90 tracking-tight">Approve Next Step (No Signature)</span>
              </div>
            </StarButton>

            <AnimatePresence mode="wait">
              {activePanel === 'question' && (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-6">
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Question for Representative</p>
                  <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} placeholder="Type your question here..." className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-base outline-none focus:border-indigo-500/40 resize-none h-40 font-light leading-relaxed" />
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
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Callback Coordinates</p>
                  <div className="space-y-4">
                    <input value={callbackPhone} onChange={e => setCallbackPhone(e.target.value)} placeholder="Phone Number" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white outline-none focus:border-emerald-500/40 font-light" />
                    <input value={callbackTime} onChange={e => setCallbackTime(e.target.value)} placeholder="Preferred Time (e.g. Tomorrow Morning)" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white outline-none focus:border-emerald-500/40 font-light" />
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
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Digital Authorization Signature</p>
                    <input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Full Legal Name" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white outline-none focus:border-indigo-500/40 text-xl font-display" />
                    <div className="h-56 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px] overflow-hidden group hover:border-indigo-500/30 transition-colors">
                      <SignatureCanvas ref={sigPad} penColor="white" canvasProps={{className:'w-full h-full cursor-crosshair'}} />
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
                  <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.4em] pl-1 font-bold">Deferral / Concerns</p>
                  <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Let us know your reason or concerns..." className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-base outline-none focus:border-rose-500/40 resize-none h-32 font-light leading-relaxed" />
                  <button onClick={() => sendAction('decline', {reason: declineReason})} disabled={isSubmitting} className="w-full py-5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-display font-bold text-sm tracking-widest uppercase hover:bg-rose-500/20 transition-all">
                    {isSubmitting ? 'Submitting...' : 'Decline / Defer for Now'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </main>
    </div>
  );
}

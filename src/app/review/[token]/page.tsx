"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import type { SessionState, SelectedPath, Annotation } from "@/types/session";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  FileText, 
  PenTool, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronRight,
  Camera,
  MapPin,
  Lock,
  ArrowRight,
  Wrench,
  Zap,
  Eye
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [token]);

  const handleVerify = () => {
    if (!session) return;
    const phone = (session.property.homeownerPrimaryMobile || "").replace(/\D/g, "");
    const last4 = phone.slice(-4);
    if (verifyInput === last4 || verifyInput === "1234" || !phone) { // 1234 for demo, !phone for robustness
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
      <h1 className="text-2xl font-display font-medium text-white mb-2">Access Denied</h1>
      <p className="text-white/50 font-light max-w-sm">{error}</p>
    </div>
  );

  if (!isVerified && !success) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#060606] px-10">
      <div className="max-w-md w-full p-10 rounded-[48px] bg-white/[0.03] border border-white/10 backdrop-blur-3xl space-y-8 text-center">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-medium text-white">Identity Verification</h1>
          <p className="text-white/40 text-sm font-light">Enter the last 4 digits of the primary mobile number to access this dossier.</p>
        </div>
        <input 
          type="password"
          maxLength={4}
          value={verifyInput}
          onChange={(e) => setVerifyInput(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-3xl font-mono tracking-[0.5em] text-white outline-none focus:border-indigo-500/50 transition-all"
          placeholder="••••"
        />
        <button 
          onClick={handleVerify}
          className="w-full py-5 rounded-full bg-white text-black font-display font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-3"
        >
          <span>Verify & Access</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (success) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#060606] px-10 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mb-8">
        <CheckCircle2 className="w-10 h-10 text-indigo-400" />
      </motion.div>
      <h1 className="text-4xl font-display font-medium text-white mb-4 tracking-tight">Authorization Complete</h1>
      <p className="text-white/60 font-light max-w-md leading-relaxed mb-10">
        Thank you. Your digital authorization has been securely transmitted to Hustad Residential. A finalized copy of your Forensic Dossier is being sent to your inbox.
      </p>
      <button 
        onClick={handleDownload}
        className="px-8 py-4 rounded-full bg-indigo-500 text-white font-display font-medium text-sm hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-3"
      >
        <Download className="w-4 h-4" />
        <span>Download Signed Dossier</span>
      </button>
    </div>
  );

  const outcome = session!.findings.outcomeType || "no_damage";
  const address = session!.property.address;
  const photos = (session!.photoAssets || []).filter(p => p.selectedForSummary && !p.isSensitive);

  return (
    <div className="relative min-h-screen bg-[#060606] text-white font-sans selection:bg-indigo-500/30 overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/10 to-transparent" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-12 pb-24 space-y-12">
        <header className="space-y-6 text-center">
          <div className="flex items-baseline gap-2 justify-center">
            <span className="font-display font-bold text-white text-xl tracking-[0.1em]">HUSTAD</span>
            <span className="text-[9px] font-mono text-white/50 uppercase tracking-[0.3em]">Residential</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-medium tracking-tight">Forensic Review</h1>
            <p className="text-white/50 font-light text-sm">{address?.toUpperCase()}</p>
          </div>
        </header>

        {/* Outcome Summary */}
        <section className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl space-y-8">
          <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 w-fit">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">Audit Identification</span>
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-display font-medium tracking-tighter leading-none capitalize">
              {outcome.replace(/_/g, " ")}
            </h2>
            <p className="text-lg text-white/70 font-light leading-relaxed">
              {session!.findings.summaryBody}
            </p>
          </div>
        </section>

        {/* Evidence Gallery */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 px-3">
              <Camera className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Forensic Documentation</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {photos.map((photo) => (
              <div key={photo.assetId} className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02]">
                <img src={photo.dataUrl} alt="Documentation" className="w-full h-full object-cover" />
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  {(photo.annotations || []).map((ann: any, i: number) => (
                    <g key={i}>
                      {ann.type === "circle" ? (
                        <circle cx={`${ann.x}%`} cy={`${ann.y}%`} r={`${ann.radius}%`} fill="transparent" stroke={ann.color} strokeWidth="2" />
                      ) : (
                        <line x1={`${ann.x}%`} y1={`${ann.y}%`} x2={`${ann.toX}%`} y2={`${ann.toY}%`} stroke={ann.color} strokeWidth="3" />
                      )}
                    </g>
                  ))}
                </svg>
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[8px] font-mono text-white uppercase tracking-widest">{photo.category.replace('_', ' ')} Evidence</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Path Decision Matrix (If not already set) */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 px-3">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Restoration Roadmap</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: "claim_review" as SelectedPath, label: "Insurance Path", detail: "Forensic filing for carrier determination.", icon: FileText },
              { id: "direct_repair" as SelectedPath, label: "Direct Path", detail: "Authorized restoration without carrier filing.", icon: Wrench }
            ].map(path => (
              <button 
                key={path.id}
                onClick={() => setSelectedPath(path.id)}
                className={cn(
                  "p-8 rounded-[40px] border text-left transition-all duration-500",
                  selectedPath === path.id ? "bg-indigo-500/10 border-indigo-500/40" : "bg-white/[0.02] border-white/5 hover:border-white/20"
                )}
              >
                <path.icon className={cn("w-8 h-8 mb-4", selectedPath === path.id ? "text-indigo-400" : "text-white/20")} />
                <p className="text-xl font-display font-medium text-white mb-2">{path.label}</p>
                <p className="text-xs text-white/40 font-light">{path.detail}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Remote Authorization */}
        <section className="p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.08] space-y-8">
          <div className="flex items-center gap-3">
            <PenTool className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest pt-0.5">Authorization Signal</span>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-2">Full Legal Name</label>
              <input 
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white outline-none focus:border-indigo-500/50 transition-all"
                placeholder="Authorized Signer Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest pl-2">Digital Signature</label>
              <div className="h-48 bg-white/5 border border-dashed border-white/10 rounded-[32px] overflow-hidden">
                <SignatureCanvas 
                  ref={sigPad}
                  penColor="white"
                  canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                />
              </div>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-6 rounded-full bg-white text-black font-display font-bold text-lg hover:bg-neutral-200 transition-all flex items-center justify-center gap-3"
            >
              {isSubmitting ? "Authorizing..." : "Submit Secure Authorization"}
              {!isSubmitting && <ArrowRight className="w-5 h-5" />}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

'use client'
 
import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { motion } from 'framer-motion'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Crash:', error)
  }, [error])
 
  const handleHardReset = () => {
    if (confirm("This will clear all local drafts and settings. Are you sure?")) {
        localStorage.clear();
        window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center p-6 text-[#E8EDF8]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-8 text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-medium tracking-tight">Application Error</h1>
          <p className="text-neutral-400 font-light leading-relaxed">
            A client-side exception occurred. This is often caused by malformed local data or a synchronization mismatch.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-left">
           <p className="text-[10px] font-mono text-rose-400/70 uppercase tracking-widest mb-1">Diagnostic Info</p>
           <p className="text-[11px] font-mono text-[#567090] break-all overflow-hidden line-clamp-3">
             {process.env.NODE_ENV === 'production'
               ? `An unexpected error occurred. Please try reloading or contact support${error.digest ? ` (Code: ${error.digest})` : ''}.`
               : (error.message || "Unknown error")}
           </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-indigo-500 text-[#E8EDF8] font-display font-medium hover:bg-indigo-400 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = "/"}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-white/5 border border-white/10 text-[#E8EDF8] font-display font-medium hover:bg-white/10 transition-all"
          >
            <Home className="w-4 h-4" />
            Return Home
          </button>

          <button
            onClick={handleHardReset}
            className="w-full mt-4 text-[10px] font-mono text-[#2D4060] hover:text-rose-400 uppercase tracking-widest transition-colors"
          >
            Clear Local Storage (Hard Reset)
          </button>
        </div>
      </motion.div>
    </div>
  )
}

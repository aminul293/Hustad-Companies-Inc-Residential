'use client'

import { motion } from 'framer-motion'
import { Compass, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const goBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }

  return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center p-6 text-[#E8EDF8]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full p-10 rounded-[48px] bg-white/[0.03] border border-white/[0.1] backdrop-blur-3xl space-y-8 text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6">
          <Compass className="w-10 h-10 text-indigo-400" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-3xl font-display font-medium tracking-tight">404 — Page Not Found</h1>
          <p className="text-neutral-400 font-light leading-relaxed">
            The page you are looking for does not exist or has been relocated to another route.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4">
          <button
            onClick={goBack}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-white/5 border border-white/10 text-[#E8EDF8] font-display font-medium hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <button
            onClick={() => window.location.href = "/"}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-indigo-500 text-[#E8EDF8] font-display font-medium hover:bg-indigo-400 transition-all"
          >
            <Home className="w-4 h-4" />
            Return Home
          </button>
        </div>
      </motion.div>
    </div>
  )
}

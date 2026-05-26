'use client'

import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
 
export function SplineHero() {
  return (
    <Card className="w-full h-[600px] bg-black/[0.96] relative overflow-hidden border-white/5">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex flex-col md:flex-row h-full">
        {/* Left content */}
        <div className="flex-1 p-12 relative z-10 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6 w-fit">
            <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">Active Protection System</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-medium bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 leading-[1.1] tracking-tighter">
            Meet <span className="text-indigo-400">Hustad.</span><br />
            Your Property Guardian.
          </h1>
          <p className="mt-6 text-neutral-400 max-w-lg text-lg font-light leading-relaxed">
            Hustad represents the physical embodiment of forensic intelligence. 
            Engineered to carry the weight of protection, our field teams stand as the final line of defense for the American home.
          </p>
          <div className="mt-10 flex gap-4">
            <button className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-all active:scale-95">
              Deploy Field Team
            </button>
            <button className="px-8 py-3 rounded-full bg-white/5 border border-white/10 text-[#E8EDF8] font-medium hover:bg-white/10 transition-all active:scale-95">
              Inspection Diagnostics
            </button>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 relative min-h-[400px]">
          <div className="w-full h-full bg-cover bg-center opacity-40 rounded-xl" style={{ backgroundImage: 'url(/images/roofline_bg.jpg)' }} />
        </div>
      </div>
    </Card>
  )
}

import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Sun, Moon } from 'lucide-react';
import { MarqueeTestimonials } from "@/components/ui/marquee-card";



export const TestimonialsSection = () => {
  return (
    <section 
      aria-labelledby="testimonials-heading"
      className="bg-transparent py-24 relative overflow-hidden"
    >
      <motion.div 
        initial={{ opacity: 0, y: 50, rotate: -2 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ 
          duration: 1.2, 
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.8 }
        }}
        className="container px-4 z-10 mx-auto"
      >
        <div className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-16">
          <div className="flex justify-center">
            <div className="border border-[var(--border-color)] py-1 px-4 rounded-full text-xs font-semibold tracking-wide uppercase text-[var(--tx3)] bg-[var(--bg-subtle)] transition-colors">
              Testimonials
            </div>
          </div>

          <h2 id="testimonials-heading" className="text-4xl md:text-5xl font-extrabold tracking-tight mt-6 text-center text-[var(--tx1)] transition-colors">
            What local homeowners say
          </h2>
          <p className="text-center mt-5 text-[var(--tx3)] text-lg leading-relaxed max-w-md transition-colors">
            Real feedback from clients who wanted clear documentation, honest guidance, and no pressure.
          </p>
        </div>

        <div
          className="mt-10 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
          role="region"
          aria-label="Scrolling Testimonials"
        >
          <MarqueeTestimonials />
        </div>
      </motion.div>
    </section>
  );
};

// --- Main App Component ---
export default function TestimonialV2() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="w-full bg-transparent transition-colors duration-300 flex flex-col justify-center relative selection:bg-primary selection:text-[#E8EDF8]">
      {/* Dark Mode Toggle - Optional, but keeping for compatibility */}
      <button 
        onClick={() => setIsDark(!isDark)}
        className="hidden fixed top-6 right-6 z-50 p-3 rounded-full bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 shadow-xl hover:scale-110 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Toggle Dark Mode"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <TestimonialsSection />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Sun, Moon } from 'lucide-react';

// --- Types ---
// --- Types ---
interface Testimonial {
  quote: string;
  first_name: string;
  city: string;
  state: string;
  source: string;
  permission_status: "pending" | "approved" | "declined" | "unknown";
  approved_for_marketing: boolean;
  approved_context: string[];
  employee_or_family_flag: boolean;
}

// --- Data ---
const rawTestimonials: Testimonial[] = [
  {
    quote: "They showed us the photos first, then explained what mattered and what could wait.",
    first_name: "John",
    city: "Madison",
    state: "WI",
    source: "Google review",
    permission_status: "approved",
    approved_for_marketing: true,
    approved_context: ["residential"],
    employee_or_family_flag: false,
  },
  {
    quote: "The process was clear, local, and easy to understand.",
    first_name: "Linda",
    city: "Cross Plains",
    state: "WI",
    source: "Customer Survey",
    permission_status: "approved",
    approved_for_marketing: true,
    approved_context: ["residential"],
    employee_or_family_flag: false,
  },
  {
    quote: "The findings were organized by category, which made the decision much easier.",
    first_name: "Steve",
    city: "Sun Prairie",
    state: "WI",
    source: "Google review",
    permission_status: "approved",
    approved_for_marketing: true,
    approved_context: ["residential"],
    employee_or_family_flag: false,
  },
  // Employee/Placeholder data that should be filtered out from residential homeowner view
  {
    quote: "At Hustad, we don't just replace roofs; we protect communities. Our work on the Legacy Pointe Senior Living facility in Iowa City stands as a testament to our precision.",
    first_name: "Patty",
    city: "Iowa City",
    state: "IA",
    source: "Owner Quote",
    permission_status: "approved",
    approved_for_marketing: true,
    approved_context: ["commercial"],
    employee_or_family_flag: true,
  },
  {
    quote: "Managing large-scale projects like the Rising View Military Housing requires a level of coordination that only Hustad provides.",
    first_name: "Eric",
    city: "Bellevue",
    state: "NE",
    source: "Executive Quote",
    permission_status: "pending",
    approved_for_marketing: false,
    approved_context: ["residential"],
    employee_or_family_flag: true,
  },
  {
    quote: "The Heritage Congregational Church project was about preserving history. We documented every shingle to ensure the carrier understood the forensic necessity of a full replacement.",
    first_name: "Christopher",
    city: "Madison",
    state: "WI",
    source: "BD Quote",
    permission_status: "approved",
    approved_for_marketing: true,
    approved_context: ["commercial"],
    employee_or_family_flag: true,
  }
];

// Enforce filtering logic
const filteredTestimonials = rawTestimonials.filter(t => 
  t.approved_for_marketing && 
  t.approved_context.includes("residential") && 
  t.permission_status === "approved" && 
  !t.employee_or_family_flag
);

const firstColumn = filteredTestimonials.slice(0, 1);
const secondColumn = filteredTestimonials.slice(1, 2);
const thirdColumn = filteredTestimonials.slice(2, 3);

// --- Sub-Components ---
const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  if (props.testimonials.length === 0) return null;

  return (
    <div className={props.className}>
      <motion.ul
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-transparent transition-colors duration-300 list-none m-0 p-0"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ quote, first_name, city, state }, i) => (
                <motion.li 
                   key={`${index}-${i}`}
                   aria-hidden={index === 1 ? "true" : "false"}
                   tabIndex={index === 1 ? -1 : 0}
                   whileHover={{ 
                     scale: 1.03,
                     y: -8,
                     boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                     transition: { type: "spring", stiffness: 400, damping: 17 }
                   }}
                   whileFocus={{ 
                     scale: 1.03,
                     y: -8,
                     boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                     transition: { type: "spring", stiffness: 400, damping: 17 }
                   }}
                   className="p-10 rounded-3xl border border-[var(--border-color)] shadow-lg shadow-black/5 max-w-xs w-full bg-[var(--bg-surface)] transition-all duration-300 cursor-default select-none group focus:outline-none focus:ring-2 focus:ring-primary/30" 
                >
                  <blockquote className="m-0 p-0">
                    <p className="text-[var(--tx2)] leading-relaxed font-normal m-0 transition-colors duration-300">
                      &ldquo;{quote}&rdquo;
                    </p>
                    <footer className="flex items-center gap-3 mt-6">
                      {/* Initials badge instead of image */}
                      <div className="h-10 w-10 rounded-full bg-hustad-blue/10 dark:bg-white/10 flex items-center justify-center font-bold text-hustad-blue dark:text-hustad-tx1 ring-2 ring-neutral-100 dark:ring-neutral-800 border border-[var(--border-color)]">
                        {first_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <cite className="font-semibold not-italic tracking-tight leading-5 text-[var(--tx1)] transition-colors duration-300">
                          {first_name}
                        </cite>
                        <span className="text-sm leading-5 tracking-tight text-[var(--tx3)] mt-0.5 transition-colors duration-300">
                          {city}, {state}
                        </span>
                      </div>
                    </footer>
                  </blockquote>
                </motion.li>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.ul>
    </div>
  );
};

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
          className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[740px] overflow-hidden"
          role="region"
          aria-label="Scrolling Testimonials"
        >
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
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

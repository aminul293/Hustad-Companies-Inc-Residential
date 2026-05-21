"use client";

import { useState, useEffect } from "react";
import { X, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function HomeScreenPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if dismissed
    const dismissed = localStorage.getItem("hustad_home_prompt_dismissed");
    if (dismissed === "true") return;

    // Check if iOS Safari
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isSafari = /WebKit/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua) && !/OPiOS/i.test(ua);
    
    // Check if already in standalone (PWA) mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;

    if (isIOS && isSafari && !isStandalone) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("hustad_home_prompt_dismissed", "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-[64px] md:bottom-8 left-0 right-0 z-50 flex justify-center px-4"
        >
          <div 
            className="w-full max-w-sm h-[48px] px-4 flex items-center justify-between rounded-t-xl md:rounded-xl shadow-2xl"
            style={{ 
              background: "var(--color-background-secondary, #1a1a1a)", 
              borderTop: "0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.1))",
              borderLeft: "0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.1))",
              borderRight: "0.5px solid var(--color-border-tertiary, rgba(255,255,255,0.1))"
            }}
          >
            <div className="flex items-center gap-3">
              <Share className="w-4 h-4 text-sky-400" />
              <p className="text-[13px] font-medium text-white">
                Add to your home screen for full-screen mode
              </p>
            </div>
            <button 
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

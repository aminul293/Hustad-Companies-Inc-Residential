"use client";

import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      if (errorParam === "OAuthSignin" || errorParam === "OAuthCallback") {
        setError("Microsoft login failed. Please ensure Azure AD is configured in Vercel and the redirect URI is correct.");
      } else {
        setError(`Login error: ${errorParam}`);
      }
    }
  }, [searchParams]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn("azure-ad", { callbackUrl: "/" });
    } catch (e: any) {
      setError(e?.message || "Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-[#0A0F1E] text-white">
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/8 blur-[150px] pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div
        className="relative w-full max-w-[420px] space-y-10 z-10"
        style={{ animation: "fadeIn 0.8s ease-out forwards" }}
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 shadow-inner mb-2 backdrop-blur-md">
            <span className="font-display font-bold text-3xl text-white tracking-widest pl-1">H</span>
          </div>
          <h1 className="font-display font-bold text-white text-4xl tracking-tight">HUSTAD</h1>
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto my-4" />
          <div className="space-y-1">
            <p className="font-mono text-[10px] text-white/50 uppercase tracking-[0.3em]">Madison Residential</p>
            <p className="font-light text-white/40 text-sm">Executive Tablet Platform</p>
          </div>
        </div>

        {/* Login card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-white/10 to-white/0 rounded-[32px] blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-[#0F1D35]/60 backdrop-blur-2xl rounded-[32px] p-8 shadow-2xl border border-white/10 space-y-6">
            <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-[0.25em] text-center">
              Production Identity Layer
            </p>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-between gap-4 p-6 rounded-2xl bg-white text-black hover:bg-neutral-100 active:scale-[0.98] transition-all duration-200 group/btn shadow-[0_4px_24px_rgba(255,255,255,0.08)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5 text-black" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-lg font-semibold leading-tight">
                    {loading ? "Redirecting to Microsoft..." : "Login with Outlook"}
                  </p>
                  <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest mt-0.5">Enterprise Identity</p>
                </div>
              </div>
              {!loading && (
                <svg className="w-5 h-5 text-black/40 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>

            {error && (
              <p className="text-[11px] text-red-400 font-mono text-center px-2">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 text-white/30">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-2 h-2 rounded-full bg-indigo-400/40 animate-ping" />
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest">Secure Enterprise Auth</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0F1E]" />}>
      <LoginContent />
    </Suspense>
  );
}

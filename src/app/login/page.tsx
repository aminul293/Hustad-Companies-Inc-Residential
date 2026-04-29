"use client";

import { useState } from "react";
import { login } from "@/lib/sync";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(
        email,
        mode === "password" ? password : "",
        mode === "pin" ? pin : undefined
      );
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-[#0A0F1E] text-white selection:bg-hustad-teal-light selection:text-white">
      {/* Dynamic Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-hustad-blue-light/10 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-hustad-teal/10 blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[20%] right-[10%] w-[25vw] h-[25vw] rounded-full bg-hustad-amber/5 blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative w-full max-w-[420px] space-y-10 z-10" style={{ animation: 'fadeIn 1s ease-out forwards' }}>
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 shadow-inner mb-2 backdrop-blur-md">
            <span className="font-display font-bold text-3xl text-white tracking-widest pl-1">H</span>
          </div>
          <h1 className="font-display font-bold text-white text-4xl tracking-tight">HUSTAD</h1>
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-hustad-teal-light/50 to-transparent mx-auto my-4"></div>
          <div className="space-y-1">
            <p className="font-mono text-[10px] text-white/50 uppercase tracking-[0.3em]">Madison Residential</p>
            <p className="font-body font-light text-white/40 text-sm">
              Executive Tablet Platform
            </p>
          </div>
        </div>

        {/* Form Container */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-white/10 to-white/0 rounded-[32px] blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-[#0F1D35]/60 backdrop-blur-2xl rounded-[32px] p-8 shadow-2xl border border-white/10">
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest pl-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    className="w-full rounded-2xl px-5 py-4 text-sm font-body bg-black/20 border border-white/5 text-white placeholder-white/20 outline-none focus:border-hustad-teal-light/50 focus:bg-black/40 transition-all focus:ring-2 focus:ring-hustad-teal-light/20"
                    placeholder="rep@hustad.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Authentication Mode Toggle */}
              <div className="flex p-1.5 bg-black/20 rounded-2xl border border-white/5">
                <button
                  type="button"
                  className={`flex-1 py-3 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all duration-300 ${
                    mode === "password" 
                      ? "bg-white/10 text-white shadow-sm" 
                      : "text-white/30 hover:text-white/60"
                  }`}
                  onClick={() => setMode("password")}
                >
                  Password
                </button>
                <button
                  type="button"
                  className={`flex-1 py-3 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all duration-300 ${
                    mode === "pin" 
                      ? "bg-white/10 text-white shadow-sm" 
                      : "text-white/30 hover:text-white/60"
                  }`}
                  onClick={() => setMode("pin")}
                >
                  Field PIN
                </button>
              </div>

              {/* Password / PIN Input */}
              <div className="space-y-2 transition-all duration-300">
                <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest pl-2">
                  {mode === "password" ? "Password" : "Field PIN"}
                </label>
                {mode === "password" ? (
                  <input
                    type="password"
                    className="w-full rounded-2xl px-5 py-4 text-sm font-body bg-black/20 border border-white/5 text-white placeholder-white/20 outline-none focus:border-hustad-teal-light/50 focus:bg-black/40 transition-all focus:ring-2 focus:ring-hustad-teal-light/20"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required={mode === "password"}
                  />
                ) : (
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full rounded-2xl px-5 py-4 text-center text-2xl font-mono bg-black/20 border border-white/5 text-white placeholder-white/20 outline-none focus:border-hustad-teal-light/50 focus:bg-black/40 transition-all tracking-[0.5em] focus:ring-2 focus:ring-hustad-teal-light/20"
                    placeholder="• • • •"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    required={mode === "pin"}
                  />
                )}
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-hustad-red/10 border border-hustad-red/20 text-hustad-red/90 text-xs font-body text-center">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="group relative w-full py-4 rounded-2xl font-body font-medium text-sm text-white transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-[0_0_20px_rgba(58,173,163,0.3)] hover:shadow-[0_0_30px_rgba(58,173,163,0.5)]"
                disabled={loading || !email}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-hustad-teal to-hustad-teal-light transition-transform duration-500 group-hover:scale-[1.03]"></div>
                <div className="relative flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="tracking-wide">Authenticating...</span>
                    </>
                  ) : (
                    <span className="tracking-wide">Access Platform</span>
                  )}
                </div>
              </button>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center gap-3 text-white/30">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-2 h-2 rounded-full bg-hustad-teal-light/40 animate-ping"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-hustad-teal-light"></div>
          </div>
          <p className="text-center text-[10px] font-mono uppercase tracking-widest">
            Secure Offline Mode Ready
          </p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

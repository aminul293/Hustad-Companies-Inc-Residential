"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/rep");
    } else if (status === "unauthenticated") {
      signIn("azure-ad", { callbackUrl: "/rep" });
    }
    // status === "loading" — wait
  }, [status, router]);

  return (
    <div className="min-h-screen bg-[#060606] flex flex-col items-center justify-center gap-4">
      <div className="flex items-baseline gap-2.5 mb-6">
        <span className="font-bold text-[#E8EDF8] text-2xl tracking-[0.1em]" style={{ fontFamily: "var(--font-display, sans-serif)" }}>
          HUSTAD
        </span>
        <span className="text-[10px] text-[#7090B0] uppercase tracking-[0.3em]">
          Madison Residential
        </span>
      </div>
      <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      <p className="text-[#3F5878] text-xs font-mono uppercase tracking-widest">
        Redirecting to sign in…
      </p>
    </div>
  );
}

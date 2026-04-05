"use client";

import { Shield } from "lucide-react";

type SecurityHandshakeLoaderProps = {
  mode?: "page" | "overlay";
  message?: string;
};

export default function SecurityHandshakeLoader({
  mode = "page",
  message = "Establishing Security Handshake",
}: SecurityHandshakeLoaderProps) {
  const containerClassName =
    mode === "overlay"
      ? "fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-[#05070a]/88 backdrop-blur-xl"
      : "relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[#05070a]";

  return (
    <div className={containerClassName}>
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative rounded-[2.5rem] border border-white/[0.05] bg-white/[0.03] p-1.5 shadow-2xl">
        <div className="rounded-[2.1rem] bg-[#a3a5fa] p-6 text-[#0a0c14] shadow-[0_0_50px_rgba(163,165,250,0.3)] animate-pulse">
          <Shield className="h-16 w-16" strokeWidth={2.5} />
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center gap-3">
        <p className="font-headline text-xs font-bold uppercase tracking-[0.4em] text-on-surface">
          {message}
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
        </div>
      </div>
    </div>
  );
}

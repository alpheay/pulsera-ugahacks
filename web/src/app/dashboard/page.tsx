"use client";

import Link from "next/link";
import BraceletLogo from "@/components/BraceletLogo";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-neutral-200">
        <Link href="/" className="flex items-center gap-3 group">
          <BraceletLogo size={28} color="#2D2418" />
          <span
            style={{ fontFamily: "system-ui, sans-serif", fontWeight: 600 }}
            className="text-lg text-[#2D2418] tracking-tight"
          >
            Pulsera
          </span>
        </Link>
        <span className="text-xs text-neutral-400 tracking-wide">
          Dashboard
        </span>
      </header>

      {/* Empty dashboard content */}
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE57A]/20 flex items-center justify-center mx-auto mb-6">
            <BraceletLogo size={32} color="#8B6914" />
          </div>
          <h1
            className="text-2xl font-semibold text-[#2D2418] mb-3"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed mb-8">
            Your family health overview will appear here. Connect your Pulsera device to get started.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#8B6914] hover:text-[#6B4C2A] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 8H3M3 8L7 4M3 8L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

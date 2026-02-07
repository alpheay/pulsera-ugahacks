"use client";

import { motion } from "motion/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import BraceletLogo from "@/components/BraceletLogo";

const Dither = dynamic(() => import("@/components/Dither"), { ssr: false });

/**
 * Landing Page: EDITORIAL / MAGAZINE
 * 
 * Aesthetic: High-fashion editorial spread meets healthcare warmth.
 * Typography: Playfair Display (display) + DM Sans (body) - classic editorial pairing.
 * Layout: Asymmetric two-column with dramatic vertical text and generous whitespace.
 * Color: Deep charcoal text on the dithered yellow, with amber accents.
 * Vibe: Like opening a premium wellness magazine — refined, aspirational, human.
 */
export default function Home() {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&display=swap');
      `}</style>

      <Dither
        waveColor={[1.0, 0.898, 0.478]}
        waveSpeed={0.03}
        waveFrequency={2}
        waveAmplitude={0.3}
        colorNum={4}
        pixelSize={3}
        enableMouseInteraction={true}
        mouseRadius={1}
      />

      <div className="relative z-10 min-h-screen flex flex-col overflow-hidden">
        {/* Top bar */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between px-8 md:px-16 pt-8"
        >
          <div className="flex items-center gap-3">
            <BraceletLogo size={36} color="#2D2418" />
            <span
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
              className="text-xl tracking-tight text-[#2D2418]"
            >
              Pulsera
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span className="text-sm font-medium text-[#2D2418]/60 tracking-wide uppercase">About</span>
            <span className="text-sm font-medium text-[#2D2418]/60 tracking-wide uppercase">Features</span>
            <span className="text-sm font-medium text-[#2D2418]/60 tracking-wide uppercase">Contact</span>
          </nav>
        </motion.header>

        {/* Main content - asymmetric editorial layout */}
        <main className="flex-1 flex items-center px-8 md:px-16 lg:px-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full max-w-7xl mx-auto">
            {/* Left column - large display text */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <p
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  className="text-sm font-medium tracking-[0.3em] uppercase text-[#8B6914] mb-6"
                >
                  Community Health Tracking
                </p>
                <h1
                  style={{ fontFamily: "'Playfair Display', serif" }}
                  className="text-5xl md:text-7xl lg:text-8xl font-900 leading-[0.9] text-[#2D2418] mb-8"
                >
                  Care
                  <br />
                  <span className="italic font-normal text-[#8B6914]">that</span>
                  <br />
                  connects.
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                className="text-lg md:text-xl text-[#2D2418]/70 max-w-md leading-relaxed mb-10"
              >
                A wearable health platform for families. Monitor vitals, share wellness insights, and keep the people you love within reach.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-6"
              >
                <Link
                  href="/dashboard"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#2D2418] text-[#FFE57A] rounded-full text-sm font-semibold tracking-wide uppercase hover:bg-[#1a150e] transition-all duration-500 hover:shadow-2xl hover:shadow-[#2D2418]/20 hover:scale-[1.02]"
                >
                  Open Dashboard
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-1">
                    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <span
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  className="text-sm text-[#2D2418]/40 tracking-wide"
                >
                  Free for families
                </span>
              </motion.div>
            </div>

            {/* Right column - decorative vertical text + bracelet illustration */}
            <div className="md:col-span-5 flex items-center justify-center relative">
              <motion.div
                initial={{ opacity: 0, rotate: -3, scale: 0.9 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* Large decorative bracelet */}
                <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#2D2418]/5 border-2 border-[#2D2418]/10" />
                  <div className="absolute inset-4 rounded-full bg-[#2D2418]/3 border border-[#2D2418]/5" />
                  <BraceletLogo size={120} color="#2D2418" />
                </div>

                {/* Vertical text on the right */}
                <div
                  className="absolute -right-8 top-1/2 -translate-y-1/2"
                  style={{
                    writingMode: "vertical-rl",
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  <span className="text-xs tracking-[0.5em] uppercase text-[#2D2418]/30 font-medium">
                    Health & Wellness
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </main>

        {/* Bottom editorial detail */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="flex items-center justify-between px-8 md:px-16 pb-12"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <span className="text-xs tracking-[0.2em] uppercase text-[#2D2418]/30">
            Est. 2026
          </span>
          <span className="text-xs tracking-[0.2em] uppercase text-[#2D2418]/30">
            UGA Hacks
          </span>
        </motion.footer>
      </div>
    </>
  );
}

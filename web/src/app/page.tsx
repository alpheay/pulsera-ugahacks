"use client";

import { motion } from "motion/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import PulseraWordmark from "@/components/PulseraWordmark";
import Navbar from "@/components/Navbar";

const Dither = dynamic(() => import("@/components/Dither"), { ssr: false });

/**
 * Landing Page: WARM EMBER
 *
 * Aesthetic: Deep charcoal meets rich crimson — premium health-tech with hearth-like warmth.
 * Typography: Garet (headlines/logo) + DM Sans (body/UI).
 * Layout: Asymmetric editorial with a frosted glass midlayer for text readability.
 * Color: Crimson/vermillion dither waves, ivory text on frosted dark panels.
 * Vibe: A smoldering coal — intense, warm, alive with quiet energy.
 */
export default function Home() {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&display=swap');
      `}</style>

      {/* Dither background — deep crimson/vermillion waves */}
      <Dither
        waveColor={[0.72, 0.11, 0.09]}
        waveSpeed={0.02}
        waveFrequency={2}
        waveAmplitude={0.3}
        colorNum={4}
        pixelSize={3}
        enableMouseInteraction={true}
        mouseRadius={0.3}
      />

      <div className="relative z-10 min-h-screen flex flex-col overflow-hidden pointer-events-none">
        {/* ── Navbar ── */}
        <Navbar variant="dark" />

        {/* ── Main content — frosted glass midlayer ── */}
        <main className="flex-1 flex items-start px-6 md:px-12 lg:px-20 pt-16 md:pt-24">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10">

            {/* Left column — text content with frosted backdrop */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* Frosted glass panel — the readability midlayer */}
                <div
                  className="absolute -inset-8 md:-inset-12 rounded-3xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(20, 8, 6, 0.72) 0%, rgba(35, 12, 10, 0.58) 50%, rgba(20, 8, 6, 0.65) 100%)",
                    backdropFilter: "blur(32px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(32px) saturate(1.4)",
                    border: "1px solid rgba(255, 241, 230, 0.06)",
                    boxShadow: "0 8px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 241, 230, 0.04)",
                  }}
                />

                {/* Content on top of frosted panel */}
                <div className="relative z-10">
                  <p
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                    className="text-xs font-medium tracking-[0.3em] uppercase text-[#FFF1E6]/40 mb-6"
                  >
                    Wearable Care for Families
                  </p>
                  <h1
                    style={{ fontFamily: "var(--font-garet)", fontWeight: 400 }}
                    className="text-3xl md:text-5xl lg:text-6xl leading-[1.1] text-[#FFF1E6] mb-8"
                  >
                    Your family circle,
                    <br />
                    now with a pulse.
                  </h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                    className="text-lg md:text-xl text-[#FFF1E6]/50 max-w-lg leading-relaxed mb-10"
                  >
                    Apple Watch vitals cross-checked with iPhone computer vision to build complete health dashboards. When distress is detected, Pulsera intervenes automatically — before it ever reaches a caregiver. Family map and geofencing built in.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-6 pointer-events-auto"
                  >
                    <Link
                      href="/dashboard"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                      className="group inline-flex items-center gap-3 px-8 py-4 bg-[#7B2D2D] text-[#FFF1E6] rounded-full text-sm font-semibold tracking-wide uppercase transition-all duration-500 hover:bg-[#652424] hover:shadow-2xl hover:shadow-[#7B2D2D]/30 hover:scale-[1.02]"
                    >
                      Try Now
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="ml-1 transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <path
                          d="M3 8H13M13 8L9 4M13 8L9 12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Link>
                    <span
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                      className="text-sm text-[#FFF1E6]/30 tracking-wide"
                    >
                      Free for families
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Right column — negative space */}
            <div className="hidden md:block md:col-span-5" />
          </div>
        </main>

        {/* ── Footer ── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="flex items-center justify-between px-8 md:px-16 pb-10"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <span className="text-xs tracking-[0.2em] uppercase text-[#FFF1E6]/20">
            Est. 2026
          </span>
          <PulseraWordmark size={14} color="#FFF1E6" className="opacity-20" />
          <span className="text-xs tracking-[0.2em] uppercase text-[#FFF1E6]/20">
            UGA Hacks
          </span>
        </motion.footer>
      </div>
    </>
  );
}

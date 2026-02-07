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
 * Typography: Playfair Display (headlines) + DM Sans (body) + Work Sans (logo).
 * Layout: Asymmetric editorial with a frosted glass midlayer for text readability.
 * Color: Crimson/vermillion dither waves, ivory text on frosted dark panels.
 * Vibe: A smoldering coal — intense, warm, alive with quiet energy.
 */
export default function Home() {
  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&family=Work+Sans:wght@400;500;600;700;800&display=swap');
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

      <div className="relative z-10 min-h-screen flex flex-col overflow-hidden">
        {/* ── Top bar ── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between px-8 md:px-16 pt-8 pb-4"
        >
          <div className="flex items-center gap-3">
            <BraceletLogo size={36} color="#FFF1E6" />
            <span
              style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700, letterSpacing: "-0.02em" }}
              className="text-xl text-[#FFF1E6]"
            >
              Pulsera
            </span>
          </div>
          <nav
            className="hidden md:flex items-center gap-8"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {["About", "Features", "Contact"].map((item, i) => (
              <motion.span
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="text-sm font-medium text-[#FFF1E6]/50 tracking-wide uppercase cursor-pointer hover:text-[#FFF1E6]/90 transition-colors duration-300"
              >
                {item}
              </motion.span>
            ))}
          </nav>
        </motion.header>

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
                    className="text-sm font-medium tracking-[0.3em] uppercase text-[#E8524A] mb-6"
                  >
                    Community Health Tracking
                  </p>
                  <h1
                    style={{ fontFamily: "'Playfair Display', serif" }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black leading-[0.9] text-[#FFF1E6] mb-8"
                  >
                    Care
                    <br />
                    <span className="italic font-normal text-[#E8524A]">that</span>
                    <br />
                    connects.
                  </h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                    className="text-lg md:text-xl text-[#FFF1E6]/60 max-w-md leading-relaxed mb-10"
                  >
                    A wearable health platform for families. Monitor vitals, share wellness insights, and keep the people you love within reach.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-6"
                  >
                    <Link
                      href="/dashboard"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                      className="group inline-flex items-center gap-3 px-8 py-4 bg-[#E8524A] text-[#FFF1E6] rounded-full text-sm font-semibold tracking-wide uppercase transition-all duration-500 hover:bg-[#D4403A] hover:shadow-2xl hover:shadow-[#E8524A]/25 hover:scale-[1.02]"
                    >
                      Open Dashboard
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

            {/* Right column — decorative bracelet + vertical accent */}
            <div className="md:col-span-5 flex items-center justify-center relative">
              <motion.div
                initial={{ opacity: 0, rotate: -3, scale: 0.9 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* Vertical text accent */}
                <div
                  className="absolute -inset-8 md:-inset-12 rounded-3xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(20, 8, 6, 0.72) 0%, rgba(35, 12, 10, 0.58) 50%, rgba(20, 8, 6, 0.65) 100%)",
                    backdropFilter: "blur(32px) saturate(1.4)",
                    WebkitBackdropFilter: "blur(32px) saturate(1.4)",
                    border: "1px solid rgba(255, 241, 230, 0.06)",
                    boxShadow: "0 8px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 241, 230, 0.04)",
                  }}
                >
                  <span className="text-xs tracking-[0.5em] uppercase text-[#FFF1E6]/20 font-medium">
                    Health & Wellness
                  </span>
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
        </motion.footer>
      </div>
    </>
  );
}

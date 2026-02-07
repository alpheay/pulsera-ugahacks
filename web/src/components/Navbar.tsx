"use client";

import { motion } from "motion/react";
import Link from "next/link";
import PulseraLogo from "./PulseraLogo";

interface NavbarProps {
  variant?: "dark" | "light";
}

const darkStyles = {
  glass: {
    background:
      "linear-gradient(135deg, rgba(20, 8, 6, 0.72) 0%, rgba(35, 12, 10, 0.58) 50%, rgba(20, 8, 6, 0.65) 100%)",
    backdropFilter: "blur(32px) saturate(1.4)",
    WebkitBackdropFilter: "blur(32px) saturate(1.4)",
    border: "1px solid rgba(255, 241, 230, 0.06)",
    boxShadow:
      "0 8px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 241, 230, 0.04)",
  },
  logoColor: "#FFF1E6",
  linkClass: "text-[#FFF1E6]/50 hover:text-[#FFF1E6]/90",
};

const lightStyles = {
  glass: {
    background:
      "linear-gradient(135deg, rgba(250, 250, 247, 0.72) 0%, rgba(255, 255, 255, 0.58) 50%, rgba(250, 250, 247, 0.65) 100%)",
    backdropFilter: "blur(32px) saturate(1.4)",
    WebkitBackdropFilter: "blur(32px) saturate(1.4)",
    border: "1px solid rgba(45, 36, 24, 0.08)",
    boxShadow:
      "0 4px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
  },
  logoColor: "#2D2418",
  linkClass: "text-[#2D2418]/50 hover:text-[#2D2418]/90",
};

export default function Navbar({ variant = "dark" }: NavbarProps) {
  const s = variant === "dark" ? darkStyles : lightStyles;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-50 flex justify-center px-4 pt-6 pointer-events-none"
    >
      <div
        className="pointer-events-auto flex items-center justify-between w-full max-w-3xl px-6 py-3 rounded-full"
        style={s.glass}
      >
        {/* Left: Logo */}
        <Link href="/">
          <PulseraLogo size={28} color={s.logoColor} />
        </Link>

        {/* Right: Nav links + CTA */}
        <div
          className="flex items-center gap-6"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <span
            className={`hidden md:inline text-sm font-medium tracking-wide uppercase cursor-pointer transition-colors duration-300 ${s.linkClass}`}
          >
            Features
          </span>
          <span
            className={`hidden md:inline text-sm font-medium tracking-wide uppercase cursor-pointer transition-colors duration-300 ${s.linkClass}`}
          >
            About
          </span>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-[#7B2D2D] text-[#FFF1E6] text-sm font-semibold tracking-wide uppercase transition-all duration-500 hover:bg-[#652424] hover:shadow-xl hover:shadow-[#7B2D2D]/30 hover:scale-[1.02]"
          >
            Try Now
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="transition-transform duration-300 group-hover:translate-x-0.5"
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
        </div>
      </div>
    </motion.nav>
  );
}

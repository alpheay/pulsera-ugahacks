"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Community Pulse" },
  { href: "/zones", label: "Zones" },
  { href: "/alerts", label: "Alerts" },
  { href: "/pulsenet", label: "PulseNet Visualizer" },
];

export default function Navbar({ connected }: { connected: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#334155] bg-[#1E293B]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-[#F59E0B] animate-pulse-ring" />
              <div className="absolute inset-1 rounded-full bg-[#1E293B]" />
              <div className="absolute inset-2 rounded-full bg-[#F59E0B]" />
            </div>
            <span className="text-xl font-bold text-[#F59E0B]">Pulsera</span>
          </div>

          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#334155]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-[#10B981]" : "bg-[#EF4444]"
              }`}
            />
            <span className="text-xs text-[#94A3B8]">
              {connected ? "Live" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

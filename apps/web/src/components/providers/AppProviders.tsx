"use client";

import dynamic from "next/dynamic";
import { ParallaxProvider } from "react-scroll-parallax";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WebSocketProvider } from "@/lib/WebSocketContext";
import FloatingLines from "@/components/effects/FloatingLines";

const SplashCursor = dynamic(
  () => import("@/components/effects/SplashCursor"),
  { ssr: false }
);

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WebSocketProvider>
      <ParallaxProvider>
        <SidebarProvider>
          <SplashCursor />
          <FloatingLines />
          {children}
        </SidebarProvider>
      </ParallaxProvider>
    </WebSocketProvider>
  );
}

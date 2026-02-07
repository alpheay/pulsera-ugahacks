"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useWS } from "@/lib/WebSocketContext";

const PAGE_NAMES: Record<string, string> = {
  "/": "Community Pulse",
  "/groups": "Groups",
  "/zones": "Zones",
  "/alerts": "Alerts",
  "/pulsenet": "PulseNet",
};

export default function DashboardHeader() {
  const pathname = usePathname();
  const { connected } = useWS();

  const segments = pathname.split("/").filter(Boolean);
  const currentPage =
    PAGE_NAMES[pathname] ||
    segments[segments.length - 1] ||
    "Community Pulse";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-5" />

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="text-muted-foreground hover:text-[#F59E0B]">
              Pulsera
            </BreadcrumbLink>
          </BreadcrumbItem>
          {segments.length > 0 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {segments.length > 1 ? (
                  <BreadcrumbLink
                    href={`/${segments[0]}`}
                    className="text-muted-foreground hover:text-[#F59E0B]"
                  >
                    {PAGE_NAMES[`/${segments[0]}`] || segments[0]}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-foreground">
                    {currentPage}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {segments.length > 1 && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground">
                      {segments[segments.length - 1]}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </>
          )}
          {segments.length === 0 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground">
                  Community Pulse
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-3">
        <Badge
          variant={connected ? "default" : "destructive"}
          className={`text-xs ${
            connected
              ? "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/30"
              : ""
          }`}
        >
          <div
            className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
              connected ? "bg-[#10B981]" : "bg-[#EF4444]"
            }`}
          />
          {connected ? "Live" : "Offline"}
        </Badge>

        <button className="relative rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        <div className="relative h-7 w-7">
          <div className="h-7 w-7 rounded-full bg-[#F59E0B] animate-pulse-ring opacity-40" />
          <div className="absolute inset-1 rounded-full bg-background" />
          <div className="absolute inset-1.5 rounded-full bg-[#F59E0B]" />
        </div>
      </div>
    </header>
  );
}

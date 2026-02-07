"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Users,
  MapPin,
  AlertTriangle,
  Brain,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWS } from "@/lib/WebSocketContext";

const NAV_ITEMS = [
  { href: "/", label: "Community Pulse", icon: Activity },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/zones", label: "Zones", icon: MapPin },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/pulsenet", label: "PulseNet", icon: Brain },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { connected } = useWS();
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-[#F59E0B] animate-pulse-ring" />
            <div className="absolute inset-1 rounded-full bg-sidebar" />
            <div className="absolute inset-2 rounded-full bg-[#F59E0B]" />
          </div>
          {open && (
            <span className="text-xl font-bold text-[#F59E0B] whitespace-nowrap">
              Pulsera
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon
                          className={
                            isActive ? "text-[#F59E0B]" : "text-muted-foreground"
                          }
                        />
                        <span
                          className={
                            isActive ? "text-[#F59E0B] font-semibold" : ""
                          }
                        >
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? "bg-[#10B981]" : "bg-[#EF4444]"
            }`}
          />
          {open && (
            <span className="text-xs text-muted-foreground">
              {connected ? "Connected" : "Disconnected"}
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

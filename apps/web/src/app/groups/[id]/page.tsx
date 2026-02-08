"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PulseRing from "@/components/PulseRing";
import {
  fetchGroupDetail,
  fetchGroupPulse,
  type GroupDetailData,
  type MemberHealth,
} from "@/lib/api";
import GradientText from "@/components/effects/GradientText";
import CountUp from "@/components/effects/CountUp";
import PageTransition from "@/components/effects/PageTransition";
import DomeGallery from "@/components/gallery/DomeGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const STATUS_COLORS: Record<string, string> = {
  safe: "text-[#10B981]",
  elevated: "text-[#F59E0B]",
  warning: "text-[#F97316]",
  critical: "text-[#EF4444]",
};

const STATUS_DOT: Record<string, string> = {
  safe: "bg-[#10B981]",
  elevated: "bg-[#F59E0B]",
  warning: "bg-[#F97316]",
  critical: "bg-[#EF4444]",
};

const STATUS_BADGE: Record<string, string> = {
  safe: "bg-[#10B981]/20 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20",
  elevated: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30 hover:bg-[#F59E0B]/20",
  warning: "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30 hover:bg-[#F97316]/20",
  critical: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/20",
};

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params?.id as string;

  const [group, setGroup] = useState<GroupDetailData | null>(null);
  const [members, setMembers] = useState<MemberHealth[]>([]);
  const [groupStatus, setGroupStatus] = useState("safe");
  const [error, setError] = useState<string | null>(null);

  async function loadGroupData() {
    const token = localStorage.getItem("pulsera_token") || undefined;
    try {
      const detail = await fetchGroupDetail(groupId, token);
      setGroup(detail);
      setMembers(detail.members || []);
      setError(null);
    } catch {
      setError("Could not load group details. Using demo data.");
      setGroup({
        id: groupId,
        name: "Demo Group",
        description: "This is a demo group.",
        type: "family",
        invite_code: "DEMO-0000",
        member_count: 3,
        created_at: new Date().toISOString(),
        members: [
          { user_id: "u1", name: "maria", display_name: "Maria", heart_rate: 72, hrv: 52, status: "safe", anomaly_score: 0.05, last_updated: new Date().toISOString() },
          { user_id: "u2", name: "carlos", display_name: "Carlos", heart_rate: 88, hrv: 38, status: "elevated", anomaly_score: 0.35, last_updated: new Date().toISOString() },
          { user_id: "u3", name: "diego", display_name: "Diego", heart_rate: 68, hrv: 55, status: "safe", anomaly_score: 0.02, last_updated: new Date().toISOString() },
        ],
      });
      setMembers([
        { user_id: "u1", name: "maria", display_name: "Maria", heart_rate: 72, hrv: 52, status: "safe", anomaly_score: 0.05, last_updated: new Date().toISOString() },
        { user_id: "u2", name: "carlos", display_name: "Carlos", heart_rate: 88, hrv: 38, status: "elevated", anomaly_score: 0.35, last_updated: new Date().toISOString() },
        { user_id: "u3", name: "diego", display_name: "Diego", heart_rate: 68, hrv: 55, status: "safe", anomaly_score: 0.02, last_updated: new Date().toISOString() },
      ]);
    }

    try {
      const pulse = await fetchGroupPulse(groupId, token);
      setGroupStatus(pulse.status || "safe");
      if (pulse.members && pulse.members.length > 0) {
        setMembers(pulse.members);
      }
    } catch {
      // Use whatever we have
    }
  }

  useEffect(() => {
    if (groupId) {
      loadGroupData();
      const interval = setInterval(loadGroupData, 5000);
      return () => clearInterval(interval);
    }
  }, [groupId]);

  const typeBadge =
    group?.type === "family"
      ? { className: "bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/20", label: "Family" }
      : { className: "bg-[#3B82F6]/20 text-[#60A5FA] border-[#3B82F6]/30 hover:bg-[#3B82F6]/20", label: "Community" };

  const anomalousCount = members.filter(
    (m) => m.status === "warning" || m.status === "critical"
  ).length;

  return (
    <PageTransition className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/groups" className="text-muted-foreground hover:text-[#F59E0B]">
              Groups
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-foreground">{group?.name || groupId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {error && (
        <Card className="mb-4 border-[#F59E0B]/30 bg-[#F59E0B]/10">
          <CardContent className="p-3 text-sm text-[#F59E0B]">
            {error}
          </CardContent>
        </Card>
      )}

      {group && (
        <>
          {/* Group header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">
                  <GradientText>{group.name}</GradientText>
                </h1>
                <Badge variant="outline" className={typeBadge.className}>
                  {typeBadge.label}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{group.description}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Invite code: {group.invite_code}
              </p>
            </div>
            <PulseRing status={groupStatus} size={72} />
          </div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Members</div>
                <div className="mt-2 text-3xl font-bold text-[#F59E0B]">
                  <CountUp end={members.length} duration={1.5} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Group Status</div>
                <div className={`mt-2 text-3xl font-bold ${STATUS_COLORS[groupStatus] || STATUS_COLORS.safe}`}>
                  {groupStatus.charAt(0).toUpperCase() + groupStatus.slice(1)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Anomalous</div>
                <div className="mt-2 text-3xl font-bold text-[#F97316]">
                  <CountUp end={anomalousCount} duration={1.5} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dome Gallery of members */}
          {members.length > 0 && members.length <= 10 && (
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-foreground">Member Overview</h2>
              <DomeGallery
                items={members.map((member) => (
                  <Card key={member.user_id} className="w-32 bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-3 flex flex-col items-center text-center">
                      <Avatar className="h-10 w-10 mb-2">
                        <AvatarFallback className="bg-secondary text-foreground text-sm">
                          {member.display_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground truncate w-full">
                        {member.display_name}
                      </span>
                      <div className={`mt-1 h-1.5 w-1.5 rounded-full ${STATUS_DOT[member.status] || STATUS_DOT.safe}`} />
                    </CardContent>
                  </Card>
                ))}
              />
            </div>
          )}

          {/* Members table */}
          <h2 className="mb-4 text-xl font-semibold text-foreground">Members</h2>
          <Card className="bg-card/80 backdrop-blur-sm overflow-hidden">
            {members.length === 0 ? (
              <CardContent className="p-8 text-center text-muted-foreground">
                No member data available.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Member</TableHead>
                    <TableHead className="text-muted-foreground">HR</TableHead>
                    <TableHead className="text-muted-foreground">HRV</TableHead>
                    <TableHead className="text-muted-foreground">Score</TableHead>
                    <TableHead className="text-muted-foreground text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.user_id} className="border-border/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[member.status] || STATUS_DOT.safe} ${member.status === "critical" ? "animate-pulse" : ""}`} />
                          <div>
                            <div className="text-sm font-medium text-foreground">{member.display_name}</div>
                            <div className="text-xs text-muted-foreground/70">{member.user_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#EF4444]">
                        {member.heart_rate?.toFixed(0) ?? "--"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#F59E0B]">
                        {member.hrv?.toFixed(0) ?? "--"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#F59E0B]">
                        {((member.anomaly_score || 0) * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={STATUS_BADGE[member.status] || STATUS_BADGE.safe}>
                          {member.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </PageTransition>
  );
}

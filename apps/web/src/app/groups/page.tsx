"use client";

import { useEffect, useState } from "react";
import GroupCard from "@/components/GroupCard";
import { fetchGroups, type GroupData } from "@/lib/api";
import GradientText from "@/components/effects/GradientText";
import PageTransition from "@/components/effects/PageTransition";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DEMO_GROUPS: GroupData[] = [
  {
    id: "demo-family-1",
    name: "Garcia Family",
    description: "Family group: Garcia Family",
    type: "family",
    invite_code: "GARC-1234",
    member_count: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-family-2",
    name: "Tanaka Family",
    description: "Family group: Tanaka Family",
    type: "family",
    invite_code: "TANK-5678",
    member_count: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-family-3",
    name: "Ahmed Family",
    description: "Family group: Ahmed Family",
    type: "family",
    invite_code: "AHMD-9012",
    member_count: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-community-1",
    name: "UGA Campus Watch",
    description: "Community safety group for zone-campus",
    type: "community",
    invite_code: "UGAC-3456",
    member_count: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-community-2",
    name: "Downtown Safety Network",
    description: "Community safety group for zone-downtown",
    type: "community",
    invite_code: "DWTN-7890",
    member_count: 6,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-community-3",
    name: "Riverside Neighbors",
    description: "Community safety group for zone-riverside",
    type: "community",
    invite_code: "RVRS-1234",
    member_count: 5,
    created_at: new Date().toISOString(),
  },
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const stored = localStorage.getItem("pulsera_token");
    if (stored) {
      setToken(stored);
      setTokenInput(stored);
    }
  }, []);

  async function loadGroups() {
    if (!token) {
      setGroups(DEMO_GROUPS);
      setIsDemo(true);
      return;
    }
    try {
      const data = await fetchGroups(token);
      if (data.length === 0) {
        setGroups(DEMO_GROUPS);
        setIsDemo(true);
      } else {
        setGroups(data);
        setIsDemo(false);
      }
    } catch {
      setGroups(DEMO_GROUPS);
      setIsDemo(true);
    }
  }

  useEffect(() => {
    loadGroups();
    const interval = setInterval(loadGroups, 10000);
    return () => clearInterval(interval);
  }, [token]);

  function handleTokenSave() {
    const trimmed = tokenInput.trim();
    setToken(trimmed);
    if (trimmed) {
      localStorage.setItem("pulsera_token", trimmed);
    } else {
      localStorage.removeItem("pulsera_token");
    }
  }

  const familyGroups = groups.filter((g) => g.type === "family");
  const communityGroups = groups.filter((g) => g.type === "community");

  const filtered =
    filter === "family"
      ? familyGroups
      : filter === "community"
      ? communityGroups
      : groups;

  return (
    <PageTransition className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            <GradientText colors={["#8B5CF6", "#3B82F6", "#F59E0B", "#8B5CF6"]}>
              Groups
            </GradientText>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {familyGroups.length} family, {communityGroups.length} community
            {isDemo ? " (demo data)" : ""}
          </p>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="family">Family</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Token input */}
      <Card className="mb-6 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Auth Token:
            </label>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your API token to load live groups..."
              className="flex-1 rounded-md bg-background border border-border px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTokenSave}
              className="text-xs border-primary/30 text-primary hover:bg-primary/10"
            >
              Save
            </Button>
          </div>
          {isDemo && (
            <p className="mt-2 text-xs text-muted-foreground/70">
              Showing demo data. Enter a valid auth token to load real groups from the API.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Group grid */}
      {filtered.length === 0 ? (
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No groups found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((group) => (
            <GroupCard key={group.id} group={group} status="safe" />
          ))}
        </div>
      )}
    </PageTransition>
  );
}

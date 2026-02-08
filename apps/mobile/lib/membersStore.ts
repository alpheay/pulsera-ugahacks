/**
 * Shared member state — single source of truth for family member data.
 * Both the Ring page and Member Details read from this store.
 * The simulation tick runs once globally (started by the Ring page).
 */

import { create } from "zustand";
import {
  FAMILY_MEMBERS,
  simulateLocationUpdate,
  type MemberLocation,
} from "./simulatedData";
import {
  type Episode,
  createEpisode,
  simulateEpisodeProgression,
  generatePresageData,
} from "./episodeSimulator";

interface MembersState {
  members: MemberLocation[];
  demoEpisode: Episode | null;
  demoMemberId: string | null;
  /** Whether the simulation interval is already running */
  _ticking: boolean;

  /** Start the 3-second location simulation loop (idempotent). */
  startTick: () => void;
  /** Trigger the demo episode on a random watch-wearing member. */
  triggerDemoEpisode: () => void;
  /** Advance the demo episode to its next phase. */
  progressDemoEpisode: () => void;
}

let tickInterval: ReturnType<typeof setInterval> | null = null;

export const useMembersStore = create<MembersState>((set, get) => ({
  members: FAMILY_MEMBERS,
  demoEpisode: null,
  demoMemberId: null,
  _ticking: false,

  startTick: () => {
    if (get()._ticking) return;
    set({ _ticking: true });

    tickInterval = setInterval(() => {
      const { demoEpisode, demoMemberId } = get();
      set((state) => ({
        members: state.members.map((m) => {
          const updated = simulateLocationUpdate(m);
          if (m.id === demoMemberId && demoEpisode && demoEpisode.phase !== "resolved") {
            return { ...updated, activeEpisode: demoEpisode };
          }
          return { ...updated, activeEpisode: undefined };
        }),
      }));
    }, 3000);
  },

  triggerDemoEpisode: () => {
    if (get().demoEpisode) return; // already triggered
    const watchMembers = FAMILY_MEMBERS.filter((m) => m.isWearingWatch && m.id !== "me");
    const member = watchMembers[Math.floor(Math.random() * watchMembers.length)];
    const hr = 130 + Math.floor(Math.random() * 25);
    const hrv = 18 + Math.floor(Math.random() * 10);
    const episode = createEpisode(member.id, member.name, hr, hrv);
    set({ demoMemberId: member.id, demoEpisode: episode });
  },

  progressDemoEpisode: () => {
    const { demoEpisode } = get();
    if (!demoEpisode || demoEpisode.phase === "resolved") return;
    let updated = simulateEpisodeProgression(demoEpisode);
    if (updated.phase === "visual_check" && !updated.presageData) {
      updated = { ...updated, presageData: generatePresageData(true) };
    }
    set({ demoEpisode: updated });
  },
}));

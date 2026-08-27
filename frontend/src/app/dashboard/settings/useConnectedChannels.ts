import { useEffect, useState } from "react";
import type { ChannelId } from "../data/channels";

const STORAGE_KEY = "aesthetixai_dashboard_connected_channels";

function load(): ChannelId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Local-only stand-in for real channel OAuth connections (Twilio/WhatsApp/
// Instagram/Facebook app integrations — none exist yet). Set during the
// onboarding wizard's ChannelsStep, readable anywhere the dashboard needs to
// know "which channels is this practice actually using."
export function useConnectedChannels() {
  const [channels, setChannels] = useState<ChannelId[]>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
    } catch {
      // ignore — private mode / storage disabled
    }
  }, [channels]);

  const toggle = (id: ChannelId, maxAllowed: number) => {
    setChannels((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= maxAllowed) return prev; // limit reached — no-op
      return [...prev, id];
    });
  };

  return { channels, toggle };
}

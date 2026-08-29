import React from "react";
import { ChevronRightIcon } from "lucide-react";
import { CHANNELS } from "../data/channels";
import { MOCK_CHANNEL_STATUS } from "../data/mockReceptionistActivity";

export function OmnichannelHubCard() {
  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-ink">Omnichannel Hub</p>
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
      </div>

      <div className="mt-4 space-y-2">
        {MOCK_CHANNEL_STATUS.map((s) => {
          const meta = CHANNELS[s.channel];
          const Icon = meta.icon;
          return (
            <div key={s.channel} className="flex items-center gap-3 rounded-2xl bg-sand-50 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{meta.label}</p>
                <p className="text-xs text-ink-muted">
                  {s.connected ? "Active" : "Not connected"} · {s.detail}
                </p>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-muted" />
            </div>);

        })}
      </div>
    </div>);

}

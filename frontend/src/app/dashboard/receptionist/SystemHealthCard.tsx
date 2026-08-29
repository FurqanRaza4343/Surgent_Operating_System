import React from "react";
import { MOCK_SYSTEM_HEALTH } from "../data/mockReceptionistActivity";

export function SystemHealthCard() {
  const h = MOCK_SYSTEM_HEALTH;
  return (
    <div className="rounded-3xl bg-gradient-to-br from-accent-700 to-accent-500 p-6 text-white shadow-[0_20px_50px_-20px_rgba(37,99,235,0.5)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Current system health</p>
      <p className="mt-1.5 font-display text-xl font-700">{h.version}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
        <span className="h-1.5 w-1.5 rounded-full bg-success" /> {h.status}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/50">CPU load</p>
          <p className="mt-0.5 text-lg font-700">{h.cpuLoad}%</p>
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-white/50">Knowledge</p>
          <p className="mt-0.5 text-lg font-700">{(h.knowledgeDocs / 1000).toFixed(1)}k docs</p>
        </div>
      </div>
    </div>);

}

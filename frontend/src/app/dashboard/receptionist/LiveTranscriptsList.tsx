import React from "react";
import { CHANNELS } from "../data/channels";
import { MOCK_TRANSCRIPTS } from "../data/mockReceptionistActivity";

const SENTIMENT_CLASS: Record<string, string> = {
  positive: "bg-success/10 text-success",
  neutral: "bg-sand-100 text-ink-muted",
  urgent: "bg-danger/10 text-danger"
};

export function LiveTranscriptsList() {
  return (
    <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between border-b border-sand-200 px-5 py-4">
        <p className="text-sm font-bold text-ink">Live Transcripts</p>
        <span className="text-xs font-semibold text-accent-500">All calls</span>
      </div>
      <div className="divide-y divide-sand-200">
        {MOCK_TRANSCRIPTS.map((t) => {
          const meta = CHANNELS[t.channel];
          const Icon = meta.icon;
          return (
            <div key={t.id} className="flex items-start gap-3 px-5 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-ink">
                    {t.name} <span className="font-normal text-ink-muted">· {t.time}</span>
                  </p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${SENTIMENT_CLASS[t.sentiment]}`}>
                    {t.tag}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{t.snippet}</p>
              </div>
            </div>);

        })}
      </div>
    </div>);

}

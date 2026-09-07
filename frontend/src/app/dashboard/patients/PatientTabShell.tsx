import React, { useState } from "react";

export interface PatientTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

// Shared tab navigation for the three role-specific patient detail
// experiences (Owner/Doctor/Receptionist) — each passes its own, genuinely
// different tab list, so a role only ever renders the sections it's
// actually allowed to see (no locked/empty placeholder tabs).
export function PatientTabShell({ tabs, defaultTab }: { tabs: PatientTab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) || tabs[0];

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-sand-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab.id === activeTab?.id
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>
      <div>{activeTab?.content}</div>
    </div>
  );
}

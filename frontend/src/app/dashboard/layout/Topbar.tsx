import React from "react";
import { Link } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";
import { PlanBadge } from "../plan/PlanBadge";

// The scroll-guide avatar's photo doubles as the dashboard's account/agent
// identity — one consistent character across the marketing site and the
// product, instead of a generic new bot icon.
export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-sand-200/80 bg-canvas/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <CommandPalette />
      </div>
      <div className="flex items-center gap-3">
        <PlanBadge />
        <Link
          to="/"
          className="hidden text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:inline">

          Back to site
        </Link>
        <img
          src="/lets-scroll/avatar-doctor.png"
          alt="Practice account"
          className="h-9 w-9 rounded-full border border-sand-200 object-cover" />

      </div>
    </header>);

}

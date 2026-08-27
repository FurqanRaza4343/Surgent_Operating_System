import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { PlanProvider } from "../plan/PlanContext";

// Shell for every /dashboard/* screen — sidebar + topbar per
// design-references/For.UI/clinical_ethereal/DESIGN.md (fixed 280px sidebar,
// cool-gray surface). Auth-gating is deferred to a later phase (see
// app/dashboard/README.md) — this is reachable without sign-in for now.
// PlanProvider wraps everything below here so Sidebar/Topbar/every page share
// one plan-tier resolution instead of each mounting its own (see plan/README.md).
export function DashboardLayout() {
  return (
    <PlanProvider>
      <div className="min-h-screen bg-canvas font-sans text-ink">
        <Sidebar />
        <div className="lg:pl-[280px]">
          <Topbar />
          <main className="mx-auto max-w-[1440px] px-6 py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </PlanProvider>);

}

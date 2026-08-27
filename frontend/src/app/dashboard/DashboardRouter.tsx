import React from "react";
import { Routes, Route } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { RequirePractice } from "../auth/RequirePractice";
import { DashboardLayout } from "./layout/DashboardLayout";
import { OverviewPage } from "./overview/OverviewPage";
import { SessionsPage } from "./sessions/SessionsPage";
import { NeedsAttentionPage } from "./sessions/NeedsAttentionPage";
import { PatientsPage } from "./patients/PatientsPage";
import { PatientDetailPage } from "./patients/PatientDetailPage";
import { PatientFormPage } from "./patients/PatientFormPage";
import { DoctorsPage } from "./doctors/DoctorsPage";
import { DoctorDetailPage } from "./doctors/DoctorDetailPage";
import { DoctorFormPage } from "./doctors/DoctorFormPage";
import { AgentCategoryPage } from "./agents/AgentCategoryPage";
import { AgentDetailPage } from "./agents/AgentDetailPage";
import { AnalyticsPage } from "./analytics/AnalyticsPage";
import { AgentSettingsPage } from "./settings/AgentSettingsPage";
import { ProfilePage } from "./profile/ProfilePage";
import { PlanBillingPage } from "./billing/PlanBillingPage";
import { PlanGate } from "./plan/PlanGate";

// Single registrar for every /dashboard/* screen — mirrors
// backend/src/router/agents/__init__.py's role for the agent routers. Every
// path in constants/routes.ts has exactly one matching <Route> here; nothing
// under app/dashboard/ is reachable except through this file.
export function DashboardRouter() {
  return (
    <Routes>
      <Route element={<RequireAuth><RequirePractice><DashboardLayout /></RequirePractice></RequireAuth>}>
        <Route index element={<OverviewPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/needs-attention" element={<NeedsAttentionPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/new" element={<PatientFormPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="doctors/new" element={<DoctorFormPage />} />
        <Route path="doctors/:id" element={<DoctorDetailPage />} />
        <Route path="doctors/:id/edit" element={<DoctorFormPage />} />
        <Route path="agents/:categoryId" element={<AgentCategoryPage />} />
        <Route path="agents/:categoryId/:agentSlug" element={<AgentDetailPage />} />
        <Route
          path="analytics"
          element={
          <PlanGate feature="analytics" title="Analytics" tagline="Real charts on session volume, escalation rate, and channel mix.">
              <AnalyticsPage />
            </PlanGate>
          } />

        <Route path="settings/agents" element={<AgentSettingsPage />} />
        <Route path="settings/profile" element={<ProfilePage />} />
        <Route path="settings/billing" element={<PlanBillingPage />} />
      </Route>
    </Routes>);

}

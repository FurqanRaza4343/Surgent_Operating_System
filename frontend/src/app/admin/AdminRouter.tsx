import React from "react";
import { Routes, Route } from "react-router-dom";
import { AdminRequireAuth } from "./AdminRequireAuth";
import { AdminSignInPage } from "./AdminSignInPage";
import { AdminLayout } from "./layout/AdminLayout";
import { PlatformOverviewPage } from "./overview/PlatformOverviewPage";
import { ClinicsListPage } from "./clinics/ClinicsListPage";
import { ClinicDetailPage } from "./clinics/ClinicDetailPage";
import { PlanManagementPage } from "./plans/PlanManagementPage";

// Single registrar for every /admin/* screen — mirrors
// app/dashboard/DashboardRouter.tsx's role for the doctor dashboard. Sign-in
// is unauthenticated (obviously), everything else sits behind AdminRequireAuth.
export function AdminRouter() {
  return (
    <Routes>
      <Route path="sign-in/*" element={<AdminSignInPage />} />
      <Route element={<AdminRequireAuth><AdminLayout /></AdminRequireAuth>}>
        <Route index element={<PlatformOverviewPage />} />
        <Route path="clinics" element={<ClinicsListPage />} />
        <Route path="clinics/:id" element={<ClinicDetailPage />} />
        <Route path="plans" element={<PlanManagementPage />} />
      </Route>
    </Routes>);

}

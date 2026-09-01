import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import { DoctorOverviewPage } from "./doctor-overview/DoctorOverviewPage";
import { MyCalendarPage } from "./doctor-overview/MyCalendarPage";
import { MyBookAppointmentPage } from "./doctor-overview/MyBookAppointmentPage";
import { DoctorRequestsPage } from "./doctor-requests/DoctorRequestsPage";
import { DoctorRequestDetailPage } from "./doctor-requests/DoctorRequestDetailPage";
import { DASHBOARD_ROUTES } from "./constants/routes";
import { usePlan } from "./plan/PlanContext";
import { AgentCategoryPage } from "./agents/AgentCategoryPage";
import { AgentDetailPage } from "./agents/AgentDetailPage";
import { CommandCenterPage } from "./command-center/CommandCenterPage";
import { ReceptionistMonitorPage } from "./receptionist/ReceptionistMonitorPage";
import { AnalyticsPage } from "./analytics/AnalyticsPage";
import { AgentSettingsPage } from "./settings/AgentSettingsPage";
import { ProfilePage } from "./profile/ProfilePage";
import { PlanBillingPage } from "./billing/PlanBillingPage";
import { PlanGate } from "./plan/PlanGate";
import { FrontDeskPage } from "./front-desk/FrontDeskPage";
import { WaitingRoomPage } from "./front-desk/WaitingRoomPage";
import { BookAppointmentPage } from "./front-desk/BookAppointmentPage";
import { StaffPage } from "./staff/StaffPage";
import { ProceduresPage } from "./clinical/ProceduresPage";
import { ConsultationNoteFormPage } from "./clinical/ConsultationNoteFormPage";
import { TreatmentPlanFormPage } from "./clinical/TreatmentPlanFormPage";
import { TreatmentPlanPage } from "./clinical/TreatmentPlanPage";
import { InvoicesPage } from "./billing-invoices/InvoicesPage";
import { InvoiceFormPage } from "./billing-invoices/InvoiceFormPage";
import { InvoiceDetailPage } from "./billing-invoices/InvoiceDetailPage";
import { ExpensesPage } from "./finance/ExpensesPage";
import { FinanceOverviewPage } from "./finance/FinanceOverviewPage";
import { FunnelPage } from "./leads/FunnelPage";
import { InventoryPage } from "./inventory/InventoryPage";
import { InventoryItemDetailPage } from "./inventory/InventoryItemDetailPage";
import { MessagesPage } from "./messages/MessagesPage";
import { MessageThreadPage } from "./messages/MessageThreadPage";

// Doctor's real landing page is /dashboard/doctor, not root — root's
// OverviewPage is Owner-flavored practice-wide data (greeting, KPIs,
// AIInsightsPanel) that isn't appropriate for a Doctor login. A doctor
// landing on root gets sent to their own overview instead of seeing it.
// Same reasoning for Receptionist → Front Desk.
function DashboardIndex() {
  const { role } = usePlan();
  if (role === "doctor") return <Navigate to={DASHBOARD_ROUTES.doctorOverview} replace />;
  if (role === "receptionist") return <Navigate to={DASHBOARD_ROUTES.frontDesk} replace />;
  return <OverviewPage />;
}

// Guards the two doctor-only routes below — a non-doctor landing here (direct
// URL, stale link) is sent back to root, which doesn't redirect them further,
// so there's no loop risk between this and DashboardIndex above.
function RequireDoctor({ children }: { children: React.ReactNode }) {
  const { role } = usePlan();
  if (role !== "doctor") return <Navigate to={DASHBOARD_ROUTES.overview} replace />;
  return <>{children}</>;
}

// Guards the Front Desk/Waiting Room/Book Appointment routes — mirrors
// RequireDoctor. Owner can also reach these (full practice visibility), a
// Doctor cannot.
function RequireReceptionist({ children }: { children: React.ReactNode }) {
  const { role } = usePlan();
  if (role !== "receptionist" && role !== "owner") return <Navigate to={DASHBOARD_ROUTES.overview} replace />;
  return <>{children}</>;
}

// Guards the Doctor Requests review pages — a doctor hitting these directly
// is sent to their own overview instead (no loop risk, same reasoning as
// RequireDoctor above).
function RequireOwner({ children }: { children: React.ReactNode }) {
  const { role } = usePlan();
  if (role !== "owner") return <Navigate to={DASHBOARD_ROUTES.overview} replace />;
  return <>{children}</>;
}

// Guard for the Procedures page — Owner manages (add/edit) and a Doctor is
// expected to at least see the practice's procedure catalog and prices. Both
// roles reach it; anyone else (receptionist/staff) is sent back to root.
function RequireOwnerOrDoctor({ children }: { children: React.ReactNode }) {
  const { role } = usePlan();
  if (role !== "owner" && role !== "doctor") return <Navigate to={DASHBOARD_ROUTES.overview} replace />;
  return <>{children}</>;
}

// Single registrar for every /dashboard/* screen — mirrors
// backend/src/router/agents/__init__.py's role for the agent routers. Every
// path in constants/routes.ts has exactly one matching <Route> here; nothing
// under app/dashboard/ is reachable except through this file.
export function DashboardRouter() {
  return (
    <Routes>
      <Route element={<RequireAuth><RequirePractice><DashboardLayout /></RequirePractice></RequireAuth>}>
        <Route index element={<DashboardIndex />} />
        <Route path="doctor" element={<RequireDoctor><DoctorOverviewPage /></RequireDoctor>} />
        <Route path="my-calendar" element={<RequireDoctor><MyCalendarPage /></RequireDoctor>} />
        <Route path="my-book" element={<RequireDoctor><MyBookAppointmentPage /></RequireDoctor>} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/needs-attention" element={<NeedsAttentionPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/new" element={<PatientFormPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="doctors/new" element={<DoctorFormPage />} />
        <Route path="doctors/:id" element={<DoctorDetailPage />} />
        <Route path="doctors/:id/edit" element={<DoctorFormPage />} />
        <Route path="doctor-requests" element={<RequireOwner><DoctorRequestsPage /></RequireOwner>} />
        <Route path="doctor-requests/:id" element={<RequireOwner><DoctorRequestDetailPage /></RequireOwner>} />
        <Route path="staff" element={<RequireOwner><StaffPage /></RequireOwner>} />
        <Route path="front-desk" element={<RequireReceptionist><FrontDeskPage /></RequireReceptionist>} />
        <Route path="waiting-room" element={<RequireReceptionist><WaitingRoomPage /></RequireReceptionist>} />
        <Route path="book-appointment" element={<RequireReceptionist><BookAppointmentPage /></RequireReceptionist>} />
        <Route path="settings/procedures" element={<RequireOwnerOrDoctor><ProceduresPage /></RequireOwnerOrDoctor>} />
        <Route path="patients/:patientId/notes/new" element={<RequireDoctor><ConsultationNoteFormPage /></RequireDoctor>} />
        <Route path="patients/:patientId/treatment-plans/new" element={<RequireDoctor><TreatmentPlanFormPage /></RequireDoctor>} />
        <Route path="treatment-plans/:id" element={<TreatmentPlanPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<RequireReceptionist><InvoiceFormPage /></RequireReceptionist>} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="finance/expenses" element={<RequireReceptionist><ExpensesPage /></RequireReceptionist>} />
        <Route path="finance/overview" element={<RequireReceptionist><FinanceOverviewPage /></RequireReceptionist>} />
        <Route path="leads" element={<FunnelPage />} />
        <Route path="inventory" element={<RequireReceptionist><InventoryPage /></RequireReceptionist>} />
        <Route path="inventory/:id" element={<RequireReceptionist><InventoryItemDetailPage /></RequireReceptionist>} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="messages/:staffUserId" element={<RequireOwner><MessageThreadPage /></RequireOwner>} />
        <Route path="agents/:categoryId" element={<AgentCategoryPage />} />
        <Route path="agents/:categoryId/:agentSlug" element={<AgentDetailPage />} />
        <Route path="command-center" element={<CommandCenterPage />} />
        <Route path="ai-receptionist" element={<RequireReceptionist><ReceptionistMonitorPage /></RequireReceptionist>} />
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

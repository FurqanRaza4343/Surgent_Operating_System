// Single source of truth for every /dashboard/* path — the sidebar, the
// central DashboardRouter, and any internal links all read from here so a
// path never has to be hand-typed (and drift) in more than one place.
export const DASHBOARD_ROUTES = {
  root: "/dashboard",
  overview: "/dashboard",
  sessionsAll: "/dashboard/sessions",
  sessionsNeedsAttention: "/dashboard/sessions/needs-attention",
  patients: "/dashboard/patients",
  patientNew: "/dashboard/patients/new",
  patientDetail: (id: string) => `/dashboard/patients/${id}`,
  doctors: "/dashboard/doctors",
  doctorNew: "/dashboard/doctors/new",
  doctorDetail: (id: string) => `/dashboard/doctors/${id}`,
  doctorEdit: (id: string) => `/dashboard/doctors/${id}/edit`,
  doctorOverview: "/dashboard/doctor",
  myCalendar: "/dashboard/my-calendar",
  agentCategory: (categoryId: string) => `/dashboard/agents/${categoryId}`,
  agentDetail: (categoryId: string, slug: string) => `/dashboard/agents/${categoryId}/${slug}`,
  receptionistMonitor: "/dashboard/ai-receptionist",
  analytics: "/dashboard/analytics",
  commandCenter: "/dashboard/command-center",
  settingsAgents: "/dashboard/settings/agents",
  settingsProfile: "/dashboard/settings/profile",
  settingsBilling: "/dashboard/settings/billing"
} as const;

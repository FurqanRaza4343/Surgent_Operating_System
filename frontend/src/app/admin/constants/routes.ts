// Single source of truth for every /admin/* path — mirrors
// app/dashboard/constants/routes.ts's role for the doctor dashboard.
export const ADMIN_ROUTES = {
  root: "/admin",
  overview: "/admin",
  clinics: "/admin/clinics",
  clinicDetail: (id: string) => `/admin/clinics/${id}`,
  plans: "/admin/plans",
  salesLeads: "/admin/sales-leads",
  signIn: "/admin/sign-in"
} as const;

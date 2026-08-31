// Mirrors backend/src/data/doctor_permissions.py's static catalog — the
// permission KEYS must match exactly (they're what the Owner grants and the
// backend enforces); labels/descriptions are display-only.
export interface DoctorPermission {
  key: string;
  label: string;
  description: string;
  recommended: boolean;
}

export const DOCTOR_PERMISSIONS: DoctorPermission[] = [
  { key: "view_own_overview", label: "My Overview", description: "Their own KPI summary and upcoming appointments.", recommended: true },
  { key: "view_own_calendar", label: "My Calendar", description: "Their own appointment schedule.", recommended: true },
  { key: "mark_attendance", label: "Mark attendance", description: "Daily check-in / check-out.", recommended: true },
  { key: "edit_own_profile", label: "Edit own profile", description: "Update their own bio, specialty, and photo.", recommended: true },
  { key: "view_ai_receptionist", label: "AI Receptionist monitor", description: "See how the AI Receptionist is handling inbound patients.", recommended: true },
  { key: "view_patients", label: "Full patients list", description: "See every patient in the practice, not just their own appointments.", recommended: false },
  { key: "view_doctors_crm", label: "Doctors roster", description: "See the full list of doctors in the practice.", recommended: false },
  { key: "view_analytics", label: "Analytics", description: "Practice-wide analytics and reporting.", recommended: false }
];

export const RECOMMENDED_DOCTOR_PERMISSIONS = DOCTOR_PERMISSIONS.filter((p) => p.recommended).map((p) => p.key);

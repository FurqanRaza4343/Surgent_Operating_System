// Mirrors backend/src/data/receptionist_permissions.py's static catalog —
// the permission KEYS must match exactly (they're what the Owner grants and
// the backend enforces); labels/descriptions are display-only.
export interface ReceptionistPermission {
  key: string;
  label: string;
  description: string;
  recommended: boolean;
}

export const RECEPTIONIST_PERMISSIONS: ReceptionistPermission[] = [
  { key: "view_front_desk", label: "Front Desk", description: "The practice-wide schedule for today, across every doctor.", recommended: true },
  { key: "check_in_patients", label: "Check in patients", description: "Mark an arrived patient as checked in.", recommended: true },
  { key: "manage_waiting_room", label: "Manage waiting room", description: "See who's checked in and waiting to be seen.", recommended: true },
  { key: "book_appointments", label: "Book appointments", description: "Create new appointments for any patient and doctor.", recommended: true },
  { key: "view_patients", label: "Full patients list", description: "See every patient in the practice.", recommended: true },
  { key: "view_ai_receptionist", label: "AI Receptionist monitor", description: "See how the AI Receptionist is handling inbound patients.", recommended: true },
  { key: "view_analytics", label: "Analytics", description: "Practice-wide analytics and reporting.", recommended: false }
];

export const RECOMMENDED_RECEPTIONIST_PERMISSIONS = RECEPTIONIST_PERMISSIONS.filter((p) => p.recommended).map((p) => p.key);

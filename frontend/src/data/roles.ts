// Practice-scoped role — mirrors backend/src/models/user.py's UserRole enum.
// Drives which dashboard sections a signed-in user sees (Sidebar.tsx's
// `allowedRoles` filter). This pass only builds the Owner experience — no
// NavItem is restricted yet — but the type/plumbing exists now so adding
// Doctor/Receptionist later is "tag an existing NavItem," not a rearchitecture.
export type Role = "owner" | "doctor" | "receptionist" | "staff";

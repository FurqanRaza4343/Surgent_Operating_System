# Static catalog of granular per-receptionist permissions — mirrors
# doctor_permissions.py's shape exactly. Stored directly on User.permissions
# (see models/user.py) rather than a separate roster table, since Receptionist
# has no profile-specific data to justify one the way Doctor does.
# `view_patients`/`view_analytics` deliberately reuse the SAME key strings as
# DOCTOR_PERMISSIONS so Sidebar.tsx's requiresPermission gating doesn't need
# per-role branching for shared pages. Per the roadmap's decision #3, a
# granted permission here always sees practice-wide data (never scoped to
# "today only" or "own"), unlike Doctor's own-schedule-only defaults.
RECEPTIONIST_PERMISSIONS = [
    {
        "key": "view_front_desk",
        "label": "Front Desk",
        "description": "The practice-wide schedule for today, across every doctor.",
        "recommended": True,
    },
    {
        "key": "check_in_patients",
        "label": "Check in patients",
        "description": "Mark an arrived patient as checked in.",
        "recommended": True,
    },
    {
        "key": "manage_waiting_room",
        "label": "Manage waiting room",
        "description": "See who's checked in and waiting to be seen.",
        "recommended": True,
    },
    {
        "key": "book_appointments",
        "label": "Book appointments",
        "description": "Create new appointments for any patient and doctor.",
        "recommended": True,
    },
    {
        "key": "view_patients",
        "label": "Full patients list",
        "description": "See every patient in the practice.",
        "recommended": True,
    },
    {
        "key": "view_ai_receptionist",
        "label": "AI Receptionist monitor",
        "description": "See how the AI Receptionist is handling inbound patients.",
        "recommended": True,
    },
    {
        "key": "view_analytics",
        "label": "Analytics",
        "description": "Practice-wide analytics and reporting.",
        "recommended": False,
    },
]

RECOMMENDED_RECEPTIONIST_PERMISSIONS = [p["key"] for p in RECEPTIONIST_PERMISSIONS if p["recommended"]]
VALID_RECEPTIONIST_PERMISSION_KEYS = {p["key"] for p in RECEPTIONIST_PERMISSIONS}

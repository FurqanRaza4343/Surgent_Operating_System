# Static catalog of granular per-doctor permissions — what a Doctor role can
# additionally access beyond the baseline doctor dashboard shell (My
# Overview/My Calendar/Profile, which every doctor gets).
# The Owner reviews a self-registered doctor's application and grants a
# subset of these; `recommended` pre-checks the ones a typical doctor needs
# so the Owner isn't starting from a blank checklist. Mirrors the shape of
# frontend/src/app/dashboard/plan/planCapabilities.ts (a static, code-defined
# catalog) but per-doctor-record rather than per-plan-tier.
DOCTOR_PERMISSIONS = [
    {
        "key": "view_own_overview",
        "label": "My Overview",
        "description": "Their own KPI summary and upcoming appointments.",
        "recommended": True,
    },
    {
        "key": "view_own_calendar",
        "label": "My Calendar",
        "description": "Their own appointment schedule.",
        "recommended": True,
    },
    {
        "key": "mark_attendance",
        "label": "Mark attendance",
        "description": "Daily check-in / check-out.",
        "recommended": True,
    },
    {
        "key": "edit_own_profile",
        "label": "Edit own profile",
        "description": "Update their own bio, specialty, and photo.",
        "recommended": True,
    },
    {
        "key": "view_ai_receptionist",
        "label": "AI Receptionist monitor",
        "description": "See how the AI Receptionist is handling inbound patients.",
        "recommended": False,
    },
    {
        "key": "view_patients",
        "label": "Full patients list",
        "description": "See every patient in the practice, not just their own appointments.",
        "recommended": True,
    },
    {
        "key": "view_doctors_crm",
        "label": "Doctors roster",
        "description": "See the full list of doctors in the practice.",
        "recommended": False,
    },
    {
        "key": "view_analytics",
        "label": "Analytics",
        "description": "Practice-wide analytics and reporting.",
        "recommended": False,
    },
]

RECOMMENDED_DOCTOR_PERMISSIONS = [p["key"] for p in DOCTOR_PERMISSIONS if p["recommended"]]
VALID_DOCTOR_PERMISSION_KEYS = {p["key"] for p in DOCTOR_PERMISSIONS}

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { DOCTOR_APPLY_SESSION_KEY } from "./DoctorApplyPage";

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

// Global safety net for a real, reproduced Clerk race: DoctorApplyPage's own
// SignUp widget sets forceRedirectUrl="/doctor/apply/complete", but that
// navigation can lose a race against Clerk's internal accounts.dev
// cross-origin session-sync (captured as `net::ERR_ABORTED` on the
// /doctor/apply/complete request) and never fire. When that happens Clerk
// falls back to ClerkProvider's own global afterSignUpUrl ("/dashboard",
// see index.tsx) — and since the applicant hasn't submitted anything to
// PendingDoctorRequest yet at that point, RequirePractice can't recognize
// them as a pending doctor either, so they land on its generic "No active
// plan yet" paywall (whose CTA points at the real marketing site) instead
// of their own application form. The component-level fix inside
// DoctorApplyPage.tsx only helps if that component is still mounted when
// isSignedIn flips — this catches the case where the user got bounced
// somewhere else entirely, by rechecking on every route in the app.
//
// The marker this reads is cleared the moment a real application is
// actually submitted (see DoctorApplyCompletePage.tsx) — so this can never
// misfire against a later, legitimately-approved doctor's real dashboard
// session in the same tab.
export function DoctorApplyRecovery() {
  if (!clerkEnabled) return null;
  return <DoctorApplyRecoveryInner />;
}

function DoctorApplyRecoveryInner() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isSignedIn) return;
    if (location.pathname.startsWith("/doctor/apply")) return;

    let stillMidApply = false;
    try {
      stillMidApply = Boolean(sessionStorage.getItem(DOCTOR_APPLY_SESSION_KEY));
    } catch {
      return;
    }
    if (!stillMidApply) return;

    navigate("/doctor/apply/complete", { replace: true });
  }, [isSignedIn, location.pathname, navigate]);

  return null;
}

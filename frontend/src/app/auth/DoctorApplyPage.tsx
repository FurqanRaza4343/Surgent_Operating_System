import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SignUp, useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { AuthLayout } from "./AuthLayout";
import { validateDoctorCode } from "../../api/practice";

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const clerkAppearance = {
  variables: {
    colorPrimary: "#2563EB",
    colorText: "#0F172A",
    colorTextSecondary: "#64748B",
    colorBackground: "#FFFFFF",
    borderRadius: "0.75rem",
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
  },
  elements: {
    rootBox: "w-full",
    card: "shadow-[0_20px_50px_-20px_rgba(11,29,38,0.25)] border border-sand-200 rounded-3xl",
    headerTitle: "font-display text-2xl",
    formButtonPrimary: "bg-accent-500 hover:bg-accent-700 text-sm normal-case"
  }
};

// Exported so DoctorApplyRecovery.tsx (a global safety net mounted at the
// app root, see App.tsx) can check the same marker regardless of which page
// Clerk's post-signup redirect actually lands the user on.
export const DOCTOR_APPLY_SESSION_KEY = "aesthetixai_doctor_apply_validated";
const SESSION_KEY = DOCTOR_APPLY_SESSION_KEY;

interface StoredValidation {
  practiceId: string;
  practiceName: string | null;
}

function readStoredValidation(): StoredValidation | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredValidation) : null;
  } catch {
    return null;
  }
}

function writeStoredValidation(data: StoredValidation) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // private browsing / storage disabled — falls back to re-validating
    // from the URL on Clerk's next internal navigation, same as before
    // this fix existed.
  }
}

// Public entry point for a doctor self-registering — reached via a practice's
// shareable signup link (see dashboard/doctors/DoctorSignupLinkCard.tsx and
// backend/src/router/practice/practice_router.py's GET
// /practice/validate-doctor-code). Unlike DoctorSignUpPage.tsx (invite-only,
// no public link), this page has no gate other than a valid ?code= — the
// resulting account is created inactive server-side (see the user.created
// webhook's doctor_self_apply branch) until the Owner reviews and approves.
export function DoctorApplyPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [practiceName, setPracticeName] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Clerk's own internal routing (routing="path") does a HARD
      // (full-page) navigation for some sub-steps — e.g.
      // /doctor/apply/verify-email-address for email verification — which
      // wipes React state entirely and drops the ?code= query param. Without
      // this, a legitimate mid-signup reload landed on "This link isn't
      // valid" — sessionStorage survives a real page reload within the same
      // tab, unlike component/URL state.
      const stored = readStoredValidation();
      if (stored) {
        setPracticeId(stored.practiceId);
        setPracticeName(stored.practiceName);
        setStatus("valid");
        return;
      }

      const code = searchParams.get("code") || "";
      if (!code) {
        setStatus("invalid");
        return;
      }
      try {
        const result = await validateDoctorCode(code);
        if (cancelled) return;
        if (result.valid && result.practice_id) {
          setPracticeName(result.practice_name);
          setPracticeId(result.practice_id);
          setStatus("valid");
          writeStoredValidation({ practiceId: result.practice_id, practiceName: result.practice_name });
        } else {
          setStatus("invalid");
        }
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") {
    return (
      <AuthLayout variant="doctor">
        <p className="text-center text-sm text-ink-muted">Checking your invite link…</p>
      </AuthLayout>);

  }

  if (status === "invalid") {
    return (
      <AuthLayout variant="doctor">
        <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-lift">
          <h1 className="font-display text-2xl font-600 text-ink">This link isn&apos;t valid</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Ask the practice for a fresh signup link, or check that you copied the whole URL.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600">

            Back to home
          </Link>
        </div>
      </AuthLayout>);

  }

  return (
    <AuthLayout variant="doctor">
      {clerkEnabled ?
      <DoctorApplySignUpForm practiceName={practiceName} practiceId={practiceId} /> :

      <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-lift">
          <h1 className="font-display text-2xl font-600 text-ink">Sign-up isn&apos;t configured yet</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Set <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> to enable
            authentication.
          </p>
        </div>
      }
    </AuthLayout>);

}

// Split out so useAuth() (a Clerk hook, throws without a mounted
// ClerkProvider) is only ever called when clerkEnabled — mirrors
// app/dashboard/plan/PlanContext.tsx's PlanProviderWithClerk split.
function DoctorApplySignUpForm({ practiceName, practiceId }: { practiceName: string | null; practiceId: string | null }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  // Was there ALREADY a signed-in session the moment this page loaded, as
  // opposed to one that became signed-in because the visitor just completed
  // the SignUp form below? Captured exactly once, when Clerk finishes
  // loading — distinguishes "reused an existing login" (show a warning, see
  // AlreadySignedInNotice below) from "just finished signing up here" (the
  // real redirect case this component exists for). Found the hard way: an
  // Owner opening this link in their own already-logged-in browser silently
  // filed a doctor application under their own Owner account with no
  // warning, because `isSignedIn` was already true before any effect ran.
  const [wasAlreadySignedIn, setWasAlreadySignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (isLoaded && wasAlreadySignedIn === null) {
      setWasAlreadySignedIn(Boolean(isSignedIn));
    }
  }, [isLoaded, isSignedIn, wasAlreadySignedIn]);

  // Belt-and-suspenders for forceRedirectUrl: Clerk's own post-verification
  // redirect can lose a race against its internal dev-instance session-sync
  // navigation (observed via a captured `net::ERR_ABORTED` on the
  // /doctor/apply/complete request — a real, reproduced Clerk dev-mode
  // quirk during the accounts.dev cross-origin handoff, not just slow
  // network), leaving the SignUp widget blank at /verify-email-address even
  // though the account was actually created and signed in. Once Clerk
  // reports a real session THAT WASN'T ALREADY THERE ON LOAD, take the user
  // to /complete ourselves rather than trusting Clerk's redirect alone.
  useEffect(() => {
    if (isSignedIn && wasAlreadySignedIn === false) {
      navigate("/doctor/apply/complete", { replace: true });
    }
  }, [isSignedIn, wasAlreadySignedIn, navigate]);

  if (wasAlreadySignedIn === null) return null;

  if (wasAlreadySignedIn) {
    return (
      <AlreadySignedInNotice
        email={user?.primaryEmailAddress?.emailAddress}
        onSignOut={() => signOut({ redirectUrl: window.location.href })} />);

  }

  return (
    <>
      {practiceName &&
      <p className="mb-4 text-center text-sm text-ink-muted">
          Joining <span className="font-semibold text-ink">{practiceName}</span>
        </p>
      }
      <SignUp
        routing="path"
        path="/doctor/apply"
        forceRedirectUrl="/doctor/apply/complete"
        unsafeMetadata={{ invite_type: "doctor_self_apply", practice_id: practiceId }}
        appearance={clerkAppearance} />

    </>);

}

function AlreadySignedInNotice({ email, onSignOut }: { email: string | undefined; onSignOut: () => void }) {
  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center shadow-lift">
      <h1 className="font-display text-2xl font-600 text-ink">You&apos;re already signed in</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {email ? <>You&apos;re signed in as <span className="font-semibold text-ink">{email}</span>.</> : "You're signed in with an existing account."}{" "}
        Applying here would file the application under that same account, not a new doctor. Sign out first if you meant
        to apply as someone else.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600">

        Sign out and continue
      </button>
    </div>);

}

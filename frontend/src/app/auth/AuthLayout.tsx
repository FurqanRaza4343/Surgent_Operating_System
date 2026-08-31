import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/ui";

interface AuthLayoutProps {
  children: React.ReactNode;
  variant?: "clinic" | "admin" | "doctor" | "staff";
}

const COPY = {
  clinic: {
    eyebrow: "AI-Powered Surgical Practice OS",
    headline: "Run your practice on autopilot, with an AI team that never sleeps.",
    showTestimonial: true
  },
  admin: {
    eyebrow: "Platform Control",
    headline: "Everything running on Aiaceone, in one place.",
    showTestimonial: false
  },
  doctor: {
    eyebrow: "For Doctors",
    headline: "Your schedule, your patients, one place.",
    showTestimonial: false
  },
  staff: {
    eyebrow: "For Front Desk Staff",
    headline: "Check patients in, manage the schedule, keep the day moving.",
    showTestimonial: false
  }
} as const;

// Branded split-screen shell for /sign-in, /sign-up, and /admin/sign-in —
// the "Aiaceone premium" look (dark panel + testimonial, per
// design-references/For.UI) wrapping Clerk's own <SignIn>/<SignUp> on the
// right. Distinct from OnboardingLayout (single centered column, used
// post-payment) because this is the front door: it needs to sell the
// product, not just show progress. `variant="admin"` swaps only the
// left-panel copy (no testimonial — nobody's citing a customer quote to
// the platform's own team) rather than forking the whole layout.
export function AuthLayout({ children, variant = "clinic" }: AuthLayoutProps) {
  const copy = COPY[variant];
  return (
    <div className="flex min-h-screen bg-canvas font-sans">
      <div className="relative hidden w-[46%] max-w-[600px] flex-col justify-between overflow-hidden bg-[#15171A] px-14 py-14 lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full bg-accent-500/35 blur-[140px]" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white">
            <Logo className="h-6 w-6" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">Aiaceone</span>
        </Link>

        <div className="relative flex flex-col gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
            {copy.eyebrow}
          </p>
          <h1 className="max-w-[460px] font-display text-[2.5rem] font-600 leading-[1.15] tracking-tight text-white">
            {copy.headline}
          </h1>
        </div>

        {copy.showTestimonial &&
        <div className="relative flex flex-col gap-4 rounded-[20px] border border-white/10 bg-white/[0.06] p-6">
            <p className="text-[15px] leading-relaxed text-white/90">
              &ldquo;Aiaceone&apos;s AI receptionist cut our missed-call rate to near zero and
              pays for itself in one recovered consult a week.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <img
              src="/auth/testimonial-doctor.png"
              alt="Dr. Sarah Chen"
              className="h-10 w-10 rounded-full object-cover" />

              <span className="text-[13px] font-semibold text-white/75">
                Dr. Sarah Chen — Clinical Director, Chen Aesthetics
              </span>
            </div>
          </div>
        }
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center px-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sand-200 bg-white">
              <Logo className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-ink">Aiaceone</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>);

}

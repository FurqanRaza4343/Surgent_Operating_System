import React from "react";
import { Link } from "react-router-dom";
import { ActivityIcon } from "lucide-react";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  step?: { current: number; total: number };
}

// Deliberately NOT the marketing Navbar/Footer and NOT the dashboard
// Sidebar/Topbar — a minimal branded shell for the narrow moment between
// "just paid" and "looking at my dashboard." No nav links out to the
// marketing site (nothing to browse mid-signup) and no dashboard chrome
// (plan isn't resolved yet at this point in the flow).
export function OnboardingLayout({ children, step }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-ink">
      <header className="flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <ActivityIcon className="h-4.5 w-4.5" strokeWidth={2.4} />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-ink">
            Aesthetix<span className="text-teal-600">AI</span>
          </span>
        </Link>
        {step &&
        <div className="flex items-center gap-1.5">
            {Array.from({ length: step.total }).map((_, i) =>
          <span
            key={i}
            className={`h-1.5 w-8 rounded-full ${i < step.current ? "bg-teal-600" : "bg-sand-200"}`} />

          )}
          </div>
        }
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>);

}


import React from "react";

const LOGOS = [
"Meridian Plastic Surgery",
"Lumière Aesthetics",
"Cascade Dermatology",
"Everline Med Spa",
"Solstice Surgical"];

export function TrustBar() {
  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
          Trusted by leading aesthetic practices
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {LOGOS.map((name) =>
          <span key={name} className="text-sm font-semibold text-ink-muted/70">
              {name}
            </span>
          )}
        </div>
      </div>
    </section>);

}

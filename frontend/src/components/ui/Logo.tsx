import React from "react";

// The brand mark (public/logo.png, transparent background) — every place that
// used to render a plain <ActivityIcon /> as a stand-in logo now renders this
// instead. Kept on a white chip (see call sites) rather than the old
// brand-color chips, since the mark itself already carries color (teal
// accents on a black outline) and would lose contrast on a dark/teal badge.
export function Logo({ className = "h-5 w-5" }: { className?: string }) {
  return <img src="/logo.png" alt="Aiaceone" className={`object-contain ${className}`} />;
}

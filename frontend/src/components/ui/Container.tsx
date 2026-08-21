import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

// The `mx-auto max-w-7xl px-5 sm:px-8` wrapper was hand-duplicated at the top of
// every section and page — this consolidates it.
export function Container({ children, className = "" }: ContainerProps) {
  return <div className={`mx-auto max-w-7xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "lucide-react";

type ButtonVariant = "primary" | "cream" | "outline-dark" | "ghost" | "ink";
type ButtonSize = "sm" | "md";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-teal-600 text-white hover:bg-teal-700",
  cream: "bg-teal-300 text-ink hover:bg-white",
  "outline-dark": "border border-white/20 text-white hover:bg-white/10",
  ghost: "text-ink transition-colors hover:text-teal-600",
  ink: "bg-ink text-white hover:bg-teal-600"
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "gap-2 px-5 py-2.5 text-sm",
  md: "gap-2 px-7 py-3.5 text-base"
};

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
  className?: string;
  to?: string;
  href?: string;
  onClick?: () => void;
}

// The `rounded-full ... font-semibold` CTA button pattern was hand-duplicated
// across Navbar, CTA, and SectionTeaser with slightly different sizes/variants —
// this consolidates it. Renders a react-router `<Link>` when `to` is given, a
// plain `<a>` when `href` is given.
export function Button({
  children,
  variant = "primary",
  size = "md",
  arrow = false,
  className = "",
  to,
  href,
  onClick
}: ButtonProps) {
  const classes = `group inline-flex items-center justify-center rounded-full font-semibold transition-all ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;
  const content =
  <>
      {children}
      {arrow &&
    <ArrowRightIcon className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
    }
    </>;


  if (to) {
    return (
      <Link to={to} onClick={onClick} className={classes}>
        {content}
      </Link>);

  }
  if (href) {
    return (
      <a href={href} onClick={onClick} className={classes}>
        {content}
      </a>);

  }
  // Neither `to` nor `href` — a real action button (e.g. opens a modal), not
  // a link. An `<a>` with no href isn't keyboard-focusable and isn't
  // semantically a link, so this renders a real <button> instead.
  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>);

}

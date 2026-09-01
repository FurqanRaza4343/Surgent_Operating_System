import React, { useEffect, useRef, useState } from "react";
import { EllipsisIcon } from "lucide-react";

interface KebabMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

// A self-contained three-dot menu (Ellipsis) that opens a small dropdown. Closes
// on outside click or Escape, so it never needs an external menu library — the
// Dashboard app's other surfaces follow the same no-external-overlay approach.
export function KebabMenu({ items }: { items: KebabMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("click", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-sand-100 hover:text-ink">
        <EllipsisIcon className="h-4 w-4" />
      </button>
      {open &&
      <div className="absolute right-0 top-9 z-30 min-w-[190px] rounded-xl border border-sand-200 bg-white py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
        {items.map((item) =>
        <button
          key={item.label}
          type="button"
          onClick={() => {
            setOpen(false);
            item.onClick();
          }}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left font-medium transition-colors ${item.danger ? "text-danger hover:bg-danger/5" : "text-ink hover:bg-sand-50"}`}>
          {item.icon} {item.label}
        </button>
        )}
      </div>
      }
    </div>);

}
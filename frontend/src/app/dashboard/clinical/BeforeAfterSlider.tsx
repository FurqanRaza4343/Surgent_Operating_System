import React, { useRef, useState } from "react";
import { MoveHorizontalIcon } from "lucide-react";

// A self-contained drag divider between two images — no backend needed,
// just two URLs. Pointer-events based so it works with mouse, touch, and pen.
export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "Before",
  afterLabel = "After"
}: {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function setFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setFromClientX(e.clientX);
  }
  function onPointerUp() {
    dragging.current = false;
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-2xl border border-sand-200 bg-sand-100">
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <img
        src={beforeUrl}
        alt={beforeLabel}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false} />

      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold text-white">{beforeLabel}</span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-semibold text-white">{afterLabel}</span>

      <div className="pointer-events-none absolute inset-y-0 flex w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)]" style={{ left: `${position}%` }}>
        <span className="pointer-events-none absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink-soft shadow-[0_2px_8px_rgba(15,23,42,0.2)]">
          <MoveHorizontalIcon className="h-4 w-4" />
        </span>
      </div>
    </div>);

}

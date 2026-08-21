import React, { useEffect, useRef } from "react";
import { mountLetsScroll } from "./scrub-engine";

const SECTIONS = [
{
  id: "reception",
  label: "First Call",
  still: "/lets-scroll/reception.png",
  stillMobile: "/lets-scroll/reception-mobile.png",
  clip: "/lets-scroll/reception.mp4",
  accent: "#0B6362",
  eyebrow: "First Call, Answered",
  title: "Your practice, run by an AI workforce",
  body: "From the first call to full recovery, autonomous agents answer patients around the clock.",
  tags: ["24/7 coverage", "Phone · Chat · WhatsApp"]
},
{
  id: "booking",
  label: "Consultations",
  still: "/lets-scroll/booking.png",
  stillMobile: "/lets-scroll/booking-mobile.png",
  clip: "/lets-scroll/booking.mp4",
  accent: "#0B6362",
  eyebrow: "Consultations, Booked",
  title: "Every inquiry becomes an appointment",
  body: "AI agents book consultations instantly, with zero double-bookings.",
  tags: ["Auto-scheduling", "Instant confirmation"]
},
{
  id: "care",
  label: "Recovery",
  still: "/lets-scroll/care.png",
  stillMobile: "/lets-scroll/care-mobile.png",
  clip: "/lets-scroll/care.mp4",
  accent: "#0B6362",
  eyebrow: "Healing, Watched Over",
  title: "Recovery checked in on, automatically",
  body: "Agents monitor healing and follow up with every patient after every procedure.",
  tags: ["Post-op check-ins", "HIPAA-aware"]
},
{
  id: "growth",
  label: "Growth",
  still: "/lets-scroll/growth.png",
  stillMobile: "/lets-scroll/growth-mobile.png",
  clip: "/lets-scroll/growth.mp4",
  accent: "#C9A24B",
  eyebrow: "Growth, Visualized",
  title: "See your practice grow",
  body: "Track revenue and every conversation, across every channel, in one view.",
  tags: ["Revenue up", "Multi-channel"],
  cta: { primary: { label: "Book a demo", href: "#demo" } }
}];


export function CinematicHero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;
    container.innerHTML = "";
    const engine = mountLetsScroll(container, {
      // brand/cta/nav are left off — the site's own <Navbar /> already covers
      // that role and sits fixed above this section, so the engine's built-in
      // topbar would just duplicate/overlap it.
      nav: false,
      hint: "scroll to fly in",
      diveScroll: 1.3,
      sections: SECTIONS,
      connectors: [],
      crossfade: 0.08
    });

    // The track carries one extra viewport-height of scroll after the last
    // scene ("so the last flight completes") — that trailing stretch is where
    // the ambient sky/particles keep showing with nothing new happening, and
    // where the scroll-guide avatar's big intro takes over (see
    // ScrollGuideAvatar.tsx). The engine holds the last scene's copy at full
    // opacity through that whole stretch and beyond (by design, for a hero
    // that IS the whole page) — this site has content below, so the Growth
    // copy shouldn't linger into the avatar moment. Fade it out across the
    // second half of the scene's own settle (finishing right as the trailing
    // stretch/avatar begins, not overlapping it), and hide the hero's other
    // fixed layers (sky/stage/route/etc.) once the container is fully behind
    // the viewport, same as before.
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const padStart = rect.height - vh; // scroll-distance where the trailing stretch begins
      const distancePastPadStart = -rect.top - padStart; // 0 at that point, vh once fully cleared

      const copylayer = container.querySelector<HTMLElement>(".sw-copylayer");
      if (copylayer) {
        const fadeStart = padStart - vh * 0.5;
        const fade = Math.min(Math.max((-rect.top - fadeStart) / (vh * 0.5), 0), 1);
        copylayer.style.opacity = String(1 - fade);
      }

      container.classList.toggle("sw-past-end", distancePastPadStart >= vh);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      // Real routing exists now (Home → /agents → back to Home unmounts and
      // remounts this component) — without disposing the engine, each round
      // trip leaked another full set of its own listeners plus an orphaned
      // rAF loop scrubbing DOM this same cleanup just cleared.
      engine.dispose();
    };
  }, []);

  return <div ref={ref} className="cinematic-hero" />;
}

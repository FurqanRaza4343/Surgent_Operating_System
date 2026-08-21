import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayIcon, StethoscopeIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useMediaQuery } from "../../hooks";

interface Stop {
  sectionId: string;
  message: string;
  // where the badge anchors on desktop, in viewport corners
  corner: "bottom-right" | "top-right";
}

const STOPS: Stop[] = [
{
  sectionId: "how-it-works",
  message: "Hey, I'm AesthetixAI's agent — I'll show you around.",
  corner: "bottom-right"
},
{
  sectionId: "agents",
  message: "This is the agent suite — meet the specialists that run your practice.",
  corner: "top-right"
},
{
  sectionId: "channels",
  message: "Same agents, every channel your patients already use.",
  corner: "top-right"
},
{
  // Targets just the section's heading block, not the whole (tall) section —
  // the pricing cards below it run long, and watching the full section let this
  // stop stay "active" deep into the card grid, where a card's own content can
  // scroll up into this same corner. The guide retreats once past this heading
  // (see the pastGuide effect below) instead of trying to dodge the cards.
  sectionId: "pricing-heading",
  message: "Pick the plan that matches your practice size.",
  corner: "top-right"
}];


const BADGE = 64; // avatar circle size, px
const MARGIN = 28;
const NAV_CLEARANCE = 116; // keeps top-anchored stops below the fixed Navbar
const DWELL_MS = 5000; // minimum time the big intro holds before scroll is released
// Focus ring shown for keyboard users only (`:focus-visible`), styled to match
// the brand instead of the browser's default blue — a plain `:focus` ring was
// flashing on click, which read as a stray colour glitch.
const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2";

function cornerToPoint(corner: Stop["corner"]) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  switch (corner) {
    case "bottom-right":
      return { top: h - BADGE - MARGIN, left: w - BADGE - MARGIN };
    case "top-right":
      return { top: NAV_CLEARANCE, left: w - BADGE - MARGIN };
  }
}

export function ScrollGuideAvatar() {
  const [avatarActive, setAvatarActive] = useState(false);
  const [phase, setPhase] = useState<"intro" | "guide">("intro");
  const [retreated, setRetreated] = useState(false);
  const [activeStop, setActiveStop] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoPaused, setVideoPaused] = useState(false);
  const [dwellDone, setDwellDone] = useState(false);
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState(() => cornerToPoint(STOPS[0].corner));
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // React's `muted` prop on <video> doesn't reliably sync to the live DOM
  // property after the initial render (a long-standing React gotcha) — set it
  // imperatively so the mute control actually works.
  const toggleMuted = () => {
    setMuted((m) => {
      const next = !m;
      if (videoRef.current) {
        videoRef.current.muted = next;
        videoRef.current.play().catch(() => {});
      }
      return next;
    });
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});else v.pause();
  };

  // The track carries one extra viewport-height of scroll after the 4th scene
  // ("so the last flight completes") — that's the trailing stretch where the
  // ambient sky/particles keep showing with nothing new happening (see the
  // matching comment in CinematicHero.tsx, which fades that scene's copy out
  // just before this point so it never overlaps the avatar). The avatar's big
  // talking-avatar "intro" appears right as that stretch begins — same place
  // the particles are — and shrinks into the small guide badge once the
  // visitor scrolls a further ~1.3 viewport-heights past that point. Both this
  // and the pricing retreat below are bidirectional (scrolling back up
  // reverts them).
  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const hero = document.querySelector(".cinematic-hero");
      // `.sw-root` is only added once `mountLetsScroll` has actually run and set
      // the real (tall) track height — before that, the container only has its
      // CSS `min-height: 100vh` fallback (see index.css), which would make
      // `padStart` read as ~0 and briefly fire the avatar at page load.
      if (hero && hero.classList.contains("sw-root")) {
        const rect = hero.getBoundingClientRect();
        const vh = window.innerHeight;
        const padStart = rect.height - vh;
        const distancePastPadStart = -rect.top - padStart;
        setAvatarActive(distancePastPadStart >= 0);
        if (distancePastPadStart >= 0) {
          setPhase(distancePastPadStart >= vh * 1.3 ? "guide" : "intro");
        }
      }
      const pricingHeading = document.getElementById("pricing-heading");
      if (pricingHeading) setRetreated(pricingHeading.getBoundingClientRect().bottom <= 0);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Below `lg` there's no reliable empty gutter to jump around in — collapse to a
  // single static corner badge instead of risking an overlap on narrow screens.
  // The big intro moment is desktop-only for the same reason (plus it's a lot of
  // video weight to push to a phone) — mobile goes straight to the small badge.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const showIntro = avatarActive && isDesktop && phase === "intro";
  const showGuide = avatarActive && !retreated && !showIntro;

  // The intro holds the visitor for a minimum dwell before they can scroll
  // past it — starts fresh each time the intro (re)appears (e.g. after
  // scrolling back up into it).
  useEffect(() => {
    if (!showIntro) {
      setDwellDone(false);
      return;
    }
    const timer = setTimeout(() => setDwellDone(true), DWELL_MS);
    return () => clearTimeout(timer);
  }, [showIntro]);

  // Block scroll input while the dwell is active — preventDefault on wheel/
  // touch/scroll-key events stops the scroll from happening at all, rather
  // than letting it happen and snapping back (which would jitter).
  useEffect(() => {
    if (!showIntro || dwellDone) return;
    const blockWheelOrTouch = (e: Event) => e.preventDefault();
    const SCROLL_KEYS = [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"];
    const blockKeys = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.includes(e.key)) e.preventDefault();
    };
    window.addEventListener("wheel", blockWheelOrTouch, { passive: false });
    window.addEventListener("touchmove", blockWheelOrTouch, { passive: false });
    window.addEventListener("keydown", blockKeys);
    return () => {
      window.removeEventListener("wheel", blockWheelOrTouch);
      window.removeEventListener("touchmove", blockWheelOrTouch);
      window.removeEventListener("keydown", blockKeys);
    };
  }, [showIntro, dwellDone]);

  // Track which of the 4 tour-stop sections is currently near the middle of the
  // viewport, using a narrow rootMargin band so the "active" section only changes
  // once, cleanly, as it crosses the centre — not on every pixel of scroll.
  useEffect(() => {
    const els = STOPS.
    map((s) => document.getElementById(s.sectionId)).
    filter((el): el is HTMLElement => !!el);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = STOPS.findIndex((s) => s.sectionId === entry.target.id);
          if (idx !== -1) setActiveStop(idx);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const recompute = () => setTarget(cornerToPoint(STOPS[activeStop].corner));
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [activeStop]);

  // The badge sits at an exact viewport corner; the bubble hangs off whichever
  // side has room (away from the screen edge the badge is anchored to) so it
  // can never get clipped or push the badge off its intended spot.
  const bubbleSide: "left" | "right" = target.left > window.innerWidth / 2 ? "left" : "right";

  return (
    <AnimatePresence>
      {showIntro &&
      <motion.div
        key="intro"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center">

          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />

          <div className="relative z-10">
            <motion.button
            layoutId="sw-avatar"
            layout
            transition={{ type: "spring", stiffness: 160, damping: 24 }}
            onClick={videoFailed ? undefined : togglePlay}
            aria-label={videoFailed ? "AesthetixAI guide" : videoPaused ? "Play the introduction" : "Pause the introduction"}
            className={`relative block h-72 w-72 overflow-hidden rounded-full border-4 border-white shadow-lift ${
            videoFailed ? "" : "cursor-pointer"} ${FOCUS_RING}`
            }>

              {!videoFailed ?
            <video
              ref={videoRef}
              autoPlay
              loop
              muted={muted}
              playsInline
              src="/lets-scroll/avatar-intro.mp4"
              onError={() => setVideoFailed(true)}
              onPlay={() => setVideoPaused(false)}
              onPause={() => setVideoPaused(true)}
              className="h-full w-full object-cover" /> :


            <img
              src="/lets-scroll/avatar-doctor.png"
              alt="AesthetixAI guide"
              className="h-full w-full object-cover"
              onError={(e) => {e.currentTarget.style.display = "none";}} />

            }
              {videoPaused && !videoFailed &&
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/20">
                  <PlayIcon className="h-14 w-14 text-white drop-shadow-lg" />
                </span>
            }
            </motion.button>
            {!videoFailed &&
          <button
            onClick={toggleMuted}
            aria-label={muted ? "Unmute" : "Mute"}
            className={`absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-ink/70 text-white backdrop-blur-sm transition-colors hover:bg-ink/90 ${FOCUS_RING}`}>

                {muted ? <VolumeXIcon className="h-4.5 w-4.5" /> : <Volume2Icon className="h-4.5 w-4.5" />}
              </button>
          }
          </div>
          <p className="relative z-10 mt-6 text-sm font-medium text-white/80">
            {dwellDone ? "Keep scrolling to continue" : "Give me just a second…"}
          </p>
        </motion.div>
      }

      {showGuide && !isDesktop &&
      <motion.div
        key="mobile-guide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-2.5">

          <div className="rounded-2xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-lift">
            {STOPS[activeStop].message}
          </div>
          <AvatarBadge imageFailed={imageFailed} setImageFailed={setImageFailed} />
        </motion.div>
      }

      {showGuide && isDesktop &&
      <motion.div
        key="desktop-guide"
        className="fixed z-50 h-16 w-16"
        animate={{ top: target.top, left: target.left }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 170, damping: 22 }}
        onAnimationStart={() => setMoving(true)}
        onAnimationComplete={() => setMoving(false)}>

          <div className="relative h-16 w-16">
            <AnimatePresence>
              {!moving &&
            <motion.div
              key={activeStop}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className={`absolute top-1/2 w-[240px] -translate-y-1/2 rounded-2xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-lift ${
              bubbleSide === "left" ? "right-[calc(100%+12px)]" : "left-[calc(100%+12px)]"}`
              }>

                  {STOPS[activeStop].message}
                </motion.div>
            }
            </AnimatePresence>
            <AvatarBadge imageFailed={imageFailed} setImageFailed={setImageFailed} />
          </div>
        </motion.div>
      }
    </AnimatePresence>);

}

function AvatarBadge({
  imageFailed,
  setImageFailed



}: {imageFailed: boolean;setImageFailed: (v: boolean) => void;}) {
  return (
    <motion.div
      layoutId="sw-avatar"
      layout
      transition={{ type: "spring", stiffness: 160, damping: 24 }}
      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-teal-600 shadow-lift">

      {!imageFailed ?
      <img
        src="/lets-scroll/avatar-doctor.png"
        alt="AesthetixAI guide"
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)} /> :


      <StethoscopeIcon className="h-7 w-7 text-white" />
      }
    </motion.div>);

}

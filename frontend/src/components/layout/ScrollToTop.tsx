import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const KEY_PREFIX = "scrollpos:";

function readSaved(pathname: string): number {
  try {
    return Number(sessionStorage.getItem(KEY_PREFIX + pathname) || 0);
  } catch {
    return 0;
  }
}

function writeSaved(pathname: string, y: number) {
  try {
    sessionStorage.setItem(KEY_PREFIX + pathname, String(y));
  } catch {
    // ignore (private mode / storage disabled) — restoration just won't work
  }
}

// A fresh forward navigation ("PUSH" — clicking a link/CTA to a new page)
// always starts at the top. Browser back/forward ("POP") restores the exact
// scroll position the visitor left that page at.
//
// The save can't just happen reactively (e.g. on every `scroll` event, or
// even on a timer): when a page unmounts — the hero's tall content
// disappearing as the homepage gives way to a shorter page — the browser
// clamps `scrollY` to the new, shorter height as a genuine side effect of the
// DOM shrinking, and that clamp is itself indistinguishable from a real
// scroll after the fact. So instead this saves at the one moment that's
// actually reliable: a capture-phase click listener fires *before* React
// Router's own handler processes the navigation, while `window.scrollY` is
// still the true, un-clamped position of the page the visitor is still on.
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.("a[href]");
      if (!anchor) return;
      writeSaved(window.location.pathname, window.scrollY);
    };
    document.addEventListener("click", onClickCapture, { capture: true });
    return () => document.removeEventListener("click", onClickCapture, { capture: true });
  }, []);

  useEffect(() => {
    // A link like `/#security` (used by the footer to reach a homepage
    // section from another page) is a real cross-page navigation — pathname
    // changes, so this effect would otherwise force-scroll to top and fight
    // the anchor. Scroll to the target element instead once it exists (the
    // hero's async height means the target may not be laid out yet on the
    // very first frame).
    if (hash) {
      const id = hash.slice(1);
      let cancelled = false;
      let attempts = 0;
      const tryScrollToHash = () => {
        if (cancelled) return;
        attempts++;
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView();
        } else if (attempts <= 60) {
          requestAnimationFrame(tryScrollToHash);
        }
      };
      requestAnimationFrame(tryScrollToHash);
      return () => {
        cancelled = true;
      };
    }

    const saved = navigationType === "POP" ? readSaved(pathname) : 0;
    if (saved <= 0) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }
    // The cinematic hero sets its real (tall) height asynchronously, a beat
    // after mount (see CinematicHero.tsx) — restoring immediately into a
    // still-short page would get silently clamped to 0, so wait until the
    // document is actually tall enough for the saved position.
    let cancelled = false;
    let attempts = 0;
    const tryRestore = () => {
      if (cancelled) return;
      attempts++;
      const pageIsTallEnough = document.body.scrollHeight - window.innerHeight >= saved;
      if (pageIsTallEnough || attempts > 60) {
        window.scrollTo({ top: saved, left: 0, behavior: "instant" });
      } else {
        requestAnimationFrame(tryRestore);
      }
    };
    requestAnimationFrame(tryRestore);
    return () => {
      cancelled = true;
    };
  }, [pathname, navigationType, hash]);

  return null;
}

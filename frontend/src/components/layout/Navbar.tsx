
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ActivityIcon, MenuIcon, XIcon } from "lucide-react";
import { Button } from "../ui";

const LINKS = [
{ label: "Platform", href: "#platform" },
{ label: "Agents", href: "#agents" },
{ label: "How it works", href: "#how-it-works" },
{ label: "Results", href: "#results" },
{ label: "Pricing", href: "#pricing" }];


export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-canvas/85 backdrop-blur-xl border-b border-sand-200" : "bg-transparent"}`
      }>
      
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white shadow-soft">
            <ActivityIcon className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">
            Aesthetix<span className="text-teal-600">AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) =>
          <a
            key={l.href}
            href={l.href}
            className="text-sm font-medium text-ink-soft transition-colors hover:text-teal-600">
            
              {l.label}
            </a>
          )}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="#demo" className="text-sm font-semibold text-ink transition-colors hover:text-teal-600">
            Sign in
          </a>
          <Button href="#demo" size="sm" arrow className="shadow-soft">
            Book a demo
          </Button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink lg:hidden"
          aria-label="Toggle menu">
          
          {open ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden border-t border-sand-200 bg-canvas lg:hidden">
          
            <div className="flex flex-col gap-1 px-5 py-4">
              {LINKS.map((l) =>
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-base font-medium text-ink-soft hover:bg-sand-100">
              
                  {l.label}
                </a>
            )}
              <Button
                href="#demo"
                size="sm"
                arrow
                onClick={() => setOpen(false)}
                className="mt-2">

                Book a demo
              </Button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </header>);

}








import React from "react";
import { motion } from "framer-motion";
import { ArrowRightIcon, CalendarIcon } from "lucide-react";

export function CTA() {
  return (
    <section id="demo" className="scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-ink px-8 py-16 text-center sm:px-16 sm:py-20">
        
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-[700px] -translate-x-1/2 rounded-full bg-teal-500/25 blur-[110px]" />
        </div>
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-semibold text-teal-300">
            <CalendarIcon className="h-4 w-4" /> 30-minute walkthrough
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl font-display text-4xl font-500 leading-tight tracking-tight text-white sm:text-5xl">
            See your practice run on autopilot.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">
            Book a live demo and we'll show you exactly how the agents handle your calls, bookings,
            surgery logistics, recovery, and marketing — using your own workflows.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="#demo"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-teal-300 px-8 py-3.5 text-base font-semibold text-ink transition-all hover:bg-white">
              
              Book a demo
              <ArrowRightIcon className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10">
              
              View pricing
            </a>
          </div>
        </div>
      </motion.div>
    </section>);

}
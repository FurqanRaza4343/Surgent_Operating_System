

import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  PhoneCallIcon,
  ShieldCheckIcon,
  SparklesIcon } from
"lucide-react";
import { TOTAL_AGENTS } from "../data/agents";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const }
  })
};

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-36 pb-20 sm:pt-44 sm:pb-28">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-teal-100/50 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(11,29,38,0.06) 1px, transparent 0)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black, transparent)"
          }} />

      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-5 text-center sm:px-8">
        <motion.div
          variants={fadeUp}
          custom={0}
          initial="hidden"
          animate="show"
          className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-700">

          <SparklesIcon className="h-4 w-4" />
          {TOTAL_AGENTS} autonomous agents built for aesthetic practices
        </motion.div>

        <motion.h1
          variants={fadeUp}
          custom={1}
          initial="hidden"
          animate="show"
          className="mt-6 font-display text-[2.6rem] font-500 leading-[1.08] tracking-tight text-ink sm:text-6xl lg:text-[4rem]">

          Your practice, run by an{" "}
          <span className="relative inline-block text-teal-600">
            AI workforce
            <svg
              className="absolute -bottom-1 left-0 w-full"
              viewBox="0 0 200 8"
              preserveAspectRatio="none"
              aria-hidden="true">

              <path d="M2 5.5C40 2 160 2 198 5.5" stroke="#A6D8D4" strokeWidth="4" strokeLinecap="round" fill="none" />
            </svg>
          </span>{" "}
          — around the clock.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          custom={2}
          initial="hidden"
          animate="show"
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">

          From the first call to full recovery, autonomous agents answer patients, book
          consultations, monitor healing and grow revenue — across phone, chat, WhatsApp,
          Instagram and more.
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={3}
          initial="hidden"
          animate="show"
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row">

          <a
            href="#demo"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-7 py-3.5 text-base font-semibold text-white shadow-lift transition-all hover:bg-teal-700">

            Book a demo
            <ArrowRightIcon className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#agents"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-sand-300 bg-white px-7 py-3.5 text-base font-semibold text-ink transition-all hover:border-teal-300 hover:text-teal-600">

            <PhoneCallIcon className="h-4.5 w-4.5" />
            Hear the AI receptionist
          </a>
        </motion.div>

        <motion.div
          variants={fadeUp}
          custom={4}
          initial="hidden"
          animate="show"
          className="mt-6 flex items-center gap-1.5 text-sm font-medium text-ink-muted">

          <ShieldCheckIcon className="h-4 w-4 text-teal-500" />
          HIPAA-aware workflows · No credit card required
        </motion.div>
      </div>
    </section>);

}

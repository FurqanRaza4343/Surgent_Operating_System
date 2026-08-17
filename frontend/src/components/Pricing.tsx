






import React from "react";
import { motion } from "framer-motion";
import { CheckIcon, ArrowRightIcon } from "lucide-react";

const PLANS = [
{
  name: "Solo",
  tagline: "For single-surgeon practices",
  price: "$690",
  period: "/mo",
  highlight: false,
  features: [
  "Front desk & intake agents",
  "Booking, reminders & rescheduling",
  "1 connected social channel",
  "Multilingual support",
  "Email support"]

},
{
  name: "Practice",
  tagline: "For growing multi-surgeon clinics",
  price: "$1,690",
  period: "/mo",
  highlight: true,
  features: [
  "Everything in Solo",
  "Full consultation & surgery agents",
  "Post-surgery care & recovery suite",
  "All social channels connected",
  "Analytics dashboard",
  "Priority onboarding & support"]

},
{
  name: "Enterprise",
  tagline: "For groups & multi-location brands",
  price: "Custom",
  period: "",
  highlight: false,
  features: [
  "Everything in Practice",
  "All 31 agents, fully configured",
  "Multi-location orchestration",
  "Custom integrations & EHR",
  "BAA & dedicated success manager"]

}];


export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-4xl font-500 tracking-tight text-ink sm:text-5xl">
            One flat fee. An entire team of agents.
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            No per-seat billing. No per-call surprises. Cancel anytime.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((p, i) =>
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: i * 0.1 }}
            className={`relative flex flex-col rounded-4xl border p-8 ${
            p.highlight ?
            "border-teal-500 bg-ink text-white shadow-lift" :
            "border-sand-200 bg-white text-ink shadow-soft"}`
            }>
            
              {p.highlight &&
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-300 px-4 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                  Most popular
                </span>
            }
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className={`mt-1 text-sm ${p.highlight ? "text-white/60" : "text-ink-muted"}`}>
                {p.tagline}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-600">{p.price}</span>
                <span className={p.highlight ? "text-white/60" : "text-ink-muted"}>{p.period}</span>
              </div>

              <a
              href="#demo"
              className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all ${
              p.highlight ?
              "bg-teal-300 text-ink hover:bg-white" :
              "bg-ink text-white hover:bg-teal-600"}`
              }>
              
                {p.price === "Custom" ? "Talk to sales" : "Start free trial"}
                <ArrowRightIcon className="h-4 w-4" />
              </a>

              <ul className="mt-8 space-y-3">
                {p.features.map((f) =>
              <li key={f} className="flex items-start gap-3">
                    <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  p.highlight ? "bg-teal-300 text-ink" : "bg-teal-500 text-white"}`
                  }>
                  
                      <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className={p.highlight ? "text-white/80" : "text-ink-soft"}>{f}</span>
                  </li>
              )}
              </ul>
            </motion.div>
          )}
        </div>
      </div>
    </section>);

}
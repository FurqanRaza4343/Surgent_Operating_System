




import React from "react";
import { motion } from "framer-motion";
import { TrendingUpIcon, UsersIcon, DollarSignIcon, PhoneCallIcon } from "lucide-react";

const KPIS = [
{ icon: PhoneCallIcon, label: "Calls handled", value: "3,912", change: "+18%" },
{ icon: UsersIcon, label: "New consults", value: "486", change: "+27%" },
{ icon: DollarSignIcon, label: "Revenue attributed", value: "$1.24M", change: "+31%" },
{ icon: TrendingUpIcon, label: "Show-up rate", value: "94%", change: "+12%" }];


const BARS = [42, 58, 51, 70, 64, 82, 76, 91, 88, 96];

export function DashboardPreview() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">
            Analytics dashboard
          </p>
          <h2 className="mt-3 font-display text-4xl font-500 tracking-tight text-ink sm:text-5xl">
            See exactly what your agents are doing.
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Every call, booking, procedure, and dollar — measured in one place, in real time.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="mt-14 rounded-4xl border border-sand-200 bg-white p-5 shadow-lift sm:p-8">
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KPIS.map((k) =>
            <div key={k.label} className="rounded-2xl bg-sand-50 p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-600 shadow-soft">
                    <k.icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                    {k.change}
                  </span>
                </div>
                <p className="mt-4 font-display text-3xl font-600 text-ink">{k.value}</p>
                <p className="mt-1 text-sm text-ink-muted">{k.label}</p>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-sand-200 p-6">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">Consults booked</p>
                <span className="text-sm text-ink-muted">Last 10 weeks</span>
              </div>
              <div className="mt-6 flex h-44 items-end gap-2.5">
                {BARS.map((h, i) =>
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                  className="flex-1 rounded-t-md bg-teal-500/80 last:bg-teal-500" />

                )}
              </div>
            </div>

            <div className="rounded-2xl border border-sand-200 p-6">
              <p className="font-semibold text-ink">Top procedures</p>
              <div className="mt-5 space-y-4">
                {[
                { label: "Rhinoplasty", pct: 34 },
                { label: "Breast aug.", pct: 26 },
                { label: "Liposuction", pct: 21 },
                { label: "Facelift", pct: 19 }].
                map((p) =>
                <div key={p.label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-soft">{p.label}</span>
                      <span className="font-semibold text-ink">{p.pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-sand-100">
                      <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${p.pct * 2.5}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="h-full rounded-full bg-teal-500" />
                    
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>);

}
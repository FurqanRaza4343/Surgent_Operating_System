





import React from "react";
import { motion } from "framer-motion";
import { StarIcon } from "lucide-react";

const TESTIMONIALS = [
{
  quote:
  "We stopped losing after-hours leads overnight. The receptionist and booking agents alone paid for the platform in the first month.",
  name: "Dr. Julian Reyes",
  role: "Founder, Meridian Plastic Surgery",
  img: "/f9505941-39c2-420f-ac10-90877945251b.jpg"
},
{
  quote:
  "Our front desk finally focuses on patients in the room, not the phone. The recovery agents keep post-op patients calm and safe.",
  name: "Dr. Elena Vance",
  role: "Clinic Director, Lumière Aesthetics",
  img: "/f7fbde77-7fbf-4efb-bdfa-87f9acb3faf2.jpg"
},
{
  quote:
  "Instagram and WhatsApp used to be a black hole. Now every DM gets an instant, on-brand reply — and most turn into consults.",
  name: "Marcus Feld",
  role: "Practice Manager, Nova Cosmetic Group",
  img: "/4a3e14d0-56a7-4224-94b7-5549ea16fdb8.jpg"
}];


export function Testimonials() {
  return (
    <section id="results" className="scroll-mt-24 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">
            Loved by practices
          </p>
          <h2 className="mt-3 font-display text-4xl font-500 tracking-tight text-ink sm:text-5xl">
            Surgeons focus on surgery. Agents do the rest.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) =>
          <motion.figure
            key={t.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="flex flex-col rounded-4xl border border-sand-200 bg-canvas p-7 shadow-soft">
            
              <div className="flex gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, s) =>
              <StarIcon key={s} className="h-4.5 w-4.5 fill-current" />
              )}
              </div>
              <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-ink">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-sand-200 pt-5">
                <img src={t.img} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-ink">{t.name}</p>
                  <p className="text-sm text-ink-muted">{t.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          )}
        </div>
      </div>
    </section>);

}
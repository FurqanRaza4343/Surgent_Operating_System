import React, { useState } from "react";
import { motion } from "framer-motion";
import { CalendarIcon, CheckCircleIcon, ScissorsIcon } from "lucide-react";
import { submitConsultationRequest } from "../../api/entities";

export function BookConsultationSection() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [complaint, setComplaint] = useState("");
  const [needsSurgery, setNeedsSurgery] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = fullName.trim().length > 1 && complaint.trim().length > 3 && !sending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      await submitConsultationRequest({
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        chief_complaint: complaint.trim(),
        needs_surgery: needsSurgery
      });
      setDone(true);
    } catch {
      setError("Couldn't send your request — please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="book" className="scroll-mt-24 px-5 py-16 sm:px-8 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-6xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white px-4 py-1.5 text-sm font-semibold text-teal-600">
            <CalendarIcon className="h-4 w-4" /> Request a consultation
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-500 leading-tight tracking-tight text-ink sm:text-4xl">
            Thinking about a procedure? Start the conversation today.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-ink-muted">
            Tell us a little about what you're looking for — our team will reach out to book your
            consultation.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-4xl border border-sand-200 bg-white p-8 shadow-lift">
          {done ?
          <div className="flex flex-col items-center py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircleIcon className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-bold text-ink">Request received</p>
              <p className="mt-1 max-w-sm text-sm text-ink-muted">
                Thanks {fullName.trim().split(" ")[0]} — our team will call you back shortly to book your consultation.
              </p>
              <button
              onClick={() => { setDone(false); setComplaint(""); setEmail(""); setPhone(""); setNeedsSurgery(false); }}
              className="mt-6 text-sm font-semibold text-teal-600 transition-colors hover:text-teal-700">
                Send another request
              </button>
            </div> :

          <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Full name <span className="text-danger">*</span>
                </span>
                <input
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Email</span>
                  <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Phone</span>
                  <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  What are you looking for? <span className="text-danger">*</span>
                </span>
                <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                rows={3}
                placeholder="e.g. Interested in rhinoplasty and would like to discuss options and pricing."
                className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

              </label>

              <label className="flex items-center gap-2.5 rounded-xl bg-sand-100 px-4 py-3">
                <input
                type="checkbox"
                checked={needsSurgery}
                onChange={(e) => setNeedsSurgery(e.target.checked)}
                className="h-4 w-4 rounded border-sand-200 text-teal-600 focus:ring-teal-600/40" />

                <ScissorsIcon className="h-4 w-4 text-ink-muted" />
                <span className="text-sm text-ink-soft">This is about a surgery (or I'm considering one)</span>
              </label>

              {error && <p className="text-sm text-danger">{error}</p>}

              <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
                {sending ? "Sending…" : "Request a consultation"}
              </button>
            </form>
          }
        </div>
      </motion.div>
    </section>);

}
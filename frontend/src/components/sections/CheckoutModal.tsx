import React, { useState } from "react";
import { XIcon, Loader2Icon } from "lucide-react";
import { createCheckoutSession } from "../../api/commerce";
import { ApiError } from "../../api/client";

interface CheckoutModalProps {
  planId: "solo" | "practice";
  planName: string;
  onClose: () => void;
}

export function CheckoutModal({ planId, planName, onClose }: CheckoutModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { url } = await createCheckoutSession(email, planId);
      window.location.href = url;
    } catch (err) {
      // Expected today — Stripe is wired with placeholder price IDs until
      // real ones are set in backend/.env (STRIPE_PRICE_SOLO/PRACTICE).
      const message =
      err instanceof ApiError ?
      "Checkout isn't fully connected yet — our team has been notified. Please try again shortly or book a demo instead." :
      "Something went wrong. Please try again.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-4xl border border-sand-200 bg-white p-7 shadow-lift"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-600">{planName} plan</p>
            <h3 className="mt-1 font-display text-2xl font-600 text-ink">Start your free trial</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-sand-100 hover:text-ink">

            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6">
          <label className="block text-sm font-medium text-ink-soft">
            Work email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@practice.com"
              className="mt-1.5 w-full rounded-xl border border-sand-200 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-400" />

          </label>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">

            {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {loading ? "Redirecting to checkout…" : "Continue to checkout"}
          </button>
          <p className="mt-3 text-center text-xs text-ink-muted">
            You'll be redirected to Stripe to complete payment securely.
          </p>
        </form>
      </div>
    </div>);

}

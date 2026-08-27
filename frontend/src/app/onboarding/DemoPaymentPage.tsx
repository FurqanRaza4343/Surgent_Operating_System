import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LockIcon, Loader2Icon, CalendarIcon, ShieldCheckIcon, MailIcon, CheckIcon } from "lucide-react";
import { OnboardingLayout } from "./OnboardingLayout";
import { planFor } from "../dashboard/plan/planCapabilities";
import type { PlanTier } from "../../data/planTiers";
import { confirmDemoPayment } from "../../api/checkout";
import { ApiError } from "../../api/client";

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | null;

function detectBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return null;
}

const BRAND_LABEL: Record<Exclude<CardBrand, null>, string> = {
  visa: "VISA",
  mastercard: "Mastercard",
  amex: "AMEX",
  discover: "Discover"
};

function CardBrandBadge({ brand, active }: { brand: Exclude<CardBrand, null>; active: boolean }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wide transition-colors ${
      active ? "border-teal-600 bg-teal-600/8 text-teal-600" : "border-sand-200 text-ink-muted/50"}`
      }>

      {BRAND_LABEL[brand]}
    </span>);

}

// A real card-entry step — not a skip-straight-to-success shortcut. Styled
// to read as a genuine hosted payment page (order summary, live card-brand
// detection, a locked "Pay" action, "Powered by Stripe" footer) but is
// entirely our own UI: no card data leaves the browser, nothing is
// validated beyond shape, and "Pay" just calls confirm-demo-payment
// (backend/.env's Stripe keys are still placeholders — see
// checkout_services.py's _stripe_configured()). Swapping in Stripe's real
// Elements/Checkout here is the natural next step once real keys exist;
// this page's route (/pricing/pay) and query params stay the same.
export function DemoPaymentPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id") || "";
  const planTier = (params.get("plan_tier") as PlanTier) || "solo";
  const email = params.get("email") || "";
  const plan = planFor(planTier);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardDigits = cardNumber.replace(/\D/g, "");
  const brand = useMemo(() => detectBrand(cardDigits), [cardDigits]);
  const canPay = cardDigits.length === 16 && /^\d{2}\/\d{2}$/.test(expiry) && cvc.length >= 3 && name.trim().length > 1;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!canPay || loading) return;
    setLoading(true);
    setError(null);
    try {
      await confirmDemoPayment(sessionId);
      navigate(`/pricing/success?session_id=${encodeURIComponent(sessionId)}&plan_tier=${planTier}&email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof ApiError ? "Payment couldn't be confirmed. Please try again." : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout step={{ current: 1, total: 3 }}>
      <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-lift">
        <div className="border-b border-sand-200 bg-gradient-to-b from-sand-50 to-white px-7 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-ink-muted">Subscribe to AesthetixAI</p>
            <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-bold text-warning">
              <ShieldCheckIcon className="h-3 w-3" /> Test mode
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {plan.price}<span className="text-base font-medium text-ink-muted">{plan.period}</span>
          </p>
          <p className="mt-0.5 text-sm text-ink-muted">{plan.name} plan · billed monthly</p>
        </div>

        <form onSubmit={handlePay} className="space-y-4 px-7 py-6">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <MailIcon className="h-3.5 w-3.5" /> Email
            </span>
            <div className="flex items-center justify-between rounded-xl border border-sand-200 bg-sand-100 px-3.5 py-2.5">
              <span className="truncate text-sm text-ink-soft">{email}</span>
              <CheckIcon className="h-4 w-4 shrink-0 text-success" />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Card information</span>
            <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-sand-200 bg-canvas px-3.5 py-2.5 transition-colors focus-within:border-teal-600/40">
              <input
                autoFocus
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 1234 1234 1234"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />

              <div className="flex shrink-0 gap-1">
                {(["visa", "mastercard", "amex", "discover"] as const).map((b) =>
                <CardBrandBadge key={b} brand={b} active={brand === b} />
                )}
              </div>
            </div>
            <div className="flex rounded-b-xl border border-sand-200 bg-canvas transition-colors focus-within:border-teal-600/40">
              <div className="flex w-1/2 items-center gap-1.5 border-r border-sand-200 px-3.5 py-2.5">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <input
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM / YY"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />

              </div>
              <div className="flex w-1/2 items-center gap-1.5 px-3.5 py-2.5">
                <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                <input
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="CVC"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />

              </div>
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Name on card</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={!canPay || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">

            {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <LockIcon className="h-3.5 w-3.5" />}
            Pay {plan.price}{plan.period}
          </button>
        </form>

        <div className="border-t border-sand-200 bg-sand-50 px-7 py-4">
          <div className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
            <LockIcon className="h-3 w-3" />
            <span>Powered by</span>
            <span className="font-display text-sm font-bold italic text-[#635BFF]">stripe</span>
            <span className="text-ink-muted/60">— demo mode, no card data leaves your browser</span>
          </div>
        </div>
      </div>
    </OnboardingLayout>);

}

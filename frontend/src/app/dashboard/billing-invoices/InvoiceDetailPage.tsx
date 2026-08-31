import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePlan } from "../plan/PlanContext";
import { usePatients } from "../patients/usePatients";
import { getInvoice, updateInvoice, type InvoiceResponse } from "../../../api/entities";
import { DASHBOARD_ROUTES } from "../constants/routes";

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-sand-100 text-ink-soft",
  paid: "bg-success/10 text-success",
  overdue: "bg-danger/10 text-danger",
  cancelled: "bg-ink-muted/10 text-ink-muted",
  refunded: "bg-warning/10 text-warning"
};

const NEXT_STATUSES: Record<string, InvoiceResponse["status"][]> = {
  pending: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: ["refunded"],
  cancelled: [],
  refunded: []
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authedFetch, role } = usePlan();
  const { patients } = usePatients(authedFetch);
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch || !id) {
        setLoading(false);
        return;
      }
      try {
        const data = await getInvoice(authedFetch, id);
        if (!cancelled) setInvoice(data);
      } catch {
        if (!cancelled) setInvoice(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, id]);

  const canManage = role === "owner" || role === "receptionist";

  async function transitionTo(status: InvoiceResponse["status"]) {
    if (!invoice || !authedFetch) return;
    setSavingStatus(status);
    setError(null);
    try {
      const updated = await updateInvoice(authedFetch, invoice.id, { status });
      setInvoice(updated);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't update this invoice — try again.");
    } finally {
      setSavingStatus(null);
    }
  }

  if (loading) return null;

  if (!invoice) {
    return (
      <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-ink">Invoice not found</p>
      </div>);

  }

  const patient = patients.find((p) => p.id === invoice.patient_id);
  const nextStatuses = NEXT_STATUSES[invoice.status] || [];

  return (
    <>
      <Link
        to={patient ? DASHBOARD_ROUTES.patientDetail(patient.id) : DASHBOARD_ROUTES.invoices}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">

        <ArrowLeftIcon className="h-4 w-4" /> Back
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title={patient ? `Invoice — ${patient.name}` : "Invoice"} subtitle={`Created ${formatDate(invoice.created_at)}`} />
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${STATUS_CLASS[invoice.status]}`}>
          {invoice.status}
        </span>
      </div>

      <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="divide-y divide-sand-100">
          {invoice.line_items.map((line) =>
          <div key={line.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{line.description}</p>
                <p className="text-xs text-ink-muted">{line.quantity} × ${line.unit_price.toLocaleString()}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-ink">${(line.quantity * line.unit_price).toLocaleString()}</p>
            </div>
          )}
        </div>
        <div className="space-y-1.5 border-t border-sand-200 px-5 py-4">
          <div className="flex items-center justify-between text-sm text-ink-soft">
            <span>Subtotal</span><span>${invoice.subtotal_amount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-ink-soft">
            <span>Tax</span><span>${invoice.tax_amount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-ink-soft">
            <span>Discount</span><span>-${invoice.discount_amount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between border-t border-sand-100 pt-1.5 text-sm font-bold text-ink">
            <span>Total</span><span>${invoice.total_amount.toLocaleString()}</span>
          </div>
          {invoice.due_date && <p className="pt-1 text-xs text-ink-muted">Due {formatDate(invoice.due_date)}</p>}
          {invoice.paid_at && <p className="pt-1 text-xs text-ink-muted">Paid {formatDate(invoice.paid_at)}</p>}
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

      {canManage && nextStatuses.length > 0 &&
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
          {nextStatuses.map((status) =>
        <button
          key={status}
          type="button"
          onClick={() => transitionTo(status)}
          disabled={savingStatus !== null}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          status === "paid" ?
          "bg-teal-600 text-white hover:bg-teal-700" :
          "border border-sand-200 text-ink-soft hover:border-ink-muted/40"}`
          }>

              {status === "paid" && <CheckIcon className="h-4 w-4" />}
              {savingStatus === status ? "Saving…" : status === "paid" ? "Mark as paid" : `Mark ${status}`}
            </button>
        )}
        </div>
      }
    </>);

}

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  WalletIcon, ReceiptIcon, PlusIcon, CreditCardIcon,
  BanknoteIcon,   UserPlusIcon, CheckIcon, XIcon, SendIcon,
  TrashIcon, ScaleIcon, TrendingDownIcon, DollarSignIcon,
  FileTextIcon, ArrowUpRightIcon, SparklesIcon
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { KpiCard } from "../components/KpiCard";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { usePatients } from "../patients/usePatients";
import { useInvoices } from "../billing-invoices/useInvoices";
import { useExpenses } from "./useExpenses";
import { listStaff, listStaffContacts, startStaffConversation, getFinanceOverview, type FinanceOverviewResponse, type ExpenseResponse, type InvoiceResponse, type StaffResponse, type StaffContactResponse } from "../../../api/entities";
import { DASHBOARD_ROUTES } from "../constants/routes";

type Tab = "overview" | "invoices" | "payments";
type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

const TYPE_META: Record<string, { label: string; className: string }> = {
  expense: { label: "Expense", className: "bg-sand-100 text-ink-soft" },
  refund: { label: "Refund", className: "bg-warning/10 text-warning" },
  salary: { label: "Salary", className: "bg-[#7C3AED]/10 text-[#7C3AED]" }
};

const INVOICE_STATUS_CLASS: Record<string, string> = {
  pending: "bg-sand-100 text-ink-soft",
  paid: "bg-success/10 text-success",
  overdue: "bg-danger/10 text-danger",
  cancelled: "bg-ink-muted/10 text-ink-muted",
  refunded: "bg-warning/10 text-warning"
};

const TYPE_OPTIONS = ["expense", "refund", "salary"];

function formatMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? TYPE_META.expense;
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${meta.className}`}>{meta.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const paid = status === "paid";
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${paid ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-success" : "bg-warning"}`} /> {paid ? "Paid" : "Pending"}
    </span>
  );
}

// One finance hub: KPIs, invoices, and payments (expenses / refunds /
// salaries) all in one premium screen. An owner can run the whole money side
// without leaving this page — raise an invoice, charge a card, pay a salary,
// refund a patient, and share a receipt straight into a staff chat. A
// receptionist sees the same numbers read-only.
export function FinanceOverviewPage() {
  const { authedFetch, role } = usePlan();
  const isOwner = role === "owner";
  const [tab, setTab] = useState<Tab>("overview");

  const [overview, setOverview] = useState<FinanceOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [staff, setStaff] = useState<StaffResponse[]>([]);

  const { patients } = usePatients(authedFetch);
  const { invoices, loading: invoicesLoading, refetch: refetchInvoices, update: updateInvoice } = useInvoices(authedFetch);
  const { expenses, loading: expensesLoading, refetch: refetchExpenses, create: createExpense, update: updateExpense, remove: removeExpense } = useExpenses(authedFetch);

  const [showCharge, setShowCharge] = useState<InvoiceResponse | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showPaySalary, setShowPaySalary] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch) { setOverviewLoading(false); return; }
      try { const d = await getFinanceOverview(authedFetch); if (!cancelled) setOverview(d); }
      catch { if (!cancelled) setOverview(null); }
      finally { if (!cancelled) setOverviewLoading(false); }
    })();
    if (isOwner && authedFetch) {
      listStaff(authedFetch).then(setStaff).catch(() => undefined);
    }
    return () => { cancelled = true; };
  }, [authedFetch, isOwner]);

  const patientName = (patientId: string) => patients.find((p) => p.id === patientId)?.name || "Unknown patient";
  const loading = overviewLoading || invoicesLoading || expensesLoading;
  const hasData = overview ? overview.invoice_count > 0 || overview.expense_count > 0 : false;

  const pendingInvoices = useMemo(() => invoices.filter((i) => i.status === "pending" || i.status === "overdue"), [invoices]);
  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);
  const recentExpenses = useMemo(() => expenses.slice(0, 5), [expenses]);

  async function markInvoicePaid(id: string) {
    await updateInvoice(id, { status: "paid" });
    await refetchInvoices();
    await refetchExpenses();
    setOverview(await getFinanceOverview(authedFetch!));
  }

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle={isOwner
          ? "Everything money, in one place — raise invoices, charge cards, pay salaries & expenses, and share receipts."
          : "A read-only view of the practice's finances."} />

      {isOwner &&
      <div className="mb-6 flex flex-wrap items-center gap-2.5">
          <Link
          to={DASHBOARD_ROUTES.invoiceNew()}
          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(13,148,136,0.25)] transition-colors hover:bg-teal-700">
            <PlusIcon className="h-4 w-4" /> New invoice
          </Link>
          <button
          type="button"
          onClick={() => setShowPaySalary(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(124,58,237,0.25)] transition-colors hover:bg-[#6D28D9]">
            <UserPlusIcon className="h-4 w-4" /> Pay salary
          </button>
          <button
          type="button"
          onClick={() => setShowAddExpense(true)}
          className="flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
            <BanknoteIcon className="h-4 w-4" /> Record payment
          </button>
        </div>
      }

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={DollarSignIcon} label="Revenue (paid)" value={formatMoney(overview?.total_revenue ?? 0)} changePercent={Math.min(100, Math.max(1, (overview?.total_revenue ?? 0) * 0.02))} color="#16A34A" />
        <KpiCard icon={TrendingDownIcon} label="Spending" value={formatMoney(overview?.total_expenses ?? 0)} color="#DC2626" />
        <KpiCard icon={ScaleIcon} label="Net" value={formatMoney(overview?.net ?? 0)} color={(overview?.net ?? 0) >= 0 ? "#2563EB" : "#DC2626"} />
        <KpiCard icon={ReceiptIcon} label="Open invoices" value={String(pendingInvoices.length)} color="#F59E0B" />
      </div>

      {/* Quick money actions (owner) */}
      {isOwner && pendingInvoices.length > 0 &&
      <div className="mt-6 overflow-hidden rounded-3xl border border-teal-600/15 bg-gradient-to-r from-teal-600/8 to-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-ink"><SparklesIcon className="h-4 w-4 text-teal-600" /> Charge a card to clear outstanding invoices</p>
              <p className="mt-0.5 text-xs text-ink-muted">{pendingInvoices.length} invoice{pendingInvoices.length > 1 ? "s" : ""} awaiting payment · {formatMoney(pendingInvoices.reduce((s, i) => s + i.total_amount, 0))}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingInvoices.slice(0, 3).map((inv) =>
            <button key={inv.id} type="button" onClick={() => setShowCharge(inv)} className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700">
                  <CreditCardIcon className="h-3.5 w-3.5" /> {patientName(inv.patient_id)} · {formatMoney(inv.total_amount)}
                </button>
            )}
            </div>
          </div>
        </div>
      }

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-sand-200">
        {(["overview", "invoices", "payments"] as Tab[]).map((t) =>
      <button
        key={t}
        type="button"
        onClick={() => setTab(t)}
        className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${tab === t ? "border-b-2 border-teal-600 text-teal-600" : "text-ink-muted hover:text-ink"}`}>
          {t}
        </button>
      )}
      </div>

      <div className="mt-6">
        {loading && !hasData ? <p className="text-sm text-ink-muted">Loading…</p> :
        !hasData && tab === "overview" ?
        <div className="rounded-3xl border border-sand-200 bg-white">
            <EmptyState icon={WalletIcon} title="Not enough data yet" body="Raise an invoice and record a payment — this page will assemble a real picture of your practice's money." />
          </div> :

        tab === "overview" ?
        <OverviewTab
          isOwner={isOwner}
          recentInvoices={recentInvoices}
          recentExpenses={recentExpenses}
          patientName={patientName}
          onGoInvoices={() => setTab("invoices")}
          onGoPayments={() => setTab("payments")} /> :

        tab === "invoices" ?
        <InvoicesTab
          isOwner={isOwner}
          invoices={invoices}
          patientName={patientName}
          onCharge={setShowCharge} /> :

        <PaymentsTab
          isOwner={isOwner}
          expenses={expenses}
          onAdd={() => setShowAddExpense(true)}
          onPaySalary={() => setShowPaySalary(true)}
          onUpdate={updateExpense}
          onDelete={removeExpense} />
        }
      </div>

      {showCharge &&
      <ChargeCardModal
        invoice={showCharge}
        patientName={patientName(showCharge.patient_id)}
        onClose={() => setShowCharge(null)}
        onPaid={markInvoicePaid}
        authedFetch={authedFetch} />}

      {showAddExpense &&
      <AddExpenseModal
        staff={staff}
        onCreate={createExpense}
        onRefresh={async () => { setOverview(await getFinanceOverview(authedFetch!)); }}
        onClose={() => setShowAddExpense(false)} />}

      {showPaySalary &&
      <PaySalaryModal
        staff={staff}
        onCreate={createExpense}
        onRefresh={async () => { setOverview(await getFinanceOverview(authedFetch!)); }}
        onClose={() => setShowPaySalary(false)} />}
    </>);

}

function OverviewTab({
  isOwner, recentInvoices, recentExpenses, patientName, onGoInvoices, onGoPayments
}: {
  isOwner: boolean; recentInvoices: InvoiceResponse[]; recentExpenses: ExpenseResponse[];
  patientName: (id: string) => string; onGoInvoices: () => void; onGoPayments: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-sand-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Recent invoices</h3>
          <button type="button" onClick={onGoInvoices} className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline">View all <ArrowUpRightIcon className="h-3 w-3" /></button>
        </div>
        {recentInvoices.length === 0 ?
        <p className="text-sm text-ink-muted">No invoices yet.</p> :
        <div className="divide-y divide-sand-100">
            {recentInvoices.map((inv) =>
          <div key={inv.id} className="flex items-center gap-3 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600/10 text-teal-600"><ReceiptIcon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{patientName(inv.patient_id)}</p>
              <p className="text-xs text-ink-muted">{formatDate(inv.due_date)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${INVOICE_STATUS_CLASS[inv.status]}`}>{inv.status}</span>
            <span className="text-sm font-semibold text-ink tabular-nums">{formatMoney(inv.total_amount)}</span>
          </div>
        )}
          </div>
        }
      </section>

      <section className="rounded-3xl border border-sand-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Recent payments</h3>
          <button type="button" onClick={onGoPayments} className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline">View all <ArrowUpRightIcon className="h-3 w-3" /></button>
        </div>
        {recentExpenses.length === 0 ?
        <p className="text-sm text-ink-muted">No payments recorded yet.</p> :
        <div className="divide-y divide-sand-100">
            {recentExpenses.map((e) =>
          <div key={e.id} className="flex items-center gap-3 py-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TYPE_META[e.expense_type]?.className ?? "bg-sand-100 text-ink-soft"}`}><BanknoteIcon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{e.payee_name || e.vendor || e.category}</p>
              <p className="text-xs text-ink-muted">{formatDate(e.expense_date)} · {TYPE_META[e.expense_type]?.label ?? "Expense"}</p>
            </div>
            <StatusBadge status={e.status} />
            <span className="text-sm font-semibold text-ink tabular-nums">{formatMoney(e.amount)}</span>
          </div>
        )}
          </div>
        }
        {isOwner &&
      <button type="button" onClick={onGoPayments} className="mt-3 w-full rounded-xl border border-dashed border-sand-300 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">
          + Manage payments
        </button>
        }
      </section>
    </div>);

}

function InvoicesTab({
  isOwner, invoices, patientName, onCharge
}: {
  isOwner: boolean; invoices: InvoiceResponse[]; patientName: (id: string) => string;
  onCharge: (inv: InvoiceResponse) => void;
}) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-3xl border border-sand-200 bg-white">
        <EmptyState icon={ReceiptIcon} title="No invoices yet" body="Raise one to start tracking revenue." />
      </div>);
  }
  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand-200 bg-sand-50/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <th className="px-5 py-3.5">Patient</th>
              <th className="px-5 py-3.5">Total</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Due</th>
              {isOwner && <th className="px-5 py-3.5 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {invoices.map((inv) =>
          <tr key={inv.id} className="transition-colors hover:bg-sand-50">
            <td className="px-5 py-3.5 font-medium text-ink">
              <Link to={DASHBOARD_ROUTES.invoiceDetail(inv.id)} className="hover:underline">{patientName(inv.patient_id)}</Link>
            </td>
            <td className="px-5 py-3.5 font-semibold text-ink tabular-nums">{formatMoney(inv.total_amount)}</td>
            <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${INVOICE_STATUS_CLASS[inv.status]}`}>{inv.status}</span></td>
            <td className="px-5 py-3.5 text-ink-soft">{formatDate(inv.due_date)}</td>
            {isOwner &&
        <td className="px-5 py-3.5 text-right">
              {inv.status === "pending" ?
          <button type="button" onClick={() => onCharge(inv)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700">
                <CreditCardIcon className="h-3.5 w-3.5" /> Charge card
              </button> :
          <Link to={DASHBOARD_ROUTES.invoiceDetail(inv.id)} className="inline-flex items-center gap-1 rounded-lg border border-sand-200 px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-teal-600/40 hover:text-teal-600">
                <FileTextIcon className="h-3.5 w-3.5" /> Receipt
              </Link>}
            </td>
            }
          </tr>
        )}
          </tbody>
        </table>
      </div>
    </div>);

}

function PaymentsTab({
  isOwner, expenses, onAdd, onPaySalary, onUpdate, onDelete
}: {
  isOwner: boolean; expenses: ExpenseResponse[];
  onAdd: () => void; onPaySalary: () => void;
  onUpdate: (id: string, data: Partial<CreateExpenseData>) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}) {
  const readOnly = !isOwner;
  if (expenses.length === 0) {
    return (
      <div className="rounded-3xl border border-sand-200 bg-white">
        <EmptyState icon={BanknoteIcon} title="No payments recorded" body="Record an expense, refund, or pay a salary to see money going out." />
      </div>);
  }
  return (
    <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-sand-200 bg-sand-50/60 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5">To / Description</th>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Amount</th>
              {isOwner && <th className="px-5 py-3.5 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {expenses.map((e) => readOnly ?
        <tr key={e.id} className="hover:bg-sand-50">
          <td className="px-5 py-3.5"><TypeBadge type={e.expense_type} /></td>
          <td className="px-5 py-3.5">
            <p className="font-medium text-ink">{e.payee_name || e.vendor || e.category}</p>
            <p className="text-xs text-ink-muted">{e.notes || e.category}</p>
          </td>
          <td className="px-5 py-3.5 text-ink-soft">{formatDate(e.expense_date)}</td>
          <td className="px-5 py-3.5"><StatusBadge status={e.status} /></td>
          <td className="px-5 py-3.5 font-semibold text-ink tabular-nums">{formatMoney(e.amount)}</td>
        </tr> :

        <ExpenseRow key={e.id} expense={e} onUpdate={onUpdate} onDelete={onDelete} />
        )}
          </tbody>
        </table>
      </div>
      {isOwner &&
      <div className="flex flex-wrap gap-2.5 border-t border-sand-200 bg-sand-50/50 px-5 py-3.5">
          <button type="button" onClick={onAdd} className="flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft hover:border-teal-600/40 hover:text-teal-600"><PlusIcon className="h-3.5 w-3.5" /> Record payment</button>
          <button type="button" onClick={onPaySalary} className="flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft hover:border-[#7C3AED]/40 hover:text-[#7C3AED]"><UserPlusIcon className="h-3.5 w-3.5" /> Pay salary</button>
        </div>
      }
    </div>);

}

// In the payments table we don't need inline edit-row complexity from before;
// keep it simple here with paid-toggle + delete (owner).
function ExpenseRow({
  expense, onUpdate, onDelete
}: {
  expense: ExpenseResponse;
  onUpdate: (id: string, data: Partial<CreateExpenseData>) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function togglePaid() {
    await onUpdate(expense.id, { status: expense.status === "paid" ? "pending" : "paid", paid_at: expense.status === "paid" ? null : new Date().toISOString() });
  }

  return (
    <tr className="hover:bg-sand-50">
      <td className="px-5 py-3.5"><TypeBadge type={expense.expense_type} /></td>
      <td className="px-5 py-3.5">
        <p className="font-medium text-ink">{expense.payee_name || expense.vendor || expense.category}</p>
        <p className="text-xs text-ink-muted">{expense.notes || expense.category}</p>
      </td>
      <td className="px-5 py-3.5 text-ink-soft">{formatDate(expense.expense_date)}</td>
      <td className="px-5 py-3.5">
        <button type="button" onClick={togglePaid} title="Toggle paid"><StatusBadge status={expense.status} /></button>
      </td>
      <td className="px-5 py-3.5 font-semibold text-ink tabular-nums">{formatMoney(expense.amount)}</td>
      <td className="px-5 py-3.5 text-right">
        {confirmingDelete ?
        <button type="button" onClick={() => onDelete(expense.id)} className="rounded-lg bg-danger px-2.5 py-1.5 text-[11px] font-semibold text-white">Confirm</button> :
        <button type="button" onClick={() => setConfirmingDelete(true)} className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger"><TrashIcon className="h-3.5 w-3.5" /></button>
        }
      </td>
    </tr>);

}

/* ---------------- Modal wrapper ---------------- */

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-sand-100"><XIcon className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>);

}

/* ---------------- Charge card + receipt (demo) ---------------- */

function ChargeCardModal({
  invoice, patientName, onClose, onPaid, authedFetch
}: {
  invoice: InvoiceResponse; patientName: string; onClose: () => void;
  onPaid: (id: string) => Promise<void>; authedFetch: AuthedFetch | null;
}) {
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/27");
  const [cvc, setCvc] = useState("123");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [sendTarget, setSendTarget] = useState<string>("");
  const [sentConversationId, setSentConversationId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<StaffContactResponse[]>([]);

  useEffect(() => {
    if (!authedFetch) return;
    listStaffContacts(authedFetch).then(setContacts).catch(() => setContacts([]));
  }, [authedFetch]);

  async function pay() {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1400)); // demo processing
    await onPaid(invoice.id);
    setProcessing(false);
    setDone(true);
  }

  const receiptText = `🧾 Receipt — ${patientName}\nInvoice #${invoice.id.slice(0, 8)}\nTotal: ${formatMoney(invoice.total_amount)}\nStatus: Paid (card) · ${new Date().toLocaleString()}`;

  async function share() {
    if (!sendTarget || !authedFetch) return;
    setSending(true);
    try {
      const conversation = await startStaffConversation(authedFetch, { recipient_user_id: sendTarget, body: receiptText });
      setSentConversationId(conversation.conversation_id);
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <Modal title="Payment successful" subtitle="Receipt generated" onClose={onClose}>
        <div className="rounded-2xl border border-sand-200 bg-sand-50/60 p-4 font-mono text-xs leading-relaxed text-ink-soft">
          {receiptText.split("\n").map((l, i) => <p key={i}>{l}</p>)}
        </div>

        <div className="mt-4 rounded-2xl border border-sand-200 p-4">
          <p className="mb-2 text-sm font-bold text-ink">Share this receipt</p>
          <p className="mb-3 text-xs text-ink-muted">Send it straight into a staff conversation — receptionist or doctor.</p>
          {sent ?
          <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3.5 py-2.5 text-sm font-semibold text-success"><CheckIcon className="h-4 w-4" /> Sent to their Messages thread</div> :
          <div className="flex gap-2">
            <select value={sendTarget} onChange={(e) => setSendTarget(e.target.value)} className="flex-1 rounded-xl border border-sand-200 bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40">
              <option value="">Choose receptionist / doctor…</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name || "Unnamed"} ({c.role})</option>)}
            </select>
            <button type="button" onClick={share} disabled={!sendTarget || sending} className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40">
              <SendIcon className="h-4 w-4" /> {sending ? "Sending…" : "Send"}
            </button>
          </div>
          }
{sendTarget && sent && sentConversationId &&
        <Link to={DASHBOARD_ROUTES.messageThread(sentConversationId)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline">
            Open conversation <ArrowUpRightIcon className="h-3 w-3" />
          </Link>
        }
        </div>

        <button type="button" onClick={onClose} className="mt-5 w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-ink-soft">Done</button>
      </Modal>);

  }

  return (
    <Modal title="Charge card" subtitle={`${patientName} · ${formatMoney(invoice.total_amount)}`} onClose={onClose}>
      <p className="mb-3 text-xs text-ink-muted">Demo checkout — no real charge is made.</p>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Card number</span>
        <input value={card} onChange={(e) => setCard(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Expiry</span>
          <input value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">CVC</span>
          <input value={cvc} onChange={(e) => setCvc(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>
      </div>
      <div className="mt-5 flex items-center gap-2.5">
        <div className="rounded-xl bg-sand-100 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Charging</p>
          <p className="text-lg font-bold text-ink tabular-nums">{formatMoney(invoice.total_amount)}</p>
        </div>
        <button type="button" onClick={pay} disabled={processing} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
          <CreditCardIcon className="h-4 w-4" /> {processing ? "Processing…" : "Pay now"}
        </button>
      </div>
    </Modal>);

}

/* ---------------- Record payment modal (expense/refund) ---------------- */

interface CreateExpenseData {
  expense_type?: string; status?: string; category: string; amount: number;
  vendor?: string | null; payee_name?: string | null; expense_date: string; notes?: string | null;
  paid_at?: string | null;
}

function AddExpenseModal({
  staff, onCreate, onRefresh, onClose
}: {
  staff: StaffResponse[]; onCreate: (d: CreateExpenseData) => Promise<unknown>;
  onRefresh: () => Promise<void>; onClose: () => void;
}) {
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Supplies");
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !category.trim()) return;
    setSaving(true); setError(null);
    try {
      await onCreate({ expense_type: type, status: "paid", category: category.trim(), amount: Number(amount), payee_name: payeeName.trim() || null, expense_date: date, notes: notes.trim() || null });
      await onRefresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't save — try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Record payment" subtitle="Log money going out — a cost, a refund, or something else" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid grid-cols-3 gap-2.5">
          {TYPE_OPTIONS.map((t) =>
        <button key={t} type="button" onClick={() => setType(t)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${type === t ? "border-teal-600 bg-teal-600/8 text-teal-600" : "border-sand-200 text-ink-soft hover:border-teal-600/40"}`}>
          {TYPE_META[t].label}
        </button>
        )}
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Category *</span>
          <input required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>

        {type === "refund" &&
      <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Refund to (patient / vendor)</span>
          <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Patient name" className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>
        }
        {type === "salary" &&
      <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Staff member</span>
          <select value={payeeName} onChange={(e) => setPayeeName(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40">
            <option value="">Select…</option>
            {staff.map((s) => <option key={s.id} value={s.name || s.email}>{s.name || s.email} ({s.role})</option>)}
          </select>
        </label>
        }
        {type === "expense" &&
      <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Vendor</span>
          <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Supplier name" className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>
        }

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Amount ($) *</span>
            <input required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Date *</span>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>

        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

        <button type="submit" disabled={saving || !amount || !category.trim()} className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-40">
          {saving ? "Saving…" : "Record payment"}
        </button>
      </form>
    </Modal>);

}

/* ---------------- Pay salary modal ---------------- */

function PaySalaryModal({
  staff, onCreate, onRefresh, onClose
}: {
  staff: StaffResponse[]; onCreate: (d: CreateExpenseData) => Promise<unknown>;
  onRefresh: () => Promise<void>; onClose: () => void;
}) {
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!payeeName || !amount) return;
    setSaving(true); setError(null);
    try {
      await onCreate({ expense_type: "salary", status: "paid", category: "Salary", amount: Number(amount), payee_name: payeeName, expense_date: `${month}-01`, notes: `Salary for ${month}` });
      await onRefresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't pay salary — try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Pay salary" subtitle="Record a salary payment for a doctor or staff member" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Staff member *</span>
          <select required value={payeeName} onChange={(e) => setPayeeName(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-[#7C3AED]/40">
            <option value="">Select doctor / staff…</option>
            {staff.map((s) => <option key={s.id} value={s.name || s.email}>{s.name || s.email} ({s.role})</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Salary ($) *</span>
            <input required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-[#7C3AED]/40" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Month *</span>
            <input required type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-[#7C3AED]/40" />
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <button type="submit" disabled={saving || !payeeName || !amount} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-40">
          <UserPlusIcon className="h-4 w-4" /> {saving ? "Paying…" : "Pay salary"}
        </button>
      </form>
    </Modal>);

}

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { WalletIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon, XIcon, BarChart3Icon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { useExpenses } from "./useExpenses";
import { DASHBOARD_ROUTES } from "../constants/routes";
import type { ExpenseResponse } from "../../../api/entities";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ExpensesPage() {
  const { authedFetch, role } = usePlan();
  const { expenses, loading, create, update, remove } = useExpenses(authedFetch);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Expenses" subtitle="Track what your practice spends — supplies, rent, payroll, anything else." />
        <div className="flex shrink-0 items-center gap-2.5">
          {role === "owner" &&
          <Link
            to={DASHBOARD_ROUTES.financeOverview}
            className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600">

              <BarChart3Icon className="h-4 w-4" /> Overview
            </Link>
          }
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

            <PlusIcon className="h-4 w-4" /> Add expense
          </button>
        </div>
      </div>

      {adding && <AddForm onCreate={create} onDone={() => setAdding(false)} />}

      <div className="mt-6">
        {loading ?
        <p className="text-sm text-ink-muted">Loading…</p> :
        expenses.length === 0 ?
        <div className="rounded-3xl border border-sand-200 bg-white">
            <EmptyState icon={WalletIcon} title="No expenses recorded yet" body="Log what your practice spends to keep a real picture of costs alongside revenue." />
          </div> :

        <div className="overflow-x-auto rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Notes</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {expenses.map((e) => <ExpenseRow key={e.id} expense={e} onUpdate={update} onDelete={remove} />)}
              </tbody>
            </table>
          </div>
        }
      </div>
    </>);

}

interface ExpenseFormData {
  category: string;
  amount: number;
  vendor?: string | null;
  expense_date: string;
  notes?: string | null;
}

function AddForm({ onCreate, onDone }: { onCreate: (data: ExpenseFormData) => Promise<unknown>; onDone: () => void }) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category.trim() || !amount) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        category: category.trim(),
        amount: Number(amount),
        vendor: vendor.trim() || null,
        expense_date: expenseDate,
        notes: notes.trim() || null
      });
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't save — try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Category *</span>
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Supplies"
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Amount ($) *</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Vendor</span>
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Date *</span>
          <input
            required
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Notes</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
      </div>

      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-5 flex items-center justify-end gap-3">
        <button type="button" onClick={onDone} className="rounded-xl border border-sand-200 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-muted/40">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !category.trim() || !amount}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">

          {saving ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>);

}

function ExpenseRow({
  expense,
  onUpdate,
  onDelete
}: {
  expense: ExpenseResponse;
  onUpdate: (id: string, data: Partial<ExpenseFormData>) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState(expense.category);
  const [amount, setAmount] = useState(String(expense.amount));
  const [vendor, setVendor] = useState(expense.vendor || "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onUpdate(expense.id, { category: category.trim(), amount: Number(amount), vendor: vendor.trim() || null });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <tr>
        <td className="px-5 py-3 text-ink-soft">{formatDate(expense.expense_date)}</td>
        <td className="px-5 py-3"><input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-sand-200 px-2.5 py-1.5 text-sm outline-none focus:border-teal-600/40" /></td>
        <td className="px-5 py-3"><input value={vendor} onChange={(e) => setVendor(e.target.value)} className="w-full rounded-lg border border-sand-200 px-2.5 py-1.5 text-sm outline-none focus:border-teal-600/40" /></td>
        <td className="px-5 py-3"><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-24 rounded-lg border border-sand-200 px-2.5 py-1.5 text-sm outline-none focus:border-teal-600/40" /></td>
        <td className="px-5 py-3 text-ink-muted">{expense.notes || "—"}</td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={save} disabled={saving} className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"><CheckIcon className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setEditing(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-sand-100"><XIcon className="h-3.5 w-3.5" /></button>
          </div>
        </td>
      </tr>);

  }

  return (
    <tr>
      <td className="px-5 py-3 text-ink-soft">{formatDate(expense.expense_date)}</td>
      <td className="px-5 py-3 font-medium text-ink">{expense.category}</td>
      <td className="px-5 py-3 text-ink-soft">{expense.vendor || "—"}</td>
      <td className="px-5 py-3 font-semibold text-ink">${expense.amount.toLocaleString()}</td>
      <td className="px-5 py-3 max-w-[220px] truncate text-ink-muted">{expense.notes || "—"}</td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setEditing(true)} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-sand-100 hover:text-teal-600"><PencilIcon className="h-3.5 w-3.5" /></button>
          {confirmingDelete ?
          <button type="button" onClick={() => onDelete(expense.id)} className="rounded-lg bg-danger px-2 py-1 text-[11px] font-semibold text-white">Confirm</button> :

          <button type="button" onClick={() => setConfirmingDelete(true)} className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-sand-100 hover:text-danger"><TrashIcon className="h-3.5 w-3.5" /></button>
          }
        </div>
      </td>
    </tr>);

}

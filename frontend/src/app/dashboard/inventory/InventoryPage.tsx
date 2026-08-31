import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PackageIcon, PlusIcon, AlertTriangleIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { useInventory } from "./useInventory";
import { DASHBOARD_ROUTES } from "../constants/routes";

export function InventoryPage() {
  const { authedFetch } = usePlan();
  const { items, loading, create } = useInventory(authedFetch);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Inventory" subtitle="Supplies and stock — what you have on hand, and what's running low." />
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

          <PlusIcon className="h-4 w-4" /> Add item
        </button>
      </div>

      {adding && <AddForm onCreate={create} onDone={() => setAdding(false)} />}

      <div className="mt-6">
        {loading ?
        <p className="text-sm text-ink-muted">Loading…</p> :
        items.length === 0 ?
        <div className="rounded-3xl border border-sand-200 bg-white">
            <EmptyState icon={PackageIcon} title="No inventory items yet" body="Add the supplies your practice stocks, then receive stock against them to start tracking what's on hand." />
          </div> :

        <div className="overflow-x-auto rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">On hand</th>
                  <th className="px-5 py-3">Unit</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {items.map((item) =>
              <tr key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                    <td className="px-5 py-3">
                      <Link to={DASHBOARD_ROUTES.inventoryItemDetail(item.id)} className="font-medium text-ink hover:text-teal-600 hover:underline">
                        {item.name}
                      </Link>
                      {item.sku && <span className="ml-2 text-xs text-ink-muted">{item.sku}</span>}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{item.category || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`font-semibold ${item.is_low_stock ? "text-danger" : "text-ink"}`}>{item.on_hand_quantity.toLocaleString()}</span>
                      {item.is_low_stock &&
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                          <AlertTriangleIcon className="h-3 w-3" /> Low
                        </span>
                  }
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{item.unit || "—"}</td>
                    <td className="px-5 py-3">
                      <Link to={DASHBOARD_ROUTES.inventoryItemDetail(item.id)} className="text-xs font-semibold text-teal-600 hover:underline">
                        Manage
                      </Link>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </div>
    </>);

}

function AddForm({ onCreate, onDone }: { onCreate: (data: { name: string; sku?: string | null; category?: string | null; unit?: string | null; reorder_threshold?: number | null }) => Promise<unknown>; onDone: () => void }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [reorderThreshold, setReorderThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        sku: sku.trim() || null,
        category: category.trim() || null,
        unit: unit.trim() || null,
        reorder_threshold: reorderThreshold ? Number(reorderThreshold) : null
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
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Name *</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Surgical Gloves (M)"
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">SKU</span>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Category</span>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Consumables"
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Unit</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="box"
            className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Low-stock at</span>
          <input
            type="number"
            min="0"
            value={reorderThreshold}
            onChange={(e) => setReorderThreshold(e.target.value)}
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
          disabled={saving || !name.trim()}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">

          {saving ? "Saving…" : "Add item"}
        </button>
      </div>
    </form>);

}

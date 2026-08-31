import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, PlusIcon, MinusIcon, AlertTriangleIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePlan } from "../plan/PlanContext";
import {
  getInventoryItem,
  listInventoryBatches,
  receiveInventoryBatch,
  consumeInventoryStock,
  type InventoryItemResponse,
  type InventoryBatchResponse
} from "../../../api/entities";
import { DASHBOARD_ROUTES } from "../constants/routes";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isExpiringSoon(iso: string | null) {
  if (!iso) return false;
  const days = (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

function isExpired(iso: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export function InventoryItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authedFetch } = usePlan();
  const [item, setItem] = useState<InventoryItemResponse | null>(null);
  const [batches, setBatches] = useState<InventoryBatchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [showConsume, setShowConsume] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    if (!authedFetch || !id) return;
    const [itemData, batchData] = await Promise.all([
      getInventoryItem(authedFetch, id),
      listInventoryBatches(authedFetch, id)
    ]);
    setItem(itemData);
    setBatches(batchData);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch || !id) {
        setLoading(false);
        return;
      }
      try {
        await refetch();
      } catch {
        if (!cancelled) setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch, id]);

  if (loading) return null;

  if (!item) {
    return (
      <div className="rounded-3xl border border-sand-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-ink">Inventory item not found</p>
      </div>);

  }

  return (
    <>
      <Link
        to={DASHBOARD_ROUTES.inventory}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">

        <ArrowLeftIcon className="h-4 w-4" /> Back to inventory
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title={item.name} subtitle={[item.sku, item.category].filter(Boolean).join(" · ") || undefined} />
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowConsume((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-danger/40 hover:text-danger">

            <MinusIcon className="h-4 w-4" /> Record usage
          </button>
          <button
            type="button"
            onClick={() => setShowReceive((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

            <PlusIcon className="h-4 w-4" /> Receive stock
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">On hand</p>
            <p className={`mt-1 font-display text-[28px] font-600 tabular-nums ${item.is_low_stock ? "text-danger" : "text-ink"}`}>
              {item.on_hand_quantity.toLocaleString()} {item.unit || ""}
            </p>
          </div>
          {item.is_low_stock &&
          <span className="flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger">
              <AlertTriangleIcon className="h-3.5 w-3.5" /> Below reorder threshold ({item.reorder_threshold})
            </span>
          }
        </div>
      </div>

      {showReceive &&
      <ReceiveForm
        onSubmit={async (data) => {
          if (!id || !authedFetch) return;
          await receiveInventoryBatch(authedFetch, id, data);
          await refetch();
          setShowReceive(false);
        }} />

      }

      {showConsume &&
      <ConsumeForm
        onSubmit={async (quantity) => {
          if (!id || !authedFetch) return;
          setError(null);
          try {
            await consumeInventoryStock(authedFetch, id, quantity);
            await refetch();
            setShowConsume(false);
          } catch (err: unknown) {
            setError(err instanceof Error && err.message ? err.message : "Couldn't record usage — try again.");
          }
        }}
        error={error} />

      }

      <p className="mb-3 text-sm font-bold text-ink">Batches received</p>
      {batches.length === 0 ?
      <p className="text-sm text-ink-muted">No stock received yet.</p> :

      <div className="overflow-x-auto rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3">Lot</th>
                <th className="px-5 py-3">Received</th>
                <th className="px-5 py-3">Expiry</th>
                <th className="px-5 py-3">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {batches.map((b) =>
            <tr key={b.id} className={b.quantity === 0 ? "opacity-40" : ""}>
                  <td className="px-5 py-3 text-ink-soft">{b.lot_number || "—"}</td>
                  <td className="px-5 py-3 text-ink-soft">{formatDate(b.received_at)}</td>
                  <td className="px-5 py-3">
                    <span className={isExpired(b.expiry_date) ? "font-semibold text-danger" : isExpiringSoon(b.expiry_date) ? "font-semibold text-warning" : "text-ink-soft"}>
                      {formatDate(b.expiry_date)}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-ink">{b.quantity.toLocaleString()}</td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      }
    </>);

}

function ReceiveForm({ onSubmit }: { onSubmit: (data: { lot_number?: string | null; quantity: number; expiry_date?: string | null }) => Promise<void> }) {
  const [lotNumber, setLotNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ lot_number: lotNumber.trim() || null, quantity: Number(quantity), expiry_date: expiryDate || null });
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't receive stock — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Quantity *</span>
          <input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Lot number</span>
          <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Expiry date</span>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40 focus:bg-white" />
        </label>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={saving || !quantity} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">
          {saving ? "Saving…" : "Receive stock"}
        </button>
      </div>
    </form>);

}

function ConsumeForm({ onSubmit, error }: { onSubmit: (quantity: number) => Promise<void>; error: string | null }) {
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity) return;
    setSaving(true);
    await onSubmit(Number(quantity));
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex items-end gap-3 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)]">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Quantity used *</span>
        <input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-32 rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none focus:border-danger/40" />
      </label>
      <button type="submit" disabled={saving || !quantity} className="rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
        {saving ? "Recording…" : "Record usage"}
      </button>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </form>);

}

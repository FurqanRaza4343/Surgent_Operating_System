import React, { useState } from "react";
import { XIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import { createTimeBlock, type DoctorTimeBlockResponse } from "../../../api/entities";

// A doctor's own private calendar note — "Out 2-4pm", "Lunch", a personal
// reminder. No booking-engine effect, no multi-room/OR conflict-check —
// deliberately simple (see DoctorAvailability for the Owner-managed
// booking-availability concept, a different thing entirely).
export function TimeBlockForm({
  defaultDay,
  onCreated,
  onCancel
}: {
  defaultDay: string; // "YYYY-MM-DD"
  onCreated: (block: DoctorTimeBlockResponse) => void;
  onCancel: () => void;
}) {
  const { authedFetch } = usePlan();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [startTime, setStartTime] = useState(`${defaultDay}T09:00`);
  const [endTime, setEndTime] = useState(`${defaultDay}T10:00`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authedFetch || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const block = await createTimeBlock(authedFetch, {
        title: title.trim(),
        note: note.trim() || null,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString()
      });
      onCreated(block);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create this block.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-sand-200 bg-sand-50/50 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Block time</p>
        <button type="button" onClick={onCancel} className="text-ink-muted hover:text-ink">
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        required
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Lunch, Out of office"
        className="w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Start</span>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">End</span>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40" />
        </label>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Note (optional)"
        className="w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-600/40" />

      {error && <p className="text-xs font-medium text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink">Cancel</button>
        <button type="submit" disabled={saving || !title.trim()} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? "Saving…" : "Add block"}
        </button>
      </div>
    </form>
  );
}

import React, { useEffect, useState } from "react";
import { CalendarIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, LogInIcon } from "lucide-react";
import { usePlan } from "../plan/PlanContext";
import { checkIn, listMyAttendance, type AttendanceRecordResponse } from "../../../api/entities";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Monthly attendance calendar. Only TODAY is clickable to check in; you can
// check in at most once per calendar day (enforced backend-side too, see
// backend/src/services/attendance/attendance_service.py), so once today's
// marked you can't mark it again until tomorrow. Past days are shown as
// already-recorded or left blank (locked), future days are not yet available.
export function AttendanceCalendar() {
  const { authedFetch } = usePlan();
  const [checkedInDates, setCheckedInDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function refresh() {
    if (!authedFetch) {
      setLoading(false);
      return;
    }
    try {
      const history = listMyAttendance(authedFetch);
      history.then((records: AttendanceRecordResponse[]) => {
        const dates = new Set(records.map((r) => {
          const dt = new Date(r.check_in_at);
          return toKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
        }));
        setCheckedInDates(dates);
      });
    } catch {
      setCheckedInDates(new Set());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedFetch]);

  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());
  const checkedInToday = checkedInDates.has(todayKey);

  function isPast(y: number, m: number, d: number) {
    return new Date(y, m, d).getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  function isToday(y: number, m: number, d: number) {
    return y === now.getFullYear() && m === now.getMonth() && d === now.getDate();
  }

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthCheckedCount = [...checkedInDates].filter((k) => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`)).length;

  async function handleCheckIn() {
    if (checkedInToday || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (authedFetch) {
        await checkIn(authedFetch);
        refresh();
      } else {
        const next = new Set(checkedInDates);
        next.add(todayKey);
        setCheckedInDates(next);
      }
    } catch {
      setError("Couldn't check in — try again.");
    } finally {
      setBusy(false);
    }
  }

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2 text-sm font-bold text-ink">
        <CalendarIcon className="h-4 w-4 text-accent-500" /> Attendance — tap today to check in
      </div>
      <p className="mt-0.5 text-xs text-ink-muted">
        {checkedInToday
          ? "Checked in for today. You&apos;ll be able to mark tomorrow once it arrives."
          : "Only today is clickable. Once you check in, today is locked until the next day."}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-sand-100">
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-ink">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-sand-100">
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {loading ?
      <p className="mt-6 text-sm text-ink-muted">Loading…</p> :
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((wd) => <span key={wd} className="text-center text-[11px] font-bold text-ink-soft">{wd}</span>)}
        {Array.from({ length: firstDow }).map((_, i) => <span key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const key = toKey(year, month, d);
          const marked = checkedInDates.has(key);
          const past = isPast(year, month, d);
          const today = isToday(year, month, d);
          return (
            <button
              key={key}
              type="button"
              disabled={!today || (past && !marked) || (today && marked) || busy}
              onClick={handleCheckIn}
              title={marked ? "Checked in" : today ? "Tap to check in" : past ? "Already past" : "Not yet available"}
              className={`flex aspect-square items-center justify-center rounded-lg text-sm font-bold tabular-nums transition-colors disabled:cursor-not-allowed ${
                marked ?
                "bg-teal-600 text-white disabled:opacity-70 ring-2 ring-teal-600/30" :
                today ?
                "bg-accent-500 text-white ring-2 ring-accent-500/30 hover:bg-accent-600 disabled:opacity-50" :
                past ?
                "bg-sand-100 text-ink-soft disabled:opacity-80" :
                "text-ink-soft disabled:opacity-60"
              }`}>
              <span className="flex items-center gap-0.5">
                {d}
                {marked && <CheckIcon className="h-3 w-3" />}
                {today && !marked && <LogInIcon className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>
      }

      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
      <p className="mt-2 text-xs text-ink-muted">{monthCheckedCount} check-in{monthCheckedCount === 1 ? "" : "s"} this month.</p>
    </div>);
}
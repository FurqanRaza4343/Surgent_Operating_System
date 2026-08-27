import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SearchIcon, UsersIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePatients } from "./usePatients";
import { DASHBOARD_ROUTES } from "../constants/routes";
import type { Patient } from "./types";
import { AGENTS_BY_SLUG } from "../../../data/agents";

const STATUS_CLASS: Record<Patient["status"], string> = {
  active: "bg-success/10 text-success",
  lead: "bg-warning/10 text-warning",
  inactive: "bg-ink-muted/10 text-ink-muted"
};

const STATUS_LABEL: Record<Patient["status"], string> = {
  active: "Active patient",
  lead: "Lead",
  inactive: "Inactive"
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PatientsPage() {
  const { patients, loading } = usePatients();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    );
  }, [patients, query]);

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <PageHeader title="Patients" subtitle="Every patient record, with their full session history and assigned agent." />
        <Link
          to={DASHBOARD_ROUTES.patientNew}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

          <PlusIcon className="h-4 w-4" /> Add patient
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-sand-200 bg-white px-3.5 py-2.5">
        <SearchIcon className="h-4 w-4 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patients by name or email…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />

      </div>

      <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        {loading ?
        <p className="px-5 py-8 text-center text-sm text-ink-muted">Loading…</p> :
        filtered.length === 0 ?
        <EmptyState icon={UsersIcon} title="No patients found" body="Try a different search term." /> :

        <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Assigned agent</th>
                <th className="px-5 py-3 font-semibold">Last visit</th>
                <th className="px-5 py-3 font-semibold">Next appointment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
              const agent = p.assignedAgentSlug ? AGENTS_BY_SLUG[p.assignedAgentSlug] : null;
              return (
                <tr key={p.id} className="border-b border-sand-200/70 last:border-0 hover:bg-sand-100">
                    <td className="px-5 py-3.5">
                      <Link to={DASHBOARD_ROUTES.patientDetail(p.id)} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-200 text-sm font-bold text-ink-soft">
                          {p.initial}
                        </span>
                        <span>
                          <span className="block font-semibold text-ink hover:text-teal-600">{p.name}</span>
                          <span className="block text-xs text-ink-muted">{p.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {agent ?
                    <Link
                      to={DASHBOARD_ROUTES.agentDetail(agent.categoryId, agent.slug)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:underline">

                          <SparklesIcon className="h-3 w-3" /> {agent.name}
                        </Link> :

                    <span className="text-xs text-ink-muted">Unassigned</span>
                    }
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-ink-soft">{formatDate(p.lastVisit)}</td>
                    <td className="px-5 py-3.5 tabular-nums text-ink-soft">{formatDate(p.nextAppointment)}</td>
                  </tr>);

            })}
            </tbody>
          </table>
        }
      </div>
    </>);

}

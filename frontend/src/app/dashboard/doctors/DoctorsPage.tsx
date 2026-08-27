import React from "react";
import { Link } from "react-router-dom";
import { LockIcon, PencilIcon, PlusIcon, StethoscopeIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { useDoctors } from "./useDoctors";
import { DASHBOARD_ROUTES } from "../constants/routes";
import { usePlan } from "../plan/PlanContext";
import { planFor } from "../plan/planCapabilities";

export function DoctorsPage() {
  const { doctors, loading } = useDoctors();
  const { capabilities } = usePlan();
  const atLimit = doctors.length >= capabilities.limits.maxDoctors;

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Doctors" subtitle="Every surgeon on your team — their specialty, capabilities, availability, and current caseload." />
        {atLimit ?
        <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-sand-100 px-4 py-2.5 text-sm font-semibold text-ink-muted">
              <LockIcon className="h-4 w-4" /> Add doctor
            </span>
            <Link to={DASHBOARD_ROUTES.settingsBilling} className="text-xs font-medium text-teal-600 hover:underline">
              {planFor(capabilities.tier).name} includes {capabilities.limits.maxDoctors} — upgrade to add more
            </Link>
          </div> :

        <Link
          to={DASHBOARD_ROUTES.doctorNew}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">

            <PlusIcon className="h-4 w-4" /> Add doctor
          </Link>
        }
      </div>

      {loading ?
      <p className="text-sm text-ink-muted">Loading…</p> :
      doctors.length === 0 ?
      <div className="rounded-3xl border border-sand-200 bg-white">
          <EmptyState icon={StethoscopeIcon} title="No doctors yet" body="Add your practice's surgeons to see them here." />
        </div> :

      <div className="grid gap-4 sm:grid-cols-2">
          {doctors.map((doc) =>
        <div
          key={doc.id}
          className="group relative rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(11,29,38,0.05)] transition-colors hover:border-teal-600/40">

              <Link
            to={DASHBOARD_ROUTES.doctorEdit(doc.id)}
            title="Edit doctor"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted opacity-0 transition-opacity hover:bg-sand-100 hover:text-teal-600 group-hover:opacity-100">

                <PencilIcon className="h-3.5 w-3.5" />
              </Link>

              <Link to={DASHBOARD_ROUTES.doctorDetail(doc.id)} className="block">
                <div className="flex items-center gap-4">
                  {doc.photoUrl ?
              <img src={doc.photoUrl} alt={doc.name} className="h-14 w-14 shrink-0 rounded-full object-cover" /> :

              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-600/8 text-lg font-bold text-teal-600">
                      {doc.initial}
                    </span>
              }
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{doc.name}</p>
                    <p className="truncate text-xs text-ink-muted">{doc.specialty}</p>
                  </div>
                </div>

                {doc.capabilities.length > 0 &&
            <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {doc.capabilities.slice(0, 3).map((c) =>
              <span key={c} className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                        {c}
                      </span>
              )}
                    {doc.capabilities.length > 3 &&
              <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
                        +{doc.capabilities.length - 3} more
                      </span>
              }
                  </div>
            }

                <div className="mt-4 flex gap-4 text-xs text-ink-muted">
                  <span><span className="font-mono font-semibold text-ink">{doc.activePatients}</span> active patients</span>
                  <span><span className="font-mono font-semibold text-ink">{doc.upcomingSurgeries}</span> upcoming surgeries</span>
                </div>
              </Link>
            </div>
        )}
        </div>
      }
    </>);

}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardListIcon, ArrowRightIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { listApplications, type DoctorApplicationResponse } from "../../../api/entities";
import { DASHBOARD_ROUTES } from "../constants/routes";

export function DoctorRequestsPage() {
  const { authedFetch } = usePlan();
  const [applications, setApplications] = useState<DoctorApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch) {
        setLoading(false);
        return;
      }
      try {
        const apps = await listApplications(authedFetch);
        if (!cancelled) setApplications(apps);
      } catch {
        if (!cancelled) setApplications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  const pending = applications.filter((a) => a.status === "pending");
  const decided = applications.filter((a) => a.status !== "pending");

  return (
    <>
      <PageHeader
        title="Doctor Requests"
        subtitle="Doctors who signed up themselves via your practice's signup link — review their details and decide what access to grant." />


      {loading ?
      <p className="text-sm text-ink-muted">Loading…</p> :
      applications.length === 0 ?
      <div className="rounded-3xl border border-sand-200 bg-white">
          <EmptyState
          icon={ClipboardListIcon}
          title="No requests yet"
          body="Share your doctor signup link (from the Doctors page) — applications will show up here for review." />

        </div> :

      <div className="space-y-6">
          {pending.length > 0 &&
        <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <div className="border-b border-sand-200 px-5 py-4">
                <p className="text-sm font-bold text-ink">Pending review ({pending.length})</p>
              </div>
              <div className="divide-y divide-sand-100">
                {pending.map((a) => <RequestRow key={a.id} application={a} />)}
              </div>
            </div>
        }

          {decided.length > 0 &&
        <div className="rounded-3xl border border-sand-200 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <div className="border-b border-sand-200 px-5 py-4">
                <p className="text-sm font-bold text-ink">Past decisions</p>
              </div>
              <div className="divide-y divide-sand-100">
                {decided.map((a) => <RequestRow key={a.id} application={a} />)}
              </div>
            </div>
        }
        </div>
      }
    </>);

}

function RequestRow({ application }: { application: DoctorApplicationResponse }) {
  const statusClass =
  application.status === "approved" ?
  "bg-success/10 text-success" :
  application.status === "rejected" ?
  "bg-danger/10 text-danger" :
  "bg-warning/10 text-warning";

  return (
    <Link to={DASHBOARD_ROUTES.doctorRequestDetail(application.id)} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sand-50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{application.name}</p>
        <p className="truncate text-xs text-ink-muted">{application.specialty || "No specialty listed"} · {application.email}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass}`}>{application.status}</span>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-muted" />
    </Link>);

}

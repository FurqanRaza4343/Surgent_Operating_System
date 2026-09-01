import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, MailIcon, PhoneIcon, CalendarIcon, ShieldCheckIcon, ShieldAlertIcon, SparklesIcon, ScissorsIcon } from "lucide-react";
import { usePatients } from "./usePatients";
import { MOCK_SESSIONS } from "../data/mockSessions";
import { SessionsView } from "../sessions/SessionsView";
import { ComingSoon } from "../components/ComingSoon";
import { DASHBOARD_ROUTES } from "../constants/routes";
import type { Patient } from "./types";
import { AGENTS_BY_SLUG } from "../../../data/agents";
import { usePlan } from "../plan/PlanContext";
import { ClinicalSection } from "../clinical/ClinicalSection";
import { PatientPhotosGallery } from "../clinical/PatientPhotosGallery";
import { ConsentDocumentsList } from "../clinical/ConsentDocumentsList";
import { InvoicesSection } from "../billing-invoices/InvoicesSection";
import { FunnelStageBadge } from "../leads/FunnelStageBadge";
import { PatientPortalLinkCard } from "./PatientPortalLinkCard";

const STATUS_CLASS: Record<Patient["status"], string> = {
  active: "bg-success/10 text-success",
  lead: "bg-warning/10 text-warning",
  inactive: "bg-ink-muted/10 text-ink-muted"
};

function formatDate(iso: string | null) {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authedFetch } = usePlan();
  const { getPatient, loading } = usePatients(authedFetch);
  const fetchedPatient = id ? getPatient(id) : undefined;
  // Local override for the funnel stage — usePatients()'s cache is
  // IndexedDB-backed and doesn't reflect a stage PATCH until the page's
  // next full reload, so FunnelStageBadge's onUpdated patches this instead
  // of waiting on that refetch.
  const [stageOverride, setStageOverride] = useState<{ stage: Patient["lifecycleStage"]; lostReason: string | null } | null>(null);
  const patient = fetchedPatient && stageOverride ? { ...fetchedPatient, lifecycleStage: stageOverride.stage, lostReason: stageOverride.lostReason } : fetchedPatient;

  if (loading) return null;

  if (!patient) {
    return <ComingSoon icon={ShieldAlertIcon} title="Patient not found" body="This patient record doesn't exist." phase="—" />;
  }

  const sessions = MOCK_SESSIONS.filter((s) => s.patientId === patient.id);
  const agent = patient.assignedAgentSlug ? AGENTS_BY_SLUG[patient.assignedAgentSlug] : null;

  return (
    <>
      <Link
        to={DASHBOARD_ROUTES.patients}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">

        <ArrowLeftIcon className="h-4 w-4" /> Back to patients
      </Link>

      <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sand-200 text-lg font-bold text-ink-soft">
              {patient.initial}
            </span>
            <div>
              <p className="text-lg font-bold text-ink">{patient.name}</p>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[patient.status]}`}>
                {patient.status === "active" ? "Active patient" : patient.status === "lead" ? "Lead" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FunnelStageBadge
              patientId={patient.id}
              stage={patient.lifecycleStage}
              lostReason={patient.lostReason}
              onUpdated={(stage, lostReason) => setStageOverride({ stage, lostReason })} />

            {patient.consentOnFile ?
            <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                <ShieldCheckIcon className="h-3.5 w-3.5" /> Consent on file
              </span> :

            <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
                <ShieldAlertIcon className="h-3.5 w-3.5" /> Consent pending
              </span>
            }
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-sand-100 px-4 py-3">
            <MailIcon className="h-4 w-4 text-ink-muted" />
            <span className="truncate text-sm text-ink-soft">{patient.email || "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-sand-100 px-4 py-3">
            <PhoneIcon className="h-4 w-4 text-ink-muted" />
            <span className="text-sm text-ink-soft">{patient.phone || "—"}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-sand-100 px-4 py-3">
            <CalendarIcon className="h-4 w-4 text-ink-muted" />
            <span className="text-sm text-ink-soft">Last visit: {formatDate(patient.lastVisit)}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-teal-600/8 px-4 py-3">
            <CalendarIcon className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-600">Next: {formatDate(patient.nextAppointment)}</span>
          </div>
        </div>

        {patient.procedures.length > 0 &&
        <div className="mt-4 flex flex-wrap gap-2">
            {patient.procedures.map((proc) =>
          <span key={proc} className="rounded-full border border-sand-200 px-3 py-1 text-xs font-medium text-ink-soft">
                {proc}
              </span>
          )}
          </div>
        }
      </div>

      <PatientPortalLinkCard patientId={patient.id} />

      {patient.chiefComplaint &&
      <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">What they need</p>
            {patient.needsSurgery &&
          <span className="flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                <ScissorsIcon className="h-3 w-3" /> Surgery indicated
              </span>
          }
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{patient.chiefComplaint}</p>

          {agent &&
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-teal-600/20 bg-teal-600/[0.04] px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600/10 text-teal-600">
                <SparklesIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  Assigned to{" "}
                  <Link to={DASHBOARD_ROUTES.agentDetail(agent.categoryId, agent.slug)} className="text-teal-600 hover:underline">
                    {agent.name}
                  </Link>
                </p>
                {patient.assignmentReasoning && <p className="mt-0.5 text-xs text-ink-muted">{patient.assignmentReasoning}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${patient.agentStatus === "active" ? "bg-success/10 text-success" : "bg-ink-muted/10 text-ink-muted"}`}>
                {patient.agentStatus === "active" ? "Active" : "Inactive"}
              </span>
            </div>
        }
        </div>
      }

      <ClinicalSection patientId={patient.id} />
      <PatientPhotosGallery patientId={patient.id} />
      <ConsentDocumentsList patientId={patient.id} />
      <InvoicesSection patientId={patient.id} />

      <p className="mb-3 text-sm font-bold text-ink">Session history</p>
      <SessionsView sessions={sessions} />
    </>);

}

import React, { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePlan } from "../plan/PlanContext";
import { usePatients } from "../patients/usePatients";
import { useConsultationNotes } from "./useConsultationNotes";
import { DASHBOARD_ROUTES } from "../constants/routes";

// SOAP — Subjective/Objective/Assessment/Plan — the near-universal clinical
// documentation structure real EHR/EMR systems use, rather than one
// free-text box.
export function ConsultationNoteFormPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const navigate = useNavigate();
  const { authedFetch } = usePlan();
  const { getPatient, loading: patientLoading } = usePatients(authedFetch);
  const { create } = useConsultationNotes(authedFetch, patientId);

  const patient = patientId ? getPatient(patientId) : undefined;

  const [chiefComplaint, setChiefComplaint] = useState(patient?.chiefComplaint || "");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [saving, setSaving] = useState<"draft" | "final" | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (patient?.chiefComplaint) setChiefComplaint((prev) => prev || patient.chiefComplaint);
  }, [patient?.chiefComplaint]);

  async function handleSave(status: "draft" | "final") {
    if (!patientId) return;
    setSaving(status);
    setError(null);
    try {
      const note = await create({
        patient_id: patientId,
        appointment_id: appointmentId || undefined,
        chief_complaint: chiefComplaint || null,
        subjective: subjective || null,
        objective: objective || null,
        assessment: assessment || null,
        plan: plan || null,
        status
      });
      if (!note) throw new Error("no note");
      navigate(DASHBOARD_ROUTES.patientDetail(patientId));
    } catch {
      setError("Couldn't save this note — try again.");
      setSaving(null);
    }
  }

  if (patientLoading) return null;

  return (
    <>
      <Link
        to={patientId ? DASHBOARD_ROUTES.patientDetail(patientId) : DASHBOARD_ROUTES.patients}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">

        <ArrowLeftIcon className="h-4 w-4" /> Back to patient
      </Link>

      <PageHeader
        title={patient ? `Consultation note — ${patient.name}` : "Consultation note"}
        subtitle="Structured SOAP note: what the patient reports, what you observe, your assessment, and the plan." />


      <div className="mt-6 max-w-2xl space-y-4">
        <Field label="Chief complaint" value={chiefComplaint} onChange={setChiefComplaint} rows={2} placeholder="What brings the patient in today" />
        <Field label="Subjective" value={subjective} onChange={setSubjective} rows={4} placeholder="What the patient reports — symptoms, history, concerns, in their own words." />
        <Field label="Objective" value={objective} onChange={setObjective} rows={4} placeholder="What you observe — exam findings, measurements, photos taken." />
        <Field label="Assessment" value={assessment} onChange={setAssessment} rows={3} placeholder="Your clinical impression / diagnosis." />
        <Field label="Plan" value={plan} onChange={setPlan} rows={3} placeholder="Next steps — treatment plan, follow-up, referrals." />

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={saving !== null}
            className="rounded-xl border border-sand-200 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-teal-600/40 hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-40">

            {saving === "draft" ? "Saving…" : "Save as draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSave("final")}
            disabled={saving !== null}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40">

            {saving === "final" ? "Finalizing…" : "Finalize note"}
          </button>
        </div>
        <p className="text-xs text-ink-muted">Finalized notes can&apos;t be edited — a later change creates a new note instead.</p>
      </div>
    </>);

}

function Field({
  label,
  value,
  onChange,
  rows,
  placeholder



}: {label: string;value: string;onChange: (v: string) => void;rows: number;placeholder: string;}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-sand-200 bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-teal-600/40 focus:bg-white" />

    </label>);

}

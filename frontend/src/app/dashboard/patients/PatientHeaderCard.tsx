import React from "react";
import { MailIcon, PhoneIcon, CalendarIcon, StethoscopeIcon, ArchiveIcon } from "lucide-react";
import type { Patient } from "./types";

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
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

// Shared identity header across all three role-specific patient detail
// pages — name/ID/status/doctor/contact/next appointment stay the same
// everywhere; only the action buttons passed as children differ per role.
export function PatientHeaderCard({ patient, children }: { patient: Patient; children?: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-3xl border border-sand-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sand-200 text-lg font-bold text-ink-soft">
            {patient.initial}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-ink">{patient.name}</p>
              {patient.isArchived &&
              <span className="flex items-center gap-1 rounded-full bg-ink-muted/10 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                  <ArchiveIcon className="h-3 w-3" /> Archived
                </span>
              }
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {patient.portalId && <span className="text-xs text-ink-muted">{patient.portalId}</span>}
              <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[patient.status]}`}>
                {STATUS_LABEL[patient.status]}
              </span>
            </div>
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
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
          <StethoscopeIcon className="h-4 w-4 text-ink-muted" />
          <span className="text-sm text-ink-soft">{patient.assignedDoctorName || "No doctor assigned"}</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-teal-600/8 px-4 py-3">
          <CalendarIcon className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-medium text-teal-600">Next: {formatDate(patient.nextAppointment)}</span>
        </div>
      </div>
    </div>
  );
}

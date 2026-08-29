import { useCallback, useEffect, useRef, useState } from "react";
import { MOCK_PATIENTS } from "../data/mockPatients";
import type { Patient } from "./types";
import { loadPatientsDB, savePatientsDB } from "./patientsDB";
import { createPatient, listPatients, type PatientResponse } from "../../../api/entities";
import { AGENTS_BY_SLUG } from "../../../data/agents";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

// A patient saved before chiefComplaint/needsSurgery/assignedAgentSlug/etc.
// existed on the type is missing those fields — every page reads them
// directly, so backfill defaults instead of trusting whatever shape is
// already sitting in storage (same class of bug useDoctors.ts's normalize()
// fixed for doctors).
function normalize(patient: Patient): Patient {
  return {
    ...patient,
    procedures: patient.procedures ?? [],
    chiefComplaint: patient.chiefComplaint ?? "",
    needsSurgery: patient.needsSurgery ?? false,
    assignedAgentSlug: patient.assignedAgentSlug ?? null,
    assignedCategoryId: patient.assignedCategoryId ?? null,
    assignmentReasoning: patient.assignmentReasoning ?? null,
    agentStatus: patient.agentStatus ?? "inactive"
  };
}

// Backend Patient rows don't carry a lifecycle "status", lastVisit,
// nextAppointment, procedures, or assignmentReasoning yet (see
// backend/src/models/patient.py) — a patient synced FROM the API defaults
// those to the same values PatientFormPage already used locally on create,
// rather than fabricating fake-looking data.
function fromApi(p: PatientResponse): Patient {
  const name = `${p.first_name} ${p.last_name}`.trim();
  const agent = p.ai_agent_assigned ? AGENTS_BY_SLUG[p.ai_agent_assigned] : undefined;
  return {
    id: p.id,
    name,
    initial: name[0]?.toUpperCase() || "?",
    email: p.email ?? "",
    phone: p.phone ?? "",
    status: "lead",
    lastVisit: null,
    nextAppointment: null,
    procedures: [],
    consentOnFile: p.consent_status,
    chiefComplaint: p.chief_complaint ?? "",
    needsSurgery: p.needs_surgery,
    assignedAgentSlug: p.ai_agent_assigned,
    assignedCategoryId: agent?.categoryId ?? null,
    assignmentReasoning: null,
    agentStatus: p.agent_status === "active" ? "active" : "inactive"
  };
}

function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Storage operation timed out")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

// Real backend (GET/POST /api/v1/patients, see backend/src/router/patients/)
// is source #1 when signed in — falls back to the IndexedDB cache on failure
// or when signed out, same source-chain idea as plan/plan.ts's usePlanTier. A
// successful API write is also mirrored into IndexedDB so the rest of the
// app's synchronous reads (patient detail links from sessions, etc.) keep
// working unchanged even offline. `authedFetch` comes from usePlan()
// (app/dashboard/plan/PlanContext.tsx already computes it via the Clerk-gated
// split) — pass null to stay IndexedDB-only, e.g. when Clerk is disabled.
export function usePatients(authedFetch: AuthedFetch = null) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const patientsRef = useRef<Patient[]>([]);
  patientsRef.current = patients;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data: Patient[] | undefined;

      if (authedFetch) {
        try {
          const remote = await listPatients(authedFetch);
          data = remote.map(fromApi);
          await withTimeout(savePatientsDB(data)).catch(() => {});
        } catch {
          data = undefined;
        }
      }

      if (!data) {
        try {
          data = await withTimeout(loadPatientsDB());
          if (!data) {
            data = MOCK_PATIENTS.map(normalize);
            await withTimeout(savePatientsDB(data));
          } else {
            data = data.map(normalize);
          }
        } catch {
          data = MOCK_PATIENTS;
        }
      }

      if (!cancelled) {
        patientsRef.current = data;
        setPatients(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  const getPatient = useCallback((id: string) => patients.find((p) => p.id === id), [patients]);

  const addPatient = useCallback(
    async (patient: Patient): Promise<boolean> => {
      let toSave = patient;

      if (authedFetch) {
        try {
          const [firstName, ...rest] = patient.name.trim().split(" ");
          const created = await createPatient(authedFetch, {
            first_name: firstName || patient.name,
            last_name: rest.join(" "),
            email: patient.email || null,
            phone: patient.phone || null,
            chief_complaint: patient.chiefComplaint || null,
            needs_surgery: patient.needsSurgery,
            ai_agent_assigned: patient.assignedAgentSlug
          });
          // Keep the locally-known reasoning/categoryId (classifyPatient()'s
          // output) — the backend doesn't store those — but use its real id
          // so future GET /patients calls match this same record.
          toSave = { ...patient, id: created.id };
        } catch {
          // API unavailable — fall through to the local-only save below,
          // same graceful-degradation behavior this hook always had.
        }
      }

      const next = [...patientsRef.current, toSave];
      try {
        await withTimeout(savePatientsDB(next));
        patientsRef.current = next;
        setPatients(next);
        return true;
      } catch {
        return false;
      }
    },
    [authedFetch]
  );

  const updatePatient = useCallback(async (id: string, patch: Partial<Patient>): Promise<boolean> => {
    const next = patientsRef.current.map((p) => (p.id === id ? { ...p, ...patch } : p));
    try {
      await withTimeout(savePatientsDB(next));
      patientsRef.current = next;
      setPatients(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { patients, loading, getPatient, addPatient, updatePatient };
}

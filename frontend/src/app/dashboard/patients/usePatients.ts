import { useCallback, useEffect, useRef, useState } from "react";
import { MOCK_PATIENTS } from "../data/mockPatients";
import type { Patient } from "./types";
import { loadPatientsDB, savePatientsDB } from "./patientsDB";

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

// Same IndexedDB-backed, shaped-like-the-real-model pattern as
// doctors/useDoctors.ts — see that file's comments for the full rationale
// (localStorage's quota was too small once real attachments existed; that
// doesn't apply to patients today, but sharing one storage layer avoids
// reintroducing the same class of bug later).
export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const patientsRef = useRef<Patient[]>([]);
  patientsRef.current = patients;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data: Patient[] | undefined;
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
      if (!cancelled) {
        patientsRef.current = data;
        setPatients(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getPatient = useCallback((id: string) => patients.find((p) => p.id === id), [patients]);

  const addPatient = useCallback(async (patient: Patient): Promise<boolean> => {
    const next = [...patientsRef.current, patient];
    try {
      await withTimeout(savePatientsDB(next));
      patientsRef.current = next;
      setPatients(next);
      return true;
    } catch {
      return false;
    }
  }, []);

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

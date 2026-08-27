import { useCallback, useEffect, useRef, useState } from "react";
import { MOCK_DOCTORS } from "../data/mockDoctors";
import type { Doctor } from "./types";
import { loadDoctorsDB, saveDoctorsDB } from "./doctorsDB";

// Doctors used to live in localStorage, which caps out around 5-10MB per
// origin — too small once real photos/documents are attached (they're
// base64 data URIs, ~33% bigger than the file itself; a couple of real PDFs
// filled it and made saves silently fail). IndexedDB's quota is a large
// fraction of free disk space, so records now live there instead.
const LEGACY_STORAGE_KEY = "aesthetixai_dashboard_doctors";

function readLegacyLocalStorage(): Doctor[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// A doctor saved before `capabilities`/`availability`/`documents` existed on
// the type (localStorage era or otherwise) is missing those fields entirely
// — every page calls .length/.map/.filter on them directly, so a stale
// record crashes the whole app on load. Backfill defaults instead of
// trusting whatever shape is already sitting in storage.
function normalize(doctor: Doctor): Doctor {
  return {
    ...doctor,
    capabilities: doctor.capabilities ?? [],
    availability: doctor.availability ?? [],
    documents: doctor.documents ?? []
  };
}

// A stuck IndexedDB request (blocked by another tab, a wedged connection)
// otherwise hangs its Promise forever — which left `loading` true forever
// and the whole page blank with no way out. Cap every DB call so the UI can
// always fall back instead.
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

// Same shaped-like-the-real-model pattern as settings/useAgentSettings.ts
// and profile/usePracticeProfile.ts — a real "create/update doctor" API is a
// storage-layer swap away, not a UI rewrite.
export function useDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const doctorsRef = useRef<Doctor[]>([]);
  doctorsRef.current = doctors;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data: Doctor[] | undefined;
      try {
        data = await withTimeout(loadDoctorsDB());
        if (!data) {
          data = (readLegacyLocalStorage() || MOCK_DOCTORS).map(normalize);
          await withTimeout(saveDoctorsDB(data));
        } else {
          data = data.map(normalize);
        }
      } catch {
        // IndexedDB unavailable (private browsing, storage disabled) — fall
        // back to in-memory only, same degradation as the old localStorage path.
        data = MOCK_DOCTORS;
      }
      if (!cancelled) {
        doctorsRef.current = data;
        setDoctors(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getDoctor = useCallback((id: string) => doctors.find((d) => d.id === id), [doctors]);

  const addDoctor = useCallback(async (doctor: Doctor): Promise<boolean> => {
    const next = [...doctorsRef.current, doctor];
    try {
      await withTimeout(saveDoctorsDB(next));
      doctorsRef.current = next;
      setDoctors(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  const updateDoctor = useCallback(async (id: string, patch: Partial<Doctor>): Promise<boolean> => {
    const next = doctorsRef.current.map((d) => (d.id === id ? { ...d, ...patch } : d));
    try {
      await withTimeout(saveDoctorsDB(next));
      doctorsRef.current = next;
      setDoctors(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { doctors, loading, getDoctor, addDoctor, updateDoctor };
}

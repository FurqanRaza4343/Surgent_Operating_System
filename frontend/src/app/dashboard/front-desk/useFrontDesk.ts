import { useCallback, useEffect, useState } from "react";
import { listPracticeAppointments, checkInAppointment, type AppointmentResponse } from "../../../api/entities";
import { usePatients } from "../patients/usePatients";
import { useDoctors } from "../doctors/useDoctors";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

export interface FrontDeskAppointment extends AppointmentResponse {
  patientName: string;
  patientInitial: string;
  doctorName: string | null;
}

// Practice-wide (scope=practice, see Phase 3's appointments_services.py) —
// Front Desk/Waiting Room/Book Appointment all read the SAME list rather
// than each fetching their own, so a check-in performed in one place is
// immediately reflected in the other without a second round-trip.
export function useFrontDesk(authedFetch: AuthedFetch) {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { patients } = usePatients(authedFetch);
  const { doctors } = useDoctors(authedFetch);

  const fetchAppointments = useCallback(async () => {
    if (!authedFetch) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listPracticeAppointments(authedFetch);
      setAppointments(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const checkIn = useCallback(
    async (id: string) => {
      if (!authedFetch) return;
      const updated = await checkInAppointment(authedFetch, id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    },
    [authedFetch]
  );

  const enriched: FrontDeskAppointment[] = appointments.map((a) => {
    const patient = patients.find((p) => p.id === a.patient_id);
    const doctor = doctors.find((d) => d.id === a.doctor_id);
    // Patient name comes server-side on the appointment now (patient_name join,
    // see appointments_services.py); the client-side patient map is just a
    // fallback for hosts running an older backend.
    const patientName = a.patient_name || patient?.name || "Unknown patient";
    return {
      ...a,
      patientName,
      patientInitial: patientName.trim()[0]?.toUpperCase() || "?",
      doctorName: doctor?.name || null
    };
  });

  return { appointments: enriched, loading, error, refetch: fetchAppointments, checkIn };
}

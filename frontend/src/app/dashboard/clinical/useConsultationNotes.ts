import { useCallback, useEffect, useState } from "react";
import {
  listConsultationNotes,
  createConsultationNote,
  updateConsultationNote,
  aiDraftConsultationNote,
  type ConsultationNoteResponse,
  type CreateConsultationNoteRequest,
  type UpdateConsultationNoteRequest,
  type AIConsultationDraftResponse
} from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

export function useConsultationNotes(authedFetch: AuthedFetch, patientId: string | undefined) {
  const [notes, setNotes] = useState<ConsultationNoteResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch || !patientId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listConsultationNotes(authedFetch, patientId);
      setNotes(data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, patientId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (data: CreateConsultationNoteRequest) => {
      if (!authedFetch) return null;
      const note = await createConsultationNote(authedFetch, data);
      setNotes((prev) => [note, ...prev]);
      return note;
    },
    [authedFetch]
  );

  const update = useCallback(
    async (id: string, data: UpdateConsultationNoteRequest) => {
      if (!authedFetch) return null;
      const note = await updateConsultationNote(authedFetch, id, data);
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
      return note;
    },
    [authedFetch]
  );

  const aiDraft = useCallback(
    async (patientId: string, rawNotes: string): Promise<AIConsultationDraftResponse | null> => {
      if (!authedFetch) return null;
      return aiDraftConsultationNote(authedFetch, { patient_id: patientId, raw_notes: rawNotes });
    },
    [authedFetch]
  );

  return { notes, loading, refetch, create, update, aiDraft };
}

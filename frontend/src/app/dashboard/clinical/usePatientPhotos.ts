import { useCallback, useEffect, useState } from "react";
import {
  listPatientPhotos,
  uploadPatientPhoto,
  deletePatientPhoto,
  type PatientPhotoResponse
} from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

export function usePatientPhotos(authedFetch: AuthedFetch, patientId: string | undefined) {
  const [photos, setPhotos] = useState<PatientPhotoResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch || !patientId) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listPatientPhotos(authedFetch, patientId);
      setPhotos(data);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, patientId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const upload = useCallback(
    async (file: File, photoType?: string, notes?: string) => {
      if (!authedFetch || !patientId) return false;
      try {
        const photo = await uploadPatientPhoto(authedFetch, patientId, file, photoType, notes);
        setPhotos((prev) => [photo, ...prev]);
        return true;
      } catch {
        return false;
      }
    },
    [authedFetch, patientId]
  );

  const remove = useCallback(
    async (photoId: string) => {
      if (!authedFetch) return false;
      try {
        await deletePatientPhoto(authedFetch, photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        return true;
      } catch {
        return false;
      }
    },
    [authedFetch]
  );

  return { photos, loading, refetch, upload, remove };
}

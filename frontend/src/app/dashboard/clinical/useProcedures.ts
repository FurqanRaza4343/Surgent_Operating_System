import { useCallback, useEffect, useState } from "react";
import {
  listProcedures,
  createProcedure,
  updateProcedure,
  type ProcedureResponse,
  type CreateProcedureRequest,
  type UpdateProcedureRequest
} from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

export function useProcedures(authedFetch: AuthedFetch) {
  const [procedures, setProcedures] = useState<ProcedureResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch) {
      setProcedures([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listProcedures(authedFetch);
      setProcedures(data);
    } catch {
      setProcedures([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (data: CreateProcedureRequest) => {
      if (!authedFetch) return false;
      try {
        const procedure = await createProcedure(authedFetch, data);
        setProcedures((prev) => [...prev, procedure].sort((a, b) => a.name.localeCompare(b.name)));
        return true;
      } catch {
        return false;
      }
    },
    [authedFetch]
  );

  const update = useCallback(
    async (id: string, data: UpdateProcedureRequest) => {
      if (!authedFetch) return false;
      try {
        const procedure = await updateProcedure(authedFetch, id, data);
        setProcedures((prev) => prev.map((p) => (p.id === id ? procedure : p)));
        return true;
      } catch {
        return false;
      }
    },
    [authedFetch]
  );

  return { procedures, loading, refetch, create, update };
}

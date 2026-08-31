import { useCallback, useEffect, useState } from "react";
import {
  listTreatmentPlans,
  createTreatmentPlan,
  updateTreatmentPlan,
  updateTreatmentPlanItem,
  type TreatmentPlanResponse,
  type CreateTreatmentPlanRequest,
  type UpdateTreatmentPlanRequest,
  type UpdateTreatmentPlanItemRequest
} from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

export function useTreatmentPlans(authedFetch: AuthedFetch, patientId: string | undefined) {
  const [plans, setPlans] = useState<TreatmentPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch || !patientId) {
      setPlans([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listTreatmentPlans(authedFetch, patientId);
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, patientId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (data: CreateTreatmentPlanRequest) => {
      if (!authedFetch) return null;
      const plan = await createTreatmentPlan(authedFetch, data);
      setPlans((prev) => [plan, ...prev]);
      return plan;
    },
    [authedFetch]
  );

  const update = useCallback(
    async (id: string, data: UpdateTreatmentPlanRequest) => {
      if (!authedFetch) return null;
      const plan = await updateTreatmentPlan(authedFetch, id, data);
      setPlans((prev) => prev.map((p) => (p.id === id ? plan : p)));
      return plan;
    },
    [authedFetch]
  );

  const updateItem = useCallback(
    async (planId: string, itemId: string, data: UpdateTreatmentPlanItemRequest) => {
      if (!authedFetch) return null;
      const item = await updateTreatmentPlanItem(authedFetch, itemId, data);
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, items: p.items.map((i) => (i.id === itemId ? item : i)) } : p))
      );
      return item;
    },
    [authedFetch]
  );

  return { plans, loading, refetch, create, update, updateItem };
}

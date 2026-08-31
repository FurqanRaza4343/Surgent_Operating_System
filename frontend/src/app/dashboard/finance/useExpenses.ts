import { useCallback, useEffect, useState } from "react";
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseResponse,
  type CreateExpenseRequest,
  type UpdateExpenseRequest
} from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

export function useExpenses(authedFetch: AuthedFetch) {
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listExpenses(authedFetch);
      setExpenses(data);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (data: CreateExpenseRequest) => {
      if (!authedFetch) return null;
      const expense = await createExpense(authedFetch, data);
      setExpenses((prev) => [expense, ...prev]);
      return expense;
    },
    [authedFetch]
  );

  const update = useCallback(
    async (id: string, data: UpdateExpenseRequest) => {
      if (!authedFetch) return null;
      const expense = await updateExpense(authedFetch, id, data);
      setExpenses((prev) => prev.map((e) => (e.id === id ? expense : e)));
      return expense;
    },
    [authedFetch]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!authedFetch) return;
      await deleteExpense(authedFetch, id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    },
    [authedFetch]
  );

  return { expenses, loading, refetch, create, update, remove };
}

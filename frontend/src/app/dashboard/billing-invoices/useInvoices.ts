import { useCallback, useEffect, useState } from "react";
import {
  listInvoicesForPatient,
  listInvoicesForPractice,
  createInvoice,
  updateInvoice,
  type InvoiceResponse,
  type CreateInvoiceRequest,
  type UpdateInvoiceRequest
} from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

// Practice-wide invoice list (InvoicesPage) — pass no patientId. Scoped to
// one patient's invoices (PatientDetailPage's InvoicesSection) — pass one.
export function useInvoices(authedFetch: AuthedFetch, patientId?: string) {
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = patientId ? await listInvoicesForPatient(authedFetch, patientId) : await listInvoicesForPractice(authedFetch);
      setInvoices(data);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, patientId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (data: CreateInvoiceRequest) => {
      if (!authedFetch) return null;
      const invoice = await createInvoice(authedFetch, data);
      setInvoices((prev) => [invoice, ...prev]);
      return invoice;
    },
    [authedFetch]
  );

  const update = useCallback(
    async (id: string, data: UpdateInvoiceRequest) => {
      if (!authedFetch) return null;
      const invoice = await updateInvoice(authedFetch, id, data);
      setInvoices((prev) => prev.map((i) => (i.id === id ? invoice : i)));
      return invoice;
    },
    [authedFetch]
  );

  return { invoices, loading, refetch, create, update };
}

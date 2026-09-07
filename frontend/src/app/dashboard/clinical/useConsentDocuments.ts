import { useCallback, useEffect, useState } from "react";
import {
  listConsentDocuments,
  createConsentDocument,
  signConsentDocument,
  voidConsentDocument,
  markConsentDiscussed,
  type ConsentDocumentResponse,
  type CreateConsentDocumentRequest
} from "../../../api/entities";

type AuthedFetch = (<T>(path: string, init?: RequestInit) => Promise<T>) | null;

export function useConsentDocuments(authedFetch: AuthedFetch, patientId: string | undefined) {
  const [documents, setDocuments] = useState<ConsentDocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!authedFetch || !patientId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await listConsentDocuments(authedFetch, patientId);
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, patientId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (data: CreateConsentDocumentRequest) => {
      if (!authedFetch || !patientId) return null;
      const doc = await createConsentDocument(authedFetch, patientId, data);
      setDocuments((prev) => [doc, ...prev]);
      return doc;
    },
    [authedFetch, patientId]
  );

  const sign = useCallback(
    async (id: string, signedByName: string) => {
      if (!authedFetch) return null;
      const doc = await signConsentDocument(authedFetch, id, signedByName);
      setDocuments((prev) => prev.map((d) => (d.id === id ? doc : d)));
      return doc;
    },
    [authedFetch]
  );

  const voidDoc = useCallback(
    async (id: string) => {
      if (!authedFetch) return null;
      const doc = await voidConsentDocument(authedFetch, id);
      setDocuments((prev) => prev.map((d) => (d.id === id ? doc : d)));
      return doc;
    },
    [authedFetch]
  );

  const markDiscussed = useCallback(
    async (id: string) => {
      if (!authedFetch) return null;
      const doc = await markConsentDiscussed(authedFetch, id);
      setDocuments((prev) => prev.map((d) => (d.id === id ? doc : d)));
      return doc;
    },
    [authedFetch]
  );

  return { documents, loading, refetch, create, sign, voidDoc, markDiscussed };
}

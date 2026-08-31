import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DollarSignIcon, TrendingDownIcon, ScaleIcon, WalletIcon } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { KpiCard } from "../components/KpiCard";
import { EmptyState } from "../components/EmptyState";
import { usePlan } from "../plan/PlanContext";
import { getFinanceOverview, type FinanceOverviewResponse } from "../../../api/entities";
import { DASHBOARD_ROUTES } from "../constants/routes";

export function FinanceOverviewPage() {
  const { authedFetch } = usePlan();
  const [overview, setOverview] = useState<FinanceOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authedFetch) {
        setLoading(false);
        return;
      }
      try {
        const data = await getFinanceOverview(authedFetch);
        if (!cancelled) setOverview(data);
      } catch {
        if (!cancelled) setOverview(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authedFetch]);

  if (loading) return null;

  const hasData = overview && (overview.invoice_count > 0 || overview.expense_count > 0);

  return (
    <>
      <PageHeader title="Finance overview" subtitle="Real revenue vs. real expenses — no projections. Revenue counts only invoices marked Paid." />

      {!hasData || !overview ?
      <div className="rounded-3xl border border-sand-200 bg-white">
          <EmptyState
          icon={WalletIcon}
          title="Not enough data yet"
          body="Mark some invoices paid and log a few expenses, and this page will show a real picture of your practice's finances." />

        </div> :

      <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard icon={DollarSignIcon} label="Revenue (paid invoices)" value={`$${overview.total_revenue.toLocaleString()}`} color="#16A34A" />
            <KpiCard icon={TrendingDownIcon} label="Expenses" value={`$${overview.total_expenses.toLocaleString()}`} color="#DC2626" />
            <KpiCard icon={ScaleIcon} label="Net" value={`${overview.net < 0 ? "-" : ""}$${Math.abs(overview.net).toLocaleString()}`} color={overview.net >= 0 ? "#16A34A" : "#DC2626"} />
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            Based on {overview.invoice_count} paid invoice{overview.invoice_count === 1 ? "" : "s"} and {overview.expense_count} recorded expense{overview.expense_count === 1 ? "" : "s"}.{" "}
            <Link to={DASHBOARD_ROUTES.expenses} className="font-semibold text-teal-600 hover:underline">Manage expenses</Link>
            {" · "}
            <Link to={DASHBOARD_ROUTES.invoices} className="font-semibold text-teal-600 hover:underline">View invoices</Link>
          </p>
        </>
      }
    </>);

}

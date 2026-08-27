import React from "react";
import { Routes, Route } from "react-router-dom";
import { ScrollToTop } from "./components/layout";
import { HomePage } from "./pages/HomePage";
import { AgentsPage } from "./pages/AgentsPage";
import { AgentDetailPage } from "./pages/AgentDetailPage";
import { ChannelsPage } from "./pages/ChannelsPage";
import { DemoPage } from "./pages/DemoPage";
import { DashboardRouter } from "./app/dashboard/DashboardRouter";
import { DemoPaymentPage } from "./app/onboarding/DemoPaymentPage";
import { CheckoutSuccessPage } from "./app/onboarding/CheckoutSuccessPage";
import { CheckoutCancelPage } from "./app/onboarding/CheckoutCancelPage";
import { ClaimPlanPage } from "./app/onboarding/ClaimPlanPage";
import { SetupWizardPage } from "./app/onboarding/SetupWizardPage";

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:slug" element={<AgentDetailPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/pricing/pay" element={<DemoPaymentPage />} />
        <Route path="/pricing/success" element={<CheckoutSuccessPage />} />
        <Route path="/pricing/cancel" element={<CheckoutCancelPage />} />
        <Route path="/onboarding/claim" element={<ClaimPlanPage />} />
        <Route path="/onboarding/setup" element={<SetupWizardPage />} />
        <Route path="/dashboard/*" element={<DashboardRouter />} />
      </Routes>
    </>);

}

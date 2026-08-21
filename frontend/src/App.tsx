import React from "react";
import { Routes, Route } from "react-router-dom";
import { ScrollToTop } from "./components/layout";
import { HomePage } from "./pages/HomePage";
import { AgentsPage } from "./pages/AgentsPage";
import { AgentDetailPage } from "./pages/AgentDetailPage";
import { ChannelsPage } from "./pages/ChannelsPage";

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:slug" element={<AgentDetailPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
      </Routes>
    </>);

}

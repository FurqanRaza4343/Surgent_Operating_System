
import React from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { TrustBar } from "./components/TrustBar";
import { HowItWorks } from "./components/HowItWorks";
import { AgentSuite } from "./components/AgentSuite";
import { Omnichannel } from "./components/Omnichannel";
import { FeatureShowcase } from "./components/FeatureShowcase";
import { DashboardPreview } from "./components/DashboardPreview";
import { Security } from "./components/Security";
import { Testimonials } from "./components/Testimonials";
import { Pricing } from "./components/Pricing";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";

export function App() {
  return (
    <div className="min-h-screen w-full bg-canvas font-sans text-ink">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <AgentSuite />
        <Omnichannel />
        <FeatureShowcase />
        <DashboardPreview />
        <Security />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>);

}
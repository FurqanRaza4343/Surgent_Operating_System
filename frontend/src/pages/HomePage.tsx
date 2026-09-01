import React from "react";
import { Navbar, Footer } from "../components/layout";
import { CinematicHero, ScrollGuideAvatar } from "../components/hero";
import {
  TrustBar,
  HowItWorks,
  FeatureShowcase,
  DashboardPreview,
  Security,
  Testimonials,
  Pricing
} from "../components/sections";
import { SectionTeaser, CHANNELS } from "../components/features";
import { CTA } from "../components/cta";
import { BookConsultationSection } from "../components/book-consultation/BookConsultationSection";
import { TOTAL_AGENTS } from "../data/agents";

export function HomePage() {
  return (
    <div className="min-h-screen w-full bg-canvas font-sans text-ink">
      <Navbar />
      <ScrollGuideAvatar />
      <main>
        <CinematicHero />
        <TrustBar />
        <HowItWorks />
        <SectionTeaser
          id="agents"
          image="/lets-scroll/teaser-agents.png"
          eyebrow="The agent suite"
          title={`${TOTAL_AGENTS} agents. Every corner of your practice.`}
          body="An entire agent factory working your practice — from the first call to the final recovery check-in. Meet the full roster."
          chips={[
          "AI Receptionist",
          "AI Consultation",
          "Surgery Scheduling",
          "Recovery Follow-up",
          "Lead Nurturing"]}

          ctaLabel="See all agents"
          ctaHref="/agents"
          dark />

        <SectionTeaser
          id="channels"
          image="/lets-scroll/teaser-channels.png"
          eyebrow="Everywhere your patients are"
          title="One inbox. Every channel. Fully automated."
          body="Your agents answer, qualify, and book across every social channel your patients already use."
          chips={CHANNELS.map((c) => ({ label: c.name, icon: c.icon, color: c.color }))}
          ctaLabel="See every channel"
          ctaHref="/channels"
          reverse />

        <FeatureShowcase />
        <DashboardPreview />
        <Security />
        <Testimonials />
        <Pricing />
        <BookConsultationSection />
        <CTA />
      </main>
      <Footer />
    </div>);

}

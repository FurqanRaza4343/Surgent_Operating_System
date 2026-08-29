import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import { Navbar, Footer } from "../components/layout";
import { Button, Container } from "../components/ui";
import { AGENT_CATEGORIES, AGENTS_BY_SLUG } from "../data/agents";

const AGENT_LOGOS: Record<string, string> = {
  receptionist: "/agent-logos/receptionist.png"
};

// One shared template for all 31 agents rather than 31 hand-built pages — each
// agent's own content lives in exactly one small file, data/agents/<slug>.ts
// (mirroring backend/src/agents/<slug>/), which is the actual "one folder per
// agent" unit here since there's no other agent-specific frontend logic yet.
export function AgentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const agent = slug ? AGENTS_BY_SLUG[slug] : undefined;

  if (!agent) return <Navigate to="/agents" replace />;

  const category = AGENT_CATEGORIES.find((c) => c.id === agent.categoryId);

  return (
    <div className="min-h-screen w-full bg-canvas font-sans text-ink">
      <Navbar />
      <main className="pt-28 pb-24">
        <Container className="max-w-3xl">
          <Link
            to="/agents"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-teal-600">

            <ArrowLeftIcon className="h-4 w-4" />
            Back to all agents
          </Link>

          <div className="mt-8 flex items-start gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              {AGENT_LOGOS[agent.slug] ? (
                <img src={AGENT_LOGOS[agent.slug]} alt={agent.name} className="h-10 w-10 object-contain" />
              ) : (
                <agent.icon className="h-8 w-8" />
              )}
            </span>
            <div>
              {category &&
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">
                  {category.label}
                </p>
              }
              <h1 className="mt-1 font-display text-3xl font-500 tracking-tight text-ink sm:text-4xl">
                {agent.name}
              </h1>
            </div>
          </div>

          <p className="mt-6 text-lg leading-relaxed text-ink-soft">{agent.desc}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button to="/demo" arrow>Book a demo</Button>
            <Button to="/agents" variant="ghost">See all agents</Button>
          </div>
        </Container>
      </main>
      <Footer />
    </div>);

}

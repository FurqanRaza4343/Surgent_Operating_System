import React from "react";
import { ActivityIcon, InstagramIcon, FacebookIcon, LinkedinIcon } from "lucide-react";
import { Container } from "../ui";
import { FOOTER_COLUMNS } from "../../data/footer";

export function Footer() {
  return (
    <footer className="border-t border-sand-200 bg-white">
      <Container className="py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white">
                <ActivityIcon className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">
                Aesthetix<span className="text-teal-500">AI</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              The autonomous AI workforce for plastic surgery and aesthetic practices. Every patient
              touchpoint, fully automated.
            </p>
            <div className="mt-5 flex gap-3">
              {[InstagramIcon, FacebookIcon, LinkedinIcon].map((Icon, i) =>
              <a
                key={i}
                href="#demo"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-sand-200 text-ink-soft transition-colors hover:border-teal-300 hover:text-teal-600"
                aria-label="Social link">

                  <Icon className="h-4.5 w-4.5" />
                </a>
              )}
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) =>
          <div key={col.title}>
              <h4 className="text-sm font-bold uppercase tracking-wide text-ink">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) =>
              <li key={l}>
                    <a
                  href="#demo"
                  className="text-sm text-ink-muted transition-colors hover:text-teal-600">

                      {l}
                    </a>
                  </li>
              )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-sand-200 pt-6 sm:flex-row">
          <p className="text-sm text-ink-muted">
            © {new Date().getFullYear()} AesthetixAI. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-ink-muted">
            <a href="#demo" className="hover:text-teal-600">Privacy</a>
            <a href="#demo" className="hover:text-teal-600">Terms</a>
            <a href="#security" className="hover:text-teal-600">HIPAA</a>
          </div>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-ink-muted sm:text-left">
          Screening agents provide informational screening only and do not provide medical diagnoses.
          All clinical decisions are made by licensed surgeons.
        </p>
      </Container>
    </footer>);

}

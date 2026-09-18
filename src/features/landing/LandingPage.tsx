// src/features/landing/LandingPage.tsx
import {
  LANDING_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
} from "@/application/auth/route-access";
import { Button } from "@/components/ui/button";
import { LANDING_CAPABILITIES } from "@/features/landing/capabilities";
import { LANDING_HOW_IT_WORKS } from "@/features/landing/how-it-works";
import { LandingCapabilityCard } from "@/features/landing/LandingCapabilityCard";
import { Wordmark } from "@/features/landing/Wordmark";
import Link from "next/link";
import type { JSX } from "react";

function LandingAuthActions(): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href={SIGN_UP_PATH}>Sign up</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={SIGN_IN_PATH}>Sign in</Link>
      </Button>
    </div>
  );
}

export function LandingPage(): JSX.Element {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Wordmark href={LANDING_PATH} />
          <nav aria-label="Account">
            <LandingAuthActions />
          </nav>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl px-4 py-12 md:py-16"
      >
        <section className="max-w-2xl space-y-6">
          <h1>FreelanceOS</h1>
          <p className="text-base text-muted-foreground">
            A workspace for freelance operations: clients, contracts, time
            tracking, analytics, reports, and alerts.
          </p>
          <p className="text-sm text-muted-foreground">
            Keep clients, contracts, time and operational insight in one
            workspace.
          </p>
        </section>
        <section
          className="mt-16 space-y-6"
          aria-labelledby="landing-how-it-works"
        >
          <h2 id="landing-how-it-works">How it works</h2>
          <ol className="grid list-none gap-6 p-0 sm:grid-cols-3">
            {LANDING_HOW_IT_WORKS.map((item) => (
              <li key={item.step} className="space-y-1">
                <p className="text-sm font-semibold tracking-tight text-muted-foreground">
                  {item.step}
                </p>
                <h3>{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </section>
        <section
          className="mt-16 space-y-6"
          aria-labelledby="landing-capabilities"
        >
          <h2 id="landing-capabilities">Capabilities</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LANDING_CAPABILITIES.map((capability) => (
              <LandingCapabilityCard
                key={capability.title}
                capability={capability}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

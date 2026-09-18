// src/features/landing/LandingPage.tsx
import {
  LANDING_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
} from "@/application/auth/route-access";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LANDING_CAPABILITIES } from "@/features/landing/capabilities";
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
          <LandingAuthActions />
        </section>
        <section
          className="mt-16 space-y-6"
          aria-labelledby="landing-capabilities"
        >
          <h2 id="landing-capabilities">Capabilities</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LANDING_CAPABILITIES.map((capability) => (
              <Card key={capability.title} size="sm">
                <CardHeader>
                  <CardTitle>
                    <h3>{capability.title}</h3>
                  </CardTitle>
                  <CardDescription>{capability.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-end gap-3 px-4 py-6">
          <nav aria-label="Footer">
            <LandingAuthActions />
          </nav>
        </div>
      </footer>
    </>
  );
}

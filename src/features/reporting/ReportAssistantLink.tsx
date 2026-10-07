// src/features/reporting/ReportAssistantLink.tsx
import Link from "next/link";
import type { JSX } from "react";

export function ReportAssistantLink(): JSX.Element {
  return (
    <section
      aria-labelledby="ai-assistant-entry-heading"
      className="grid gap-2 rounded-lg border border-border p-4"
    >
      <h2
        id="ai-assistant-entry-heading"
        className="text-base font-semibold"
      >
        AI Assistant
      </h2>
      <p className="text-sm text-muted-foreground">
        Ask questions about this workspace&apos;s available analytics data.
      </p>
      <Link
        href="/assistant"
        className="justify-self-start text-sm font-medium underline-offset-4 hover:underline"
      >
        Ask AI Assistant
      </Link>
    </section>
  );
}

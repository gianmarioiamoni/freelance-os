// src/app/(app)/assistant/page.tsx
import { AnalyticsAskBox } from "@/components/ai/AnalyticsAskBox";
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import type { JSX } from "react";

export default function AssistantPage(): JSX.Element {
  return (
    <section className="max-w-3xl">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about this workspace's available analytics data, such as revenue, hours, and contracts."
      />
      <PageContent>
        <AnalyticsAskBox surface="reports" />
      </PageContent>
    </section>
  );
}

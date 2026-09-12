// src/components/placeholder/PlaceholderPage.tsx
import { PageContent } from "@/components/page/PageContent";
import { PageHeader } from "@/components/page/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import type { JSX } from "react";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps): JSX.Element {
  return (
    <section className="max-w-2xl">
      <PageHeader title={title} />
      <PageContent>
        <EmptyState title={`${title} is not implemented yet.`} />
      </PageContent>
    </section>
  );
}

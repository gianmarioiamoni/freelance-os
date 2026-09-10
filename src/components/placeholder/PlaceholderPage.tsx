// src/components/placeholder/PlaceholderPage.tsx
import type { JSX } from "react";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps): JSX.Element {
  return (
    <section className="max-w-2xl">
      <h1>{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {title} is not implemented yet.
      </p>
    </section>
  );
}

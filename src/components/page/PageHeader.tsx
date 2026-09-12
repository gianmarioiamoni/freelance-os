// src/components/page/PageHeader.tsx
import type { JSX } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({
  title,
  description,
}: PageHeaderProps): JSX.Element {
  return (
    <header className="grid gap-1">
      <h1>{title}</h1>
      {description ? <p className="muted">{description}</p> : null}
    </header>
  );
}

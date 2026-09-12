// src/components/page/PageContent.tsx
import type { JSX, ReactNode } from "react";

type PageContentProps = {
  children: ReactNode;
};

export function PageContent({ children }: PageContentProps): JSX.Element {
  return <div className="mt-6">{children}</div>;
}

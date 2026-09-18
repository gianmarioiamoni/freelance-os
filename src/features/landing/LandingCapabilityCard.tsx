// src/features/landing/LandingCapabilityCard.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LandingCapability } from "@/features/landing/capabilities";
import type { JSX } from "react";

type LandingCapabilityCardProps = {
  capability: LandingCapability;
};

export function LandingCapabilityCard({
  capability,
}: LandingCapabilityCardProps): JSX.Element {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <h3>{capability.title}</h3>
        </CardTitle>
        <CardDescription>{capability.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <details className="group">
          <summary className="cursor-pointer list-none text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              Read more
              <span className="sr-only"> about {capability.title}</span>
            </span>
            <span className="hidden group-open:inline">
              Read less
              <span className="sr-only"> about {capability.title}</span>
            </span>
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            {capability.detail}
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

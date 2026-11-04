// src/features/auth/AuthBrand.tsx
import { LANDING_PATH } from "@/application/auth/route-access";
import { Wordmark } from "@/features/landing/Wordmark";
import type { JSX } from "react";

export function AuthBrand(): JSX.Element {
  return (
    <div className="mb-6 flex justify-center">
      <Wordmark href={LANDING_PATH} />
    </div>
  );
}

// src/features/auth/AuthBrand.tsx
import { Wordmark } from "@/features/landing/Wordmark";
import type { JSX } from "react";

export function AuthBrand(): JSX.Element {
  return (
    <div className="mb-6 flex justify-center">
      <Wordmark />
    </div>
  );
}

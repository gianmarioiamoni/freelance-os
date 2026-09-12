// src/app/(app)/error.tsx
"use client";

import { ErrorState } from "@/components/states/ErrorState";
import type { JSX } from "react";

export default function AppError(): JSX.Element {
  return (
    <ErrorState message="This page could not be loaded. Try again later." />
  );
}

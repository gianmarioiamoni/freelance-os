// src/app/(app)/page.tsx
import { DEFAULT_AUTHENTICATED_PATH } from "@/application/auth/route-access";
import { redirect } from "next/navigation";

export default function HomePage(): never {
  redirect(DEFAULT_AUTHENTICATED_PATH);
}

// src/app/layout.tsx
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { JSX, ReactNode } from "react";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "FreelanceOS",
  description: "Freelancer operations management",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  );
}

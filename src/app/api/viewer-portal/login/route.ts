// src/app/api/viewer-portal/login/route.ts
import { NextResponse } from "next/server";

import { auth } from "@/infrastructure/auth/auth";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify the email has active viewer access
    const repositories = createRepositories();
    const activeViewerAccesses = await repositories.viewerAccess.findActiveByEmail(
      normalizedEmail,
    );

    // Always return success to prevent email enumeration
    // Only send actual magic link if user has active viewer access
    if (activeViewerAccesses.length > 0) {
      const callbackURL = `${process.env.BETTER_AUTH_URL}/viewer-access-selector`;

      await auth.api.signInMagicLink({
        body: {
          email: normalizedEmail,
          callbackURL,
          metadata: { type: "viewer-login" },
        },
        headers: request.headers,
      });
    }

    // Generic response whether viewer exists or not
    return NextResponse.json({
      success: true,
      message:
        "If a timesheet viewer account exists for this email, a sign-in link has been sent.",
    });
  } catch (error) {
    console.error("Failed to send viewer login magic link:", error);
    return NextResponse.json(
      { error: "Unable to send sign-in link" },
      { status: 500 },
    );
  }
}

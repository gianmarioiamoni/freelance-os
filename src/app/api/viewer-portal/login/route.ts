// src/app/api/viewer-portal/login/route.ts
import { NextResponse } from "next/server";

import { auth } from "@/infrastructure/auth/auth";

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
    const callbackURL = `${process.env.BETTER_AUTH_URL}/viewer-access-selector`;

    await auth.api.signInMagicLink({
      body: {
        email: normalizedEmail,
        callbackURL,
        metadata: { type: "viewer-login" },
      },
      headers: request.headers,
    });

    return NextResponse.json({
      success: true,
      message:
        "A sign-in link has been sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("Failed to send viewer login magic link:", error);
    return NextResponse.json(
      { error: "Unable to send sign-in link" },
      { status: 500 },
    );
  }
}

// src/app/api/viewer-portal/request-magic-link/route.ts
import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";

import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/prisma/client";
import {
  ViewerTokenExpiredError,
  ViewerTokenNotFoundError,
  ViewerTokenAlreadyAcceptedError,
  ViewerAccessNotFoundError,
  InvalidViewerStatusTransitionError,
} from "@/domain/viewer-errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, viewerInviteToken } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    if (!viewerInviteToken || typeof viewerInviteToken !== "string") {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = createHash("sha256")
      .update(viewerInviteToken)
      .digest("hex");

    // Verify ViewerInviteToken
    const inviteToken = await prisma.viewerInviteToken.findUnique({
      where: { tokenHash },
      include: {
        viewerAccess: true,
      },
    });

    if (!inviteToken) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }

    if (inviteToken.acceptedAt !== null) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 },
      );
    }

    const now = new Date();
    if (inviteToken.expiresAt < now) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 },
      );
    }

    // Verify ViewerAccess
    if (!inviteToken.viewerAccess) {
      return NextResponse.json(
        { error: "Viewer access not found" },
        { status: 404 },
      );
    }

    if (inviteToken.viewerAccess.status !== "PENDING") {
      return NextResponse.json(
        { error: "This invitation is no longer valid" },
        { status: 400 },
      );
    }

    // Verify email matches
    if (inviteToken.viewerAccess.email.toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { error: "Email does not match invitation" },
        { status: 403 },
      );
    }

    // Create temporary context in Verification table
    const contextId = randomUUID();
    const contextExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    await prisma.verification.create({
      data: {
        id: randomUUID(),
        identifier: `viewer-context:${contextId}`,
        value: viewerInviteToken,
        expiresAt: contextExpiry,
      },
    });

    // Send Magic Link
    const callbackURL = `${process.env.BETTER_AUTH_URL}/viewer-portal/magic-callback?ctx=${contextId}`;

    await auth.api.signInMagicLink({
      body: {
        email: normalizedEmail,
        callbackURL,
        metadata: { type: "viewer-activation" },
      },
      headers: request.headers,
    });

    return NextResponse.json({
      success: true,
      message:
        "A sign-in link has been sent to your email. Please check your inbox.",
    });
  } catch (error) {
    if (
      error instanceof ViewerTokenNotFoundError ||
      error instanceof ViewerTokenExpiredError ||
      error instanceof ViewerTokenAlreadyAcceptedError ||
      error instanceof ViewerAccessNotFoundError ||
      error instanceof InvalidViewerStatusTransitionError
    ) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }

    console.error("Failed to request magic link:", error);
    return NextResponse.json(
      { error: "Unable to send sign-in link" },
      { status: 500 },
    );
  }
}

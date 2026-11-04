// src/app/api/admin/access-requests/[requestId]/route.ts
import {
  InvalidAdminConfigurationError,
  UnauthorizedAdminAccessError,
} from "@/application/admin/admin-errors";
import { requireAdminAuthorization } from "@/application/admin/admin-authorization";
import { reviewAccessRequest } from "@/infrastructure/access-request/repository";
import {
  sendAccessApprovedEmail,
  sendAccessRejectedEmail,
} from "@/infrastructure/email/access-request-notifications";
import { NextResponse, type NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    // Verify admin access
    let admin;
    try {
      admin = await requireAdminAuthorization();
    } catch (error) {
      if (
        error instanceof UnauthorizedAdminAccessError ||
        error instanceof InvalidAdminConfigurationError
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    const params = await context.params;
    const body = await request.json();
    const { approved, rejectionReason } = body;

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "approved field is required" },
        { status: 400 },
      );
    }

    const result = await reviewAccessRequest({
      requestId: params.requestId,
      approved,
      rejectionReason,
      reviewedBy: admin.userId,
    });

    // Send email notification to user
    if (approved) {
      await sendAccessApprovedEmail(result);
    } else {
      await sendAccessRejectedEmail(result);
    }

    return NextResponse.json({ success: true, request: result });
  } catch (error) {
    console.error("Error reviewing access request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

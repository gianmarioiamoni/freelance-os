// src/app/api/timesheet-viewer/access/[viewerAccessId]/contracts/route.ts
import { authorizeContract } from "@/application/timesheet-viewer/authorize-contract";
import { ContractNotFoundError } from "@/domain/contract-errors";
import {
  InvalidViewerInputError,
  ViewerAccessNotFoundError,
} from "@/domain/viewer-errors";
import { getCurrentWorkspaceContext } from "@/infrastructure/workspace/current-workspace";
import { createRepositories } from "@/infrastructure/persistence/create-repositories";
import { isNextRedirectError } from "@/lib/next-redirect-error";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ viewerAccessId: string }> },
): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const { viewerAccessId } = await params;
    const body = await request.json();

    const repositories = createRepositories();
    const authorized = await authorizeContract(
      context,
      { viewerAccessId, ...body },
      repositories.viewerAccess,
      repositories.contracts,
    );

    return Response.json({
      contractId: authorized.contractId,
      displayLabel: authorized.displayLabel,
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    if (error instanceof ViewerAccessNotFoundError) {
      return Response.json({ error: "Viewer not found" }, { status: 404 });
    }
    if (error instanceof ContractNotFoundError) {
      return Response.json({ error: "Contract not found" }, { status: 404 });
    }
    if (error instanceof InvalidViewerInputError) {
      return Response.json(
        { error: `Invalid input: ${error.field}` },
        { status: 400 },
      );
    }
    console.error("Failed to authorize contract:", error);
    return Response.json(
      { error: "Unable to authorize contract" },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ viewerAccessId: string }> },
): Promise<Response> {
  try {
    const context = await getCurrentWorkspaceContext();
    const { viewerAccessId } = await params;

    const repositories = createRepositories();
    
    // Verify viewer exists and belongs to workspace
    const viewer = await repositories.viewerAccess.getById(
      context.workspaceId,
      viewerAccessId,
    );
    if (!viewer) {
      return Response.json({ error: "Viewer not found" }, { status: 404 });
    }

    const contracts = await repositories.viewerAccess.listAuthorizedContracts(
      context.workspaceId,
      viewerAccessId,
    );

    return Response.json({
      contracts: contracts.map((c) => ({
        contractId: c.contractId,
        displayLabel: c.displayLabel,
      })),
    });
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("Failed to list authorized contracts:", error);
    return Response.json(
      { error: "Unable to load contracts" },
      { status: 500 },
    );
  }
}

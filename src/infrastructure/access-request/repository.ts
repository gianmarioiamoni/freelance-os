// src/infrastructure/access-request/repository.ts
import "server-only";

import type {
  AccessRequestRecord,
  CreateAccessRequestInput,
  ReviewAccessRequestInput,
} from "@/domain/access-request/types";
import { prisma } from "@/infrastructure/prisma/client";
import { randomBytes } from "node:crypto";

export async function createAccessRequest(
  input: CreateAccessRequestInput,
): Promise<AccessRequestRecord> {
  const token = randomBytes(32).toString("hex");

  const request = await prisma.accessRequest.create({
    data: {
      email: input.email.toLowerCase().trim(),
      token,
    },
  });

  return request;
}

export async function findAccessRequestByEmail(
  email: string,
): Promise<AccessRequestRecord | null> {
  return prisma.accessRequest.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
}

export async function findAccessRequestByToken(
  token: string,
): Promise<AccessRequestRecord | null> {
  return prisma.accessRequest.findUnique({
    where: { token },
  });
}

export async function listPendingAccessRequests(): Promise<
  AccessRequestRecord[]
> {
  return prisma.accessRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { requestedAt: "desc" },
  });
}

export async function reviewAccessRequest(
  input: ReviewAccessRequestInput,
): Promise<AccessRequestRecord> {
  const tokenExpiresAt = input.approved
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    : null;

  return prisma.accessRequest.update({
    where: { id: input.requestId },
    data: {
      status: input.approved ? "APPROVED" : "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: input.reviewedBy,
      rejectionReason: input.rejectionReason,
      tokenExpiresAt,
    },
  });
}

export async function checkEmailHasAccess(email: string): Promise<boolean> {
  const request = await prisma.accessRequest.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!request) {
    return false;
  }

  // Check if approved and token not expired
  if (request.status === "APPROVED") {
    if (!request.tokenExpiresAt) {
      return true; // No expiration set
    }
    return request.tokenExpiresAt > new Date();
  }

  return false;
}

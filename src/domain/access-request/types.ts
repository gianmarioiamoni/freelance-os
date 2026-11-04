// src/domain/access-request/types.ts
import type { AccessRequestStatus } from "@prisma/client";

export type AccessRequestRecord = {
  id: string;
  email: string;
  status: AccessRequestStatus;
  token: string;
  tokenExpiresAt: Date | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
};

export type CreateAccessRequestInput = {
  email: string;
};

export type ReviewAccessRequestInput = {
  requestId: string;
  approved: boolean;
  rejectionReason?: string;
  reviewedBy: string;
};

export type ValidateAccessTokenInput = {
  token: string;
  email: string;
};

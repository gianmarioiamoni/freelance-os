// src/application/timesheet-viewer/viewer-input.ts
import {
  InvalidViewerInputError,
  type ViewerInputField,
} from "@/domain/viewer-errors";

export const MESSAGE_MIN_LENGTH = 10;
export const MESSAGE_MAX_LENGTH = 2000;
export const DISPLAY_LABEL_MAX_LENGTH = 255;
export const NOTES_MAX_LENGTH = 4000;
export const TOKEN_EXPIRY_MIN_HOURS = 1;
export const TOKEN_EXPIRY_MAX_HOURS = 168; // 7 days

export type InviteViewerInput = {
  email: string;
  contractIds: string[];
  tokenExpiryHours?: number;
};

export type ValidatedInviteViewerInput = {
  email: string;
  contractIds: string[];
  tokenExpiryHours: number;
};

export type AuthorizeContractInput = {
  viewerAccessId: string;
  contractId: string;
  displayLabel?: string | null;
};

export type ValidatedAuthorizeContractInput = {
  viewerAccessId: string;
  contractId: string;
  displayLabel: string | null;
};

export type CreateAnomalyInput = {
  viewerAccessId: string;
  timeEntryId?: string | null;
  workDate: Date;
  message: string;
};

export type ValidatedCreateAnomalyInput = {
  viewerAccessId: string;
  timeEntryId: string | null;
  workDate: Date;
  message: string;
};

export type UpdateAnomalyInput = {
  freelanceNotes?: string | null;
};

export type ValidatedUpdateAnomalyInput = {
  freelanceNotes: string | null;
};

function parseEmail(value: string | undefined): string {
  const trimmed = (value ?? "").trim().toLowerCase();

  if (trimmed.length === 0) {
    throw new InvalidViewerInputError("email");
  }

  const parts = trimmed.split("@");

  if (parts.length !== 2 || parts[0] === "" || parts[1] === "") {
    throw new InvalidViewerInputError("email");
  }

  return trimmed;
}

function parseTokenExpiryHours(value: number | undefined): number {
  const hours = value ?? 72; // Default 72 hours (3 days)

  if (
    !Number.isFinite(hours) ||
    hours < TOKEN_EXPIRY_MIN_HOURS ||
    hours > TOKEN_EXPIRY_MAX_HOURS
  ) {
    throw new InvalidViewerInputError("tokenExpiry");
  }

  return hours;
}

function parseMessage(value: string | undefined): string {
  const trimmed = (value ?? "").trim();

  if (
    trimmed.length < MESSAGE_MIN_LENGTH ||
    trimmed.length > MESSAGE_MAX_LENGTH
  ) {
    throw new InvalidViewerInputError("message");
  }

  return trimmed;
}

function parseOptionalText(
  value: string | null | undefined,
  field: ViewerInputField,
  maxLength?: number,
): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw new InvalidViewerInputError(field);
  }

  return trimmed;
}

function parseUuid(value: string | undefined, field: ViewerInputField): string {
  const trimmed = (value ?? "").trim();

  if (trimmed.length === 0) {
    throw new InvalidViewerInputError(field);
  }

  // Basic UUID validation (not exhaustive)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) {
    throw new InvalidViewerInputError(field);
  }

  return trimmed;
}

function parseContractIds(value: string[] | undefined): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new InvalidViewerInputError("contractId");
  }

  const uniqueIds = [...new Set(value)];
  
  // Validate each ID
  for (const id of uniqueIds) {
    parseUuid(id, "contractId");
  }

  return uniqueIds;
}

export function parseInviteViewerInput(
  input: InviteViewerInput,
): ValidatedInviteViewerInput {
  return {
    email: parseEmail(input.email),
    contractIds: parseContractIds(input.contractIds),
    tokenExpiryHours: parseTokenExpiryHours(input.tokenExpiryHours),
  };
}

export function parseAuthorizeContractInput(
  input: AuthorizeContractInput,
): ValidatedAuthorizeContractInput {
  return {
    viewerAccessId: parseUuid(input.viewerAccessId, "viewerAccessId"),
    contractId: parseUuid(input.contractId, "contractId"),
    displayLabel: parseOptionalText(
      input.displayLabel,
      "displayLabel",
      DISPLAY_LABEL_MAX_LENGTH,
    ),
  };
}

export function parseCreateAnomalyInput(
  input: CreateAnomalyInput,
): ValidatedCreateAnomalyInput {
  return {
    viewerAccessId: parseUuid(input.viewerAccessId, "viewerAccessId"),
    timeEntryId:
      input.timeEntryId != null
        ? parseUuid(input.timeEntryId, "viewerAccessId")
        : null,
    workDate: input.workDate,
    message: parseMessage(input.message),
  };
}

export function parseUpdateAnomalyInput(
  input: UpdateAnomalyInput,
): ValidatedUpdateAnomalyInput {
  return {
    freelanceNotes: parseOptionalText(input.freelanceNotes, "message", NOTES_MAX_LENGTH),
  };
}

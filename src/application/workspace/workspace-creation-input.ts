// src/application/workspace/workspace-creation-input.ts
import { InvalidWorkspaceCreationInputError } from "@/domain/workspace-errors";

export const WORKSPACE_NAME_MAX_LENGTH = 255;

export type WorkspaceCreationInput = {
  name: string;
  timezone: string;
  currency: string;
};

export type ValidatedWorkspaceCreationInput = {
  name: string;
  timezone: string;
  currency: string;
};

const IANA_TIME_ZONES = new Set(Intl.supportedValuesOf("timeZone"));
const ISO_4217_CURRENCIES = new Set(Intl.supportedValuesOf("currency"));

export function listSupportedTimeZones(): string[] {
  return [...IANA_TIME_ZONES].sort((left, right) => left.localeCompare(right));
}

export function listSupportedCurrencies(): string[] {
  return [...ISO_4217_CURRENCIES].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function parseWorkspaceCreationInput(
  input: WorkspaceCreationInput,
): ValidatedWorkspaceCreationInput {
  const name = input.name.trim();

  if (name.length === 0 || name.length > WORKSPACE_NAME_MAX_LENGTH) {
    throw new InvalidWorkspaceCreationInputError("name");
  }

  const timezone = input.timezone.trim();

  if (!IANA_TIME_ZONES.has(timezone)) {
    throw new InvalidWorkspaceCreationInputError("timezone");
  }

  const currency = input.currency.trim().toUpperCase();

  if (!ISO_4217_CURRENCIES.has(currency)) {
    throw new InvalidWorkspaceCreationInputError("currency");
  }

  return { name, timezone, currency };
}

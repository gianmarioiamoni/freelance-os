// src/application/clients/client-input.ts
import {
  InvalidClientInputError,
  type ClientInputField,
} from "@/domain/client-errors";

export const COMPANY_NAME_MAX_LENGTH = 255;
export const CONTACT_NAME_MAX_LENGTH = 255;
export const ADDRESS_MAX_LENGTH = 4000;
export const NOTES_MAX_LENGTH = 4000;
export const PHONE_MAX_LENGTH = 50;

export type ClientWriteInput = {
  companyName: string;
  vatNumber?: string | null;
  taxCode?: string | null;
  address?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type ValidatedClientWriteInput = {
  companyName: string;
  vatNumber: string | null;
  taxCode: string | null;
  address: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

function parseOptionalText(
  value: string | null | undefined,
  field: ClientInputField,
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
    throw new InvalidClientInputError(field);
  }

  return trimmed;
}

function parseCompanyName(value: string | undefined): string {
  const trimmed = (value ?? "").trim();

  if (trimmed.length === 0 || trimmed.length > COMPANY_NAME_MAX_LENGTH) {
    throw new InvalidClientInputError("companyName");
  }

  return trimmed;
}

function parseOptionalEmail(value: string | null | undefined): string | null {
  const trimmed = parseOptionalText(value, "email");

  if (trimmed === null) {
    return null;
  }

  const parts = trimmed.split("@");

  if (parts.length !== 2 || parts[0] === "" || parts[1] === "") {
    throw new InvalidClientInputError("email");
  }

  return trimmed;
}

export function parseClientWriteInput(
  input: ClientWriteInput,
): ValidatedClientWriteInput {
  return {
    companyName: parseCompanyName(input.companyName),
    vatNumber: parseOptionalText(input.vatNumber, "vatNumber"),
    taxCode: parseOptionalText(input.taxCode, "taxCode"),
    address: parseOptionalText(input.address, "address", ADDRESS_MAX_LENGTH),
    contactName: parseOptionalText(
      input.contactName,
      "contactName",
      CONTACT_NAME_MAX_LENGTH,
    ),
    email: parseOptionalEmail(input.email),
    phone: parseOptionalText(input.phone, "phone", PHONE_MAX_LENGTH),
    notes: parseOptionalText(input.notes, "notes", NOTES_MAX_LENGTH),
  };
}

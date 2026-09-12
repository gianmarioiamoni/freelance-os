// src/features/clients/client-form-state.ts
import {
  ADDRESS_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  type ClientWriteInput,
} from "@/application/clients/client-input";
import type { ClientInputField } from "@/domain/client-errors";
import type { ClientRecord } from "@/domain/persistence-types";

export type ClientFormValues = {
  companyName: string;
  vatNumber: string;
  taxCode: string;
  address: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
};

export type ClientFormActionState = {
  error: string;
  field?: ClientInputField;
  values: ClientFormValues;
} | null;

export type ClientFormAction = (
  previousState: ClientFormActionState,
  formData: FormData,
) => Promise<ClientFormActionState>;

export const EMPTY_CLIENT_FORM_VALUES: ClientFormValues = {
  companyName: "",
  vatNumber: "",
  taxCode: "",
  address: "",
  contactName: "",
  email: "",
  phone: "",
  notes: "",
};

export const CLIENT_FIELD_ERROR_MESSAGES: Record<ClientInputField, string> = {
  companyName: "Enter a company name between 1 and 255 characters.",
  vatNumber: "Enter a valid VAT number.",
  taxCode: "Enter a valid tax code.",
  address: "Enter an address with at most 4000 characters.",
  contactName: "Enter a contact name with at most 255 characters.",
  email: "Enter a valid email address.",
  phone: "Enter a phone number with at most 50 characters.",
  notes: "Enter notes with at most 4000 characters.",
};

export const CLIENT_FORM_FIELDS = [
  {
    name: "companyName",
    label: "Company name",
    required: true,
    maxLength: COMPANY_NAME_MAX_LENGTH,
  },
  { name: "vatNumber", label: "VAT number" },
  { name: "taxCode", label: "Tax code" },
  { name: "address", label: "Address", maxLength: ADDRESS_MAX_LENGTH },
  {
    name: "contactName",
    label: "Contact name",
    maxLength: CONTACT_NAME_MAX_LENGTH,
  },
  { name: "email", label: "Email", autoComplete: "email" },
  { name: "phone", label: "Phone", maxLength: PHONE_MAX_LENGTH },
  { name: "notes", label: "Notes", maxLength: NOTES_MAX_LENGTH },
] as const;

export function readClientFormValues(formData: FormData): ClientFormValues {
  return {
    companyName: String(formData.get("companyName") ?? ""),
    vatNumber: String(formData.get("vatNumber") ?? ""),
    taxCode: String(formData.get("taxCode") ?? ""),
    address: String(formData.get("address") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export function toClientWriteInput(values: ClientFormValues): ClientWriteInput {
  return values;
}

export function toClientFormValues(client: ClientRecord): ClientFormValues {
  return {
    companyName: client.companyName,
    vatNumber: client.vatNumber ?? "",
    taxCode: client.taxCode ?? "",
    address: client.address ?? "",
    contactName: client.contactName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    notes: client.notes ?? "",
  };
}

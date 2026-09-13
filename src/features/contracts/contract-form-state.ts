// src/features/contracts/contract-form-state.ts
import { PAYMENT_TERMS_NOTE_MAX_LENGTH } from "@/application/contracts/contract-input";
import type { ContractCreateInput, ContractUpdateInput } from "@/application/contracts/contract-input";
import type { ContractInputField } from "@/domain/contract-errors";
import type { ContractRecord } from "@/domain/persistence-types";
import {
  formatCalendarDate,
  formatHoursFromMinutes,
} from "@/features/contracts/contract-display";

export type ContractFormValues = {
  clientId: string;
  validFrom: string;
  validTo: string;
  billingModel: string;
  rate: string;
  currency: string;
  monthlyContractedHours: string;
  paymentTermsDays: string;
  paymentTermsNote: string;
};

export type ContractFormActionState = {
  error: string;
  field?: ContractInputField;
  values: ContractFormValues;
} | null;

export type ContractFormAction = (
  previousState: ContractFormActionState,
  formData: FormData,
) => Promise<ContractFormActionState>;

export const EMPTY_CONTRACT_FORM_VALUES: ContractFormValues = {
  clientId: "",
  validFrom: "",
  validTo: "",
  billingModel: "",
  rate: "",
  currency: "",
  monthlyContractedHours: "",
  paymentTermsDays: "",
  paymentTermsNote: "",
};

export const CONTRACT_FIELD_ERROR_MESSAGES: Record<ContractInputField, string> = {
  clientId: "Select an active client.",
  validFrom: "Enter a valid start date.",
  validTo: "Enter a valid end date.",
  billingModel: "Select hourly or daily billing.",
  rate: "Enter a rate greater than 0 with at most 4 decimal places.",
  currency: "Select a valid currency.",
  monthlyContractedHours:
    "Enter monthly contracted hours that convert exactly to minutes.",
  paymentTermsDays: "Enter payment terms as a whole number of days.",
  paymentTermsNote: "Enter a payment terms note with at most 4000 characters.",
};

export const CONTRACT_PERIOD_ERROR =
  "Valid to must be after valid from.";
export const CONTRACT_OVERLAP_ERROR =
  "This period overlaps another contract for this client.";
export const CONTRACT_ARCHIVED_CLIENT_ERROR =
  "A new contract cannot be created for an archived client.";
export const CONTRACT_CLIENT_NOT_FOUND_ERROR =
  "This client could not be found.";
export const CONTRACT_NOT_FOUND_ERROR = "This contract could not be found.";

export function readContractFormValues(formData: FormData): ContractFormValues {
  return {
    clientId: String(formData.get("clientId") ?? ""),
    validFrom: String(formData.get("validFrom") ?? ""),
    validTo: String(formData.get("validTo") ?? ""),
    billingModel: String(formData.get("billingModel") ?? ""),
    rate: String(formData.get("rate") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    monthlyContractedHours: String(formData.get("monthlyContractedHours") ?? ""),
    paymentTermsDays: String(formData.get("paymentTermsDays") ?? ""),
    paymentTermsNote: String(formData.get("paymentTermsNote") ?? ""),
  };
}

export function toContractCreateInput(
  values: ContractFormValues,
): ContractCreateInput {
  return {
    clientId: values.clientId,
    ...toContractWriteFields(values),
  };
}

export function toContractUpdateInput(
  values: ContractFormValues,
): ContractUpdateInput {
  return toContractWriteFields(values);
}

export function toContractFormValues(
  contract: ContractRecord,
  currencyFallback: string,
): ContractFormValues {
  return {
    clientId: contract.clientId,
    validFrom: formatCalendarDate(contract.validFrom),
    validTo: contract.validTo ? formatCalendarDate(contract.validTo) : "",
    billingModel: contract.billingModel,
    rate: contract.rate,
    currency: contract.currency || currencyFallback,
    monthlyContractedHours:
      contract.monthlyContractedMinutes === null
        ? ""
        : formatHoursFromMinutes(contract.monthlyContractedMinutes),
    paymentTermsDays:
      contract.paymentTermsDays === null
        ? ""
        : String(contract.paymentTermsDays),
    paymentTermsNote: contract.paymentTermsNote ?? "",
  };
}

export function createEmptyContractFormValues(
  currency: string,
  clientId = "",
): ContractFormValues {
  return {
    ...EMPTY_CONTRACT_FORM_VALUES,
    clientId,
    currency,
  };
}

export { PAYMENT_TERMS_NOTE_MAX_LENGTH };

function toContractWriteFields(values: ContractFormValues) {
  return {
    validFrom: values.validFrom,
    validTo: values.validTo,
    billingModel: values.billingModel,
    rate: values.rate,
    currency: values.currency,
    monthlyContractedHours: values.monthlyContractedHours,
    paymentTermsDays: values.paymentTermsDays,
    paymentTermsNote: values.paymentTermsNote,
  };
}

// src/application/contracts/contract-input.ts
import {
  parseAllocatedMinutes,
  parseBillingModel,
  parseCalendarDate,
  parseCurrency,
  parseMonthlyContractedHours,
  parsePaymentTermsDays,
  parsePaymentTermsNote,
  parseRate,
  parseRequiredText,
} from "@/application/contracts/contract-field-parsers";
import { assertValidContractPeriod } from "@/application/contracts/contract-validity";
import { deriveContractAllocatedMinutes } from "@/domain/contract-budget";
import { InvalidContractInputError } from "@/domain/contract-errors";
import type { BillingModel } from "@/domain/persistence-types";

export {
  MONTHLY_MINUTES_MAX,
  PAYMENT_TERMS_NOTE_MAX_LENGTH,
} from "@/application/contracts/contract-field-parsers";

export type ContractWriteFields = {
  validFrom: string;
  validTo?: string | null;
  billingModel: string;
  rate: string;
  currency: string;
  monthlyContractedHours?: string | number | null;
  allocatedMinutes?: string | number | null;
  paymentTermsDays?: string | number | null;
  paymentTermsNote?: string | null;
};

export type ContractCreateInput = ContractWriteFields & {
  clientId: string;
};

export type ContractUpdateInput = ContractWriteFields;

export type ValidatedContractWriteFields = {
  validFrom: Date;
  validTo: Date | null;
  billingModel: BillingModel;
  rate: string;
  currency: string;
  monthlyContractedMinutes: number | null;
  allocatedMinutes: number | null;
  paymentTermsDays: number | null;
  paymentTermsNote: string | null;
};

export type ValidatedContractCreateInput = ValidatedContractWriteFields & {
  clientId: string;
};

export type ValidatedContractUpdateInput = ValidatedContractWriteFields & {
  existingAllocatedMinutes?: number | null;
};

function parseWriteFields(input: ContractWriteFields): ValidatedContractWriteFields {
  const validFrom = parseCalendarDate(input.validFrom, "validFrom");

  if (validFrom === null) {
    throw new InvalidContractInputError("validFrom");
  }

  const validTo = parseCalendarDate(input.validTo, "validTo");
  assertValidContractPeriod(validFrom, validTo);

  const monthlyContractedMinutes = parseMonthlyContractedHours(
    input.monthlyContractedHours,
  );
  const explicitAllocatedMinutes = parseAllocatedMinutes(input.allocatedMinutes);

  // Derive allocatedMinutes: explicit value wins, otherwise calculate from monthly capacity + duration
  const allocatedMinutes = deriveContractAllocatedMinutes(
    validFrom,
    validTo,
    monthlyContractedMinutes,
    explicitAllocatedMinutes,
  );

  return {
    validFrom,
    validTo,
    billingModel: parseBillingModel(input.billingModel),
    rate: parseRate(input.rate),
    currency: parseCurrency(input.currency),
    monthlyContractedMinutes,
    allocatedMinutes,
    paymentTermsDays: parsePaymentTermsDays(input.paymentTermsDays),
    paymentTermsNote: parsePaymentTermsNote(input.paymentTermsNote),
  };
}

export function parseContractCreateInput(
  input: ContractCreateInput,
): ValidatedContractCreateInput {
  return {
    clientId: parseRequiredText(input.clientId, "clientId"),
    ...parseWriteFields(input),
  };
}

export function parseContractUpdateInput(
  input: ContractUpdateInput,
  existingAllocatedMinutes?: number | null,
): ValidatedContractUpdateInput {
  const parsed = parseWriteFields(input);

  // Preserve existing explicit allocatedMinutes if input field was not provided
  const inputHasAllocatedMinutes = input.allocatedMinutes !== undefined;
  const finalAllocatedMinutes = inputHasAllocatedMinutes
    ? parsed.allocatedMinutes
    : existingAllocatedMinutes !== undefined && existingAllocatedMinutes !== null
      ? existingAllocatedMinutes
      : parsed.allocatedMinutes;

  return {
    ...parsed,
    allocatedMinutes: finalAllocatedMinutes,
    existingAllocatedMinutes,
  };
}

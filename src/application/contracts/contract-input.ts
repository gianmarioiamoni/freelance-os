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

export type ValidatedContractUpdateInput = ValidatedContractWriteFields;

function parseWriteFields(input: ContractWriteFields): ValidatedContractWriteFields {
  const validFrom = parseCalendarDate(input.validFrom, "validFrom");

  if (validFrom === null) {
    throw new InvalidContractInputError("validFrom");
  }

  const validTo = parseCalendarDate(input.validTo, "validTo");
  assertValidContractPeriod(validFrom, validTo);

  return {
    validFrom,
    validTo,
    billingModel: parseBillingModel(input.billingModel),
    rate: parseRate(input.rate),
    currency: parseCurrency(input.currency),
    monthlyContractedMinutes: parseMonthlyContractedHours(
      input.monthlyContractedHours,
    ),
    allocatedMinutes: parseAllocatedMinutes(input.allocatedMinutes),
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
): ValidatedContractUpdateInput {
  return parseWriteFields(input);
}

// src/application/contracts/contract-field-parsers.ts
import { listSupportedCurrencies } from "@/application/workspace/workspace-creation-input";
import {
  InvalidContractInputError,
  type ContractInputField,
} from "@/domain/contract-errors";
import type { BillingModel } from "@/domain/persistence-types";

export const PAYMENT_TERMS_NOTE_MAX_LENGTH = 4000;
export const MONTHLY_MINUTES_MAX = 2_147_483_647;

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RATE_PATTERN = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
const HOURS_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const PAYMENT_DAYS_PATTERN = /^\d+$/;
const BILLING_MODELS = new Set<BillingModel>(["HOURLY", "DAILY"]);
const SUPPORTED_CURRENCIES = new Set(listSupportedCurrencies());

export function parseRequiredText(
  value: string | undefined,
  field: ContractInputField,
): string {
  const trimmed = (value ?? "").trim();

  if (trimmed.length === 0) {
    throw new InvalidContractInputError(field);
  }

  return trimmed;
}

export function parseCalendarDate(
  value: string | null | undefined,
  field: "validFrom" | "validTo",
): Date | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const match = CALENDAR_DATE_PATTERN.exec(trimmed);

  if (!match) {
    throw new InvalidContractInputError(field);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new InvalidContractInputError(field);
  }

  return parsed;
}

export function parseBillingModel(value: string | undefined): BillingModel {
  const billingModel = parseRequiredText(value, "billingModel");

  if (!BILLING_MODELS.has(billingModel as BillingModel)) {
    throw new InvalidContractInputError("billingModel");
  }

  return billingModel as BillingModel;
}

export function parseRate(value: string | undefined): string {
  const rate = parseRequiredText(value, "rate");

  if (!RATE_PATTERN.test(rate) || Number(rate) <= 0) {
    throw new InvalidContractInputError("rate");
  }

  return rate;
}

export function parseCurrency(value: string | undefined): string {
  const currency = parseRequiredText(value, "currency").toUpperCase();

  if (!SUPPORTED_CURRENCIES.has(currency)) {
    throw new InvalidContractInputError("currency");
  }

  return currency;
}

export function parseMonthlyContractedHours(
  value: string | number | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  const raw = typeof value === "number" ? String(value) : value.trim();

  if (raw.length === 0) {
    return null;
  }

  if (!HOURS_PATTERN.test(raw)) {
    throw new InvalidContractInputError("monthlyContractedHours");
  }

  const [integerPart = "0", fractionPart = ""] = raw.split(".");
  const scale = BigInt(fractionPart.length);
  const numerator = BigInt(`${integerPart}${fractionPart}`);

  if (numerator <= BigInt(0)) {
    throw new InvalidContractInputError("monthlyContractedHours");
  }

  const minutesNumerator = numerator * BigInt(60);
  const denominator = BigInt(10) ** scale;

  if (minutesNumerator % denominator !== BigInt(0)) {
    throw new InvalidContractInputError("monthlyContractedHours");
  }

  const minutes = minutesNumerator / denominator;

  if (minutes > BigInt(MONTHLY_MINUTES_MAX)) {
    throw new InvalidContractInputError("monthlyContractedHours");
  }

  return Number(minutes);
}

export function parsePaymentTermsDays(
  value: string | number | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }

  const raw = typeof value === "number" ? String(value) : value.trim();

  if (raw.length === 0) {
    return null;
  }

  if (!PAYMENT_DAYS_PATTERN.test(raw)) {
    throw new InvalidContractInputError("paymentTermsDays");
  }

  const days = Number(raw);

  if (!Number.isSafeInteger(days) || days > MONTHLY_MINUTES_MAX) {
    throw new InvalidContractInputError("paymentTermsDays");
  }

  return days;
}

export function parsePaymentTermsNote(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > PAYMENT_TERMS_NOTE_MAX_LENGTH) {
    throw new InvalidContractInputError("paymentTermsNote");
  }

  return trimmed;
}

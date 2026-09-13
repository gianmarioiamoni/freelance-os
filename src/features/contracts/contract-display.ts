// src/features/contracts/contract-display.ts
import { deriveContractApplicability } from "@/application/contracts/contract-validity";
import type { ContractApplicability } from "@/application/contracts/contract-validity";
import { displayOptionalText } from "@/features/clients/client-status";
import type {
  BillingModel,
  ClientRecord,
  ContractRecord,
} from "@/domain/persistence-types";

export type ContractListItem = {
  contract: ContractRecord;
  clientName: string;
  clientArchived: boolean;
  applicability: ContractApplicability;
};

export function getWorkspaceCalendarDate(
  timezone: string,
  instant = new Date(),
): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

export function formatCalendarDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatWorkspaceInstantDate(
  value: Date,
  timezone: string,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatValidityInterval(
  validFrom: Date,
  validTo: Date | null,
): string {
  const start = formatCalendarDate(validFrom);

  if (validTo === null) {
    return `${start} → Open-ended`;
  }

  return `${start} → ${formatCalendarDate(validTo)}`;
}

export function formatApplicabilityLabel(
  applicability: ContractApplicability,
): string {
  if (applicability === "scheduled") {
    return "Scheduled";
  }

  if (applicability === "ended") {
    return "Ended";
  }

  return "Current";
}

export function formatBillingModel(billingModel: BillingModel): string {
  return billingModel === "HOURLY" ? "Hourly" : "Daily";
}

export function formatRateWithCurrency(rate: string, currency: string): string {
  return `${trimTrailingZeros(rate)} ${currency}`;
}

export function formatHoursFromMinutes(minutes: number): string {
  const hours = minutes / 60;

  if (Number.isInteger(hours)) {
    return String(hours);
  }

  return String(parseFloat(hours.toFixed(10)));
}

export function displayMonthlyContractedHours(
  minutes: number | null,
): string {
  if (minutes === null) {
    return "No monthly limit";
  }

  const hours = formatHoursFromMinutes(minutes);
  return `${hours} ${hours === "1" ? "hour" : "hours"}`;
}

export function displayPaymentTerms(
  days: number | null,
  note: string | null,
): string {
  const parts: string[] = [];

  if (days !== null) {
    parts.push(`Net ${days} days`);
  }

  if (note !== null && note.length > 0) {
    parts.push(note);
  }

  if (parts.length === 0) {
    return displayOptionalText(null);
  }

  return parts.join(" — ");
}

export function toContractListItems(
  contracts: ContractRecord[],
  clients: ClientRecord[],
  today: Date,
): ContractListItem[] {
  const clientsById = new Map(clients.map((client) => [client.id, client]));

  return contracts.map((contract) => {
    const client = clientsById.get(contract.clientId);

    return {
      contract,
      clientName: client?.companyName ?? "Client unavailable",
      clientArchived: client?.status === "ARCHIVED",
      applicability: deriveContractApplicability(
        contract.validFrom,
        contract.validTo,
        today,
      ),
    };
  });
}

function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/\.?0+$/, "");
}

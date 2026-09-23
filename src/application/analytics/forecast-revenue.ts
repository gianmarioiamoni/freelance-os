// src/application/analytics/forecast-revenue.ts
import { publishMonetaryAmount } from "@/application/analytics/accrued-revenue";
import type { AccruedAmount, AccruedByContract, AccruedRevenue, ForecastRevenue } from "@/domain/analytics-types";

/**
 * Linear Forecast projection of one Accrued unrounded amount.
 *
 * Forecast = Accrued / (elapsedPeriod / totalPeriod)
 *          = Accrued × totalPeriod / elapsedPeriod
 *
 * Reuses Accrued's JS-number unrounded convention. Publication rounding is
 * applied by the caller via `publishMonetaryAmount`.
 */
export function projectForecastAmount(
  unrounded: number,
  elapsedPeriod: number,
  totalPeriod: number,
): number {
  if (unrounded === 0 || elapsedPeriod === 0 || totalPeriod <= 0) {
    return 0;
  }

  if (elapsedPeriod === totalPeriod) {
    return unrounded;
  }

  return (unrounded * totalPeriod) / elapsedPeriod;
}

function projectPublishedAmount(
  amount: AccruedAmount,
  elapsedPeriod: number,
  totalPeriod: number,
): AccruedAmount {
  const unrounded = projectForecastAmount(amount.unrounded, elapsedPeriod, totalPeriod);
  return {
    currency: amount.currency,
    unrounded,
    published: publishMonetaryAmount(unrounded),
  };
}

function projectContractAmount(
  amount: AccruedByContract,
  elapsedPeriod: number,
  totalPeriod: number,
): AccruedByContract {
  const unrounded = projectForecastAmount(amount.unrounded, elapsedPeriod, totalPeriod);
  return {
    contractId: amount.contractId,
    currency: amount.currency,
    unrounded,
    published: publishMonetaryAmount(unrounded),
  };
}

/**
 * Authoritative Forecast Revenue (R2-E04 / P-E04-02).
 *
 * Accrued is the only business input. Invoice, Payment, Expected, and
 * Allocation are not inputs. Intermediates stay unrounded; publication uses
 * the existing R2-OD-002 rule.
 */
export function calculateForecastRevenue(
  accrued: AccruedRevenue,
  elapsedPeriod: number,
  totalPeriod: number,
): ForecastRevenue {
  return {
    period: accrued.period,
    timezone: accrued.timezone,
    elapsedPeriod,
    totalPeriod,
    byCurrency: accrued.byCurrency.map((row) =>
      projectPublishedAmount(row, elapsedPeriod, totalPeriod),
    ),
    byContract: accrued.byContract.map((row) =>
      projectContractAmount(row, elapsedPeriod, totalPeriod),
    ),
  };
}

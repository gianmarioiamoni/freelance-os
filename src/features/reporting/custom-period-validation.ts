// src/features/reporting/custom-period-validation.ts

export type CustomPeriodFieldErrors = {
  start?: string;
  end?: string;
};

/**
 * Validates Custom Range form fields as ISO calendar-date strings (YYYY-MM-DD).
 * Compares dates lexicographically — no Date / timezone conversion.
 */
export function validateCustomPeriodFields(
  start: string,
  end: string,
): CustomPeriodFieldErrors | null {
  const errors: CustomPeriodFieldErrors = {};

  if (!start) {
    errors.start = "Enter a start date.";
  }
  if (!end) {
    errors.end = "Enter an end date.";
  }
  if (start && end && start > end) {
    errors.end = "End date must be on or after the start date.";
  }

  return errors.start || errors.end ? errors : null;
}

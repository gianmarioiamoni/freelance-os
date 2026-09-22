// src/application/payments/paid-amount.ts
const ZERO_AMOUNT = "0";
const AMOUNT_SCALE = 4;

export function sumPaidAmount(amounts: readonly string[]): string {
  let total = BigInt(0);

  for (const amount of amounts) {
    total += toScaledInteger(amount, AMOUNT_SCALE);
  }

  if (total === BigInt(0)) {
    return ZERO_AMOUNT;
  }

  const factor = BigInt(10) ** BigInt(AMOUNT_SCALE);
  const whole = total / factor;
  const fraction = (total % factor).toString().padStart(AMOUNT_SCALE, "0");
  return `${whole}.${fraction}`;
}

function toScaledInteger(value: string, scale: number): bigint {
  const trimmed = value.trim();
  const unsigned = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  const [wholeRaw = "0", fractionRaw = ""] = unsigned.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  const fraction = fractionRaw.padEnd(scale, "0").slice(0, scale);
  return BigInt(`${whole}${fraction}`);
}

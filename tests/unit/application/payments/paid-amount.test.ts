// tests/unit/application/payments/paid-amount.test.ts
import { describe, expect, it } from "vitest";

import { sumPaidAmount } from "@/application/payments/paid-amount";

describe("sumPaidAmount", () => {
  it("returns 0 when there are no payments", () => {
    expect(sumPaidAmount([])).toBe("0");
  });

  it("sums Decimal(19,4) amounts without rounding drift", () => {
    expect(sumPaidAmount(["250.5000", "249.5000"])).toBe("500.0000");
    expect(sumPaidAmount(["0.0001", "0.0002"])).toBe("0.0003");
    expect(sumPaidAmount(["1500.0000"])).toBe("1500.0000");
  });
});

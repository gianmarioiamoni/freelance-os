// tests/unit/application/alerts/payment-alert-dedup-key.test.ts
import { describe, expect, it } from "vitest";

import {
  buildPaymentAlertDedupKey,
  buildPaymentRetriggerDedupKey,
} from "@/application/alerts/alert-dedup-key";

const workspaceId = "ws-abc";
const invoiceId = "invoice-xyz";

describe("buildPaymentAlertDedupKey", () => {
  it("produces invoice-scoped keys per type", () => {
    expect(buildPaymentAlertDedupKey("PAYMENT_PARTIAL", workspaceId, invoiceId)).toBe(
      "pp:ws-abc:invoice-xyz",
    );
    expect(buildPaymentAlertDedupKey("PAYMENT_OVERDUE", workspaceId, invoiceId)).toBe(
      "po:ws-abc:invoice-xyz",
    );
    expect(buildPaymentAlertDedupKey("PAYMENT_MISMATCH", workspaceId, invoiceId)).toBe(
      "pm:ws-abc:invoice-xyz",
    );
  });

  it("is deterministic and differs by workspace or invoice", () => {
    const key = buildPaymentAlertDedupKey("PAYMENT_PARTIAL", workspaceId, invoiceId);
    expect(buildPaymentAlertDedupKey("PAYMENT_PARTIAL", workspaceId, invoiceId)).toBe(key);
    expect(buildPaymentAlertDedupKey("PAYMENT_PARTIAL", "ws-B", invoiceId)).not.toBe(key);
    expect(buildPaymentAlertDedupKey("PAYMENT_PARTIAL", workspaceId, "invoice-2")).not.toBe(
      key,
    );
  });
});

describe("buildPaymentRetriggerDedupKey", () => {
  it("appends a timestamp suffix to the base key", () => {
    const createdAt = new Date("2026-09-15T10:00:00.000Z");
    const base = buildPaymentAlertDedupKey("PAYMENT_OVERDUE", workspaceId, invoiceId);
    const retrigger = buildPaymentRetriggerDedupKey(
      "PAYMENT_OVERDUE",
      workspaceId,
      invoiceId,
      createdAt,
    );

    expect(retrigger).toBe(`${base}:${createdAt.getTime()}`);
    expect(retrigger).not.toBe(base);
  });
});

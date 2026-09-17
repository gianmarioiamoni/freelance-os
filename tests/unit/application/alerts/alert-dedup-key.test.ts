// tests/unit/application/alerts/alert-dedup-key.test.ts
import { describe, expect, it } from "vitest";

import {
  buildContractAlertDedupKey,
  buildRetriggerDedupKey,
} from "@/application/alerts/alert-dedup-key";

const workspaceId = "ws-abc";
const contractId = "contract-xyz";
const periodStart = new Date("2026-09-01T00:00:00.000Z");

describe("buildContractAlertDedupKey", () => {
  it("produces correct key for CONTRACT_WARNING", () => {
    const key = buildContractAlertDedupKey(
      "CONTRACT_WARNING",
      workspaceId,
      contractId,
      periodStart,
    );
    expect(key).toBe("cw:ws-abc:contract-xyz:2026-09-01");
  });

  it("produces correct key for CONTRACT_EXCEEDED", () => {
    const key = buildContractAlertDedupKey(
      "CONTRACT_EXCEEDED",
      workspaceId,
      contractId,
      periodStart,
    );
    expect(key).toBe("ce:ws-abc:contract-xyz:2026-09-01");
  });

  it("is deterministic: same inputs produce identical keys", () => {
    const k1 = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart);
    const k2 = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart);
    expect(k1).toBe(k2);
  });

  it("differs for different alert types", () => {
    const w = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart);
    const e = buildContractAlertDedupKey("CONTRACT_EXCEEDED", workspaceId, contractId, periodStart);
    expect(w).not.toBe(e);
  });

  it("differs for different workspaces", () => {
    const k1 = buildContractAlertDedupKey("CONTRACT_WARNING", "ws-A", contractId, periodStart);
    const k2 = buildContractAlertDedupKey("CONTRACT_WARNING", "ws-B", contractId, periodStart);
    expect(k1).not.toBe(k2);
  });

  it("differs for different contracts", () => {
    const k1 = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, "contract-1", periodStart);
    const k2 = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, "contract-2", periodStart);
    expect(k1).not.toBe(k2);
  });

  it("differs for different periods", () => {
    const k1 = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, contractId, new Date("2026-09-01T00:00:00.000Z"));
    const k2 = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, contractId, new Date("2026-10-01T00:00:00.000Z"));
    expect(k1).not.toBe(k2);
  });

  it("uses YYYY-MM-DD date format in the key", () => {
    const key = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart);
    expect(key).toMatch(/2026-09-01$/);
  });
});

describe("buildRetriggerDedupKey", () => {
  it("produces a key different from the base key", () => {
    const createdAt = new Date("2026-09-15T10:00:00.000Z");
    const base = buildContractAlertDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart);
    const retrigger = buildRetriggerDedupKey(
      "CONTRACT_WARNING",
      workspaceId,
      contractId,
      periodStart,
      createdAt,
    );
    expect(retrigger).not.toBe(base);
    expect(retrigger).toContain(base);
  });

  it("is deterministic for the same createdAt timestamp", () => {
    const createdAt = new Date("2026-09-15T10:00:00.000Z");
    const k1 = buildRetriggerDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart, createdAt);
    const k2 = buildRetriggerDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart, createdAt);
    expect(k1).toBe(k2);
  });

  it("produces different keys for different createdAt timestamps", () => {
    const t1 = new Date("2026-09-15T10:00:00.000Z");
    const t2 = new Date("2026-09-15T10:00:01.000Z");
    const k1 = buildRetriggerDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart, t1);
    const k2 = buildRetriggerDedupKey("CONTRACT_WARNING", workspaceId, contractId, periodStart, t2);
    expect(k1).not.toBe(k2);
  });
});

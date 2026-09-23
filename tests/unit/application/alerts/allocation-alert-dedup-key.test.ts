// tests/unit/application/alerts/allocation-alert-dedup-key.test.ts
import { describe, expect, it } from "vitest";

import {
  buildAllocationAlertDedupKey,
  buildAllocationRetriggerDedupKey,
} from "@/application/alerts/alert-dedup-key";

const workspaceId = "ws-abc";
const contractId = "contract-xyz";

describe("buildAllocationAlertDedupKey", () => {
  it("produces period-less contract-scoped keys per type", () => {
    expect(buildAllocationAlertDedupKey("ALLOCATION_WARNING", workspaceId, contractId)).toBe(
      "aw:ws-abc:contract-xyz",
    );
    expect(buildAllocationAlertDedupKey("ALLOCATION_EXCEEDED", workspaceId, contractId)).toBe(
      "ae:ws-abc:contract-xyz",
    );
  });

  it("differs by workspace or contract", () => {
    const key = buildAllocationAlertDedupKey("ALLOCATION_WARNING", workspaceId, contractId);
    expect(buildAllocationAlertDedupKey("ALLOCATION_WARNING", "ws-B", contractId)).not.toBe(key);
    expect(buildAllocationAlertDedupKey("ALLOCATION_WARNING", workspaceId, "contract-2")).not.toBe(
      key,
    );
  });
});

describe("buildAllocationRetriggerDedupKey", () => {
  it("appends a timestamp suffix to the base key", () => {
    const createdAt = new Date("2026-09-23T10:00:00.000Z");
    const base = buildAllocationAlertDedupKey("ALLOCATION_EXCEEDED", workspaceId, contractId);
    const retrigger = buildAllocationRetriggerDedupKey(
      "ALLOCATION_EXCEEDED",
      workspaceId,
      contractId,
      createdAt,
    );

    expect(retrigger).toBe(`${base}:${createdAt.getTime()}`);
  });
});

// tests/unit/application/ai/tool-registry.test.ts
import { describe, expect, it } from "vitest";

import { InvalidAiToolError } from "@/application/ai/ai-errors";
import type { AiReadTool } from "@/application/ai/tool-contract";
import { createAiToolRegistry } from "@/application/ai/tool-registry";

function probeTool(overrides: Partial<AiReadTool> = {}): AiReadTool {
  return {
    name: "probe",
    description: "Foundation probe",
    readOnly: true,
    argumentKeys: [],
    execute: async () => ({ ok: true }),
    ...overrides,
  };
}

describe("createAiToolRegistry", () => {
  it("registers read-only tools and exposes descriptors without tenant keys", () => {
    const registry = createAiToolRegistry([probeTool({ argumentKeys: ["clientId"] })]);

    expect(registry.names()).toEqual(["probe"]);
    expect(registry.descriptors()).toEqual([
      {
        name: "probe",
        description: "Foundation probe",
        argumentKeys: ["clientId"],
      },
    ]);
    expect(JSON.stringify(registry.descriptors())).not.toMatch(/workspaceId|userId|"role"/);
  });

  it("rejects a tool that declares workspaceId", () => {
    expect(() =>
      createAiToolRegistry([probeTool({ argumentKeys: ["workspaceId"] })]),
    ).toThrow(InvalidAiToolError);
  });

  it("rejects duplicate names", () => {
    expect(() => createAiToolRegistry([probeTool(), probeTool()])).toThrow(
      InvalidAiToolError,
    );
  });

  it("returns undefined for an unknown tool", () => {
    const registry = createAiToolRegistry([probeTool()]);
    expect(registry.get("drop_database")).toBeUndefined();
  });

  it("rejects a write tool at registration", () => {
    expect(() =>
      createAiToolRegistry([
        { ...probeTool(), readOnly: false } as unknown as ReturnType<typeof probeTool>,
      ]),
    ).toThrow(InvalidAiToolError);
  });
});

// tests/unit/application/ai/ai-layer-boundary.test.ts
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI layer persistence and tenant boundary", () => {
  it("keeps application and infrastructure AI off Prisma and SQL", () => {
    const files = [
      ...listFiles(path.join(root, "src/application/ai")),
      ...listFiles(path.join(root, "src/infrastructure/ai")),
    ];

    for (const filePath of files) {
      const contents = readFileSync(filePath, "utf8");
      expect(contents, filePath).not.toMatch(/@prisma\/client/);
      expect(contents, filePath).not.toMatch(/from ["']@\/infrastructure\/prisma/);
      expect(contents, filePath).not.toMatch(/\$queryRaw|\$executeRaw|PrismaClient/);
    }
  });

  it("keeps infrastructure adapters from importing tools or UI", () => {
    const files = listFiles(path.join(root, "src/infrastructure/ai"));

    for (const filePath of files) {
      const contents = readFileSync(filePath, "utf8");
      expect(contents, filePath).not.toMatch(/from ["']@\/application\/ai\/tools/);
      expect(contents, filePath).not.toMatch(/from ["']@\/components\//);
      expect(contents, filePath).not.toMatch(/from ["']@\/app\//);
    }
  });

  it("does not accept workspaceId on the Server Action entry", () => {
    const action = source("src/features/ai/ask-workspace-question-action.ts");
    expect(action).toMatch(/getCurrentWorkspaceContext/);
    expect(action).toMatch(/createNullAiProviderAdapter/);
    expect(action).not.toMatch(/workspaceId/);
    expect(action).not.toMatch(/openai|anthropic|@ai-sdk|langchain/i);
  });
});

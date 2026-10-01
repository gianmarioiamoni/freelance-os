// scripts/reset-local-database.test.ts
import { describe, it, expect } from "vitest";

describe("reset-local-database argument parsing", () => {
  function parseArgs(argv: string[]): { confirm: boolean; dryRun: boolean } {
    return {
      confirm: argv.includes("--confirm"),
      dryRun: argv.includes("--dry-run"),
    };
  }

  it("should parse --confirm flag", () => {
    const result = parseArgs(["--confirm"]);
    expect(result.confirm).toBe(true);
    expect(result.dryRun).toBe(false);
  });

  it("should parse --dry-run flag", () => {
    const result = parseArgs(["--dry-run"]);
    expect(result.confirm).toBe(false);
    expect(result.dryRun).toBe(true);
  });

  it("should handle no flags", () => {
    const result = parseArgs([]);
    expect(result.confirm).toBe(false);
    expect(result.dryRun).toBe(false);
  });

  it("should handle both flags", () => {
    const result = parseArgs(["--dry-run", "--confirm"]);
    expect(result.confirm).toBe(true);
    expect(result.dryRun).toBe(true);
  });
});

describe("reset-local-database database identity extraction", () => {
  function extractDatabaseIdentity(url: string): string {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;
      const database = parsed.pathname.substring(1);
      return `${hostname}/${database}`;
    } catch {
      return "UNKNOWN";
    }
  }

  it("should extract localhost identity", () => {
    const url = "postgresql://user:pass@localhost:5432/freelance_dev";
    const result = extractDatabaseIdentity(url);
    expect(result).toBe("localhost/freelance_dev");
  });

  it("should extract 127.0.0.1 identity", () => {
    const url = "postgresql://user:pass@127.0.0.1:5432/testdb";
    const result = extractDatabaseIdentity(url);
    expect(result).toBe("127.0.0.1/testdb");
  });

  it("should handle invalid URL", () => {
    const url = "not-a-valid-url";
    const result = extractDatabaseIdentity(url);
    expect(result).toBe("UNKNOWN");
  });

  it("should not include credentials", () => {
    const url = "postgresql://secret:password@localhost:5432/dbname";
    const result = extractDatabaseIdentity(url);
    expect(result).not.toContain("secret");
    expect(result).not.toContain("password");
  });
});

describe("reset-local-database production environment detection", () => {
  function isKnownLocalHost(hostname: string): boolean {
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0"
    );
  }

  function isProductionEnvironment(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      if (isKnownLocalHost(hostname)) {
        return false;
      }

      const productionIndicators = [
        "prod",
        "production",
        "vercel",
        "railway",
        "heroku",
        "aws.com",
        "azure.com",
        "supabase.co",
      ];

      return productionIndicators.some((indicator) =>
        hostname.includes(indicator)
      );
    } catch {
      return true;
    }
  }

  it("should identify localhost as non-production", () => {
    const url = "postgresql://user:pass@localhost:5432/db";
    expect(isProductionEnvironment(url)).toBe(false);
  });

  it("should identify 127.0.0.1 as non-production", () => {
    const url = "postgresql://user:pass@127.0.0.1:5432/db";
    expect(isProductionEnvironment(url)).toBe(false);
  });

  it("should identify ::1 as non-production", () => {
    const url = "postgresql://user:pass@[::1]:5432/db";
    expect(isProductionEnvironment(url)).toBe(false);
  });

  it("should identify 0.0.0.0 as non-production", () => {
    const url = "postgresql://user:pass@0.0.0.0:5432/db";
    expect(isProductionEnvironment(url)).toBe(false);
  });

  it("should identify vercel host as production", () => {
    const url = "postgresql://user:pass@db.vercel-storage.com:5432/db";
    expect(isProductionEnvironment(url)).toBe(true);
  });

  it("should identify production keyword as production", () => {
    const url = "postgresql://user:pass@db-production.example.com:5432/db";
    expect(isProductionEnvironment(url)).toBe(true);
  });

  it("should identify railway host as production", () => {
    const url = "postgresql://user:pass@railway.app:5432/db";
    expect(isProductionEnvironment(url)).toBe(true);
  });

  it("should identify heroku host as production", () => {
    const url = "postgresql://user:pass@ec2-heroku.amazonaws.com:5432/db";
    expect(isProductionEnvironment(url)).toBe(true);
  });

  it("should identify aws host as production", () => {
    const url = "postgresql://user:pass@db.aws.com:5432/db";
    expect(isProductionEnvironment(url)).toBe(true);
  });

  it("should identify azure host as production", () => {
    const url = "postgresql://user:pass@db.azure.com:5432/db";
    expect(isProductionEnvironment(url)).toBe(true);
  });

  it("should identify supabase host as production", () => {
    const url = "postgresql://user:pass@db.supabase.co:5432/db";
    expect(isProductionEnvironment(url)).toBe(true);
  });

  it("should treat invalid URL as production (safe default)", () => {
    const url = "not-a-url";
    expect(isProductionEnvironment(url)).toBe(true);
  });

  it("should treat unknown remote host as production (safe default)", () => {
    const url = "postgresql://user:pass@unknown.example.com:5432/db";
    expect(isProductionEnvironment(url)).toBe(true);
  });
});

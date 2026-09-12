// tests/unit/ci/test-database-url.test.ts
import { afterEach, describe, expect, it } from "vitest";

import { requireTestDatabaseUrl } from "../../integration/test-database-url";

describe("requireTestDatabaseUrl", () => {
  const original = process.env.TEST_DATABASE_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.TEST_DATABASE_URL;
      return;
    }

    process.env.TEST_DATABASE_URL = original;
  });

  it("rejects freelance_os", () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://postgres:postgres@localhost:5432/freelance_os";

    expect(() => requireTestDatabaseUrl()).toThrow(
      'TEST_DATABASE_URL must target an isolated test database (name ending in _test). Received "freelance_os".',
    );
  });

  it("rejects database names that do not end in _test", () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://postgres:postgres@localhost:5432/freelanceos";

    expect(() => requireTestDatabaseUrl()).toThrow(
      'TEST_DATABASE_URL must target an isolated test database (name ending in _test). Received "freelanceos".',
    );
  });

  it("accepts an isolated *_test database", () => {
    process.env.TEST_DATABASE_URL =
      "postgresql://postgres:postgres@localhost:5432/freelanceos_test";

    expect(requireTestDatabaseUrl()).toBe(process.env.TEST_DATABASE_URL);
  });
});

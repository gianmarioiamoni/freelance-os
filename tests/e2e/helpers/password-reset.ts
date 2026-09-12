// tests/e2e/helpers/password-reset.ts
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadDatabaseUrlFromEnvFile(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  if (!existsSync(".env")) {
    return;
  }

  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(/^DATABASE_URL=(.*)$/);
    if (!match) {
      continue;
    }

    process.env.DATABASE_URL = match[1].replace(/^["']|["']$/g, "");
    return;
  }
}

export async function findPasswordResetTokenForEmail(
  email: string,
): Promise<string | null> {
  loadDatabaseUrlFromEnvFile();
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    const verification = await prisma.verification.findFirst({
      where: {
        value: user.id,
        identifier: { startsWith: "reset-password:" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return null;
    }

    return verification.identifier.slice("reset-password:".length);
  } finally {
    await prisma.$disconnect();
  }
}

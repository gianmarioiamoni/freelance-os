// tests/e2e/helpers/password-reset.ts
import { PrismaClient } from "@prisma/client";

import { requireTestDatabaseUrl } from "../../integration/test-database-url";

export async function findPasswordResetTokenForEmail(
  email: string,
): Promise<string | null> {
  const prisma = new PrismaClient({
    datasourceUrl: requireTestDatabaseUrl(),
  });

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

// prisma/better-auth.config.ts
// CLI-only Better Auth config. `auth generate` cannot load the
// server-only Infrastructure instance.
import { betterAuth } from "better-auth";

export const auth = betterAuth({});

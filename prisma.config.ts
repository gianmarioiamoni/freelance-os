// prisma.config.ts
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env explicitly before Prisma CLI runs
config();

export default defineConfig({
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

// scripts/capture-portfolio-screenshots.ts
// TEMPORARY script for portfolio screenshot acquisition
// Uses Playwright to capture real application screenshots with demo data

import { chromium, type Browser, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

const DEMO_EMAIL = "marco.demo@example.com";
const DEMO_PASSWORD = "Demo2024!Secure";
const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = join(process.cwd(), "artifacts/portfolio/freelanceos");

const VIEWPORT = { width: 1600, height: 1000 };

interface Screenshot {
  name: string;
  url: string;
  waitForSelector?: string;
  description: string;
}

const SCREENSHOTS: Screenshot[] = [
  {
    name: "01-dashboard.png",
    url: "/dashboard",
    waitForSelector: 'main',
    description: "Dashboard with KPIs, alerts, and activity overview",
  },
  {
    name: "02-time-tracking-week.png",
    url: "/time-tracking",
    waitForSelector: 'main',
    description: "Time tracking weekly view with entries",
  },
  {
    name: "03-time-tracking-day.png",
    url: "/time-tracking?view=day",
    waitForSelector: 'main',
    description: "Time tracking daily view with detailed entries",
  },
  {
    name: "04-clients.png",
    url: "/clients",
    waitForSelector: 'main',
    description: "Clients list with active and archived clients",
  },
  {
    name: "05-contracts.png",
    url: "/contracts",
    waitForSelector: 'main',
    description: "Contracts overview with billing models and commitments",
  },
  {
    name: "06-invoices.png",
    url: "/invoices",
    waitForSelector: 'main',
    description: "Invoices and payments tracking",
  },
  {
    name: "07-reports.png",
    url: "/reports",
    waitForSelector: 'main',
    description: "Reports and analytics",
  },
  {
    name: "08-notifications.png",
    url: "/notifications",
    waitForSelector: 'main',
    description: "System notifications and alerts",
  },
];

async function checkServerAvailability(): Promise<boolean> {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch {
    return false;
  }
}

async function login(page: Page): Promise<void> {
  console.log("  Navigating to sign-in...");
  await page.goto(`${BASE_URL}/sign-in`);
  await page.waitForLoadState("networkidle");

  console.log("  Filling credentials...");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);

  console.log("  Submitting login...");
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to dashboard or workspace selection
  await page.waitForURL(/\/(dashboard|workspace)/, { timeout: 10000 });
  console.log("  ✓ Login successful");
}

async function captureScreenshot(
  page: Page,
  screenshot: Screenshot
): Promise<boolean> {
  try {
    console.log(`\n  Capturing: ${screenshot.name}`);
    console.log(`    URL: ${screenshot.url}`);

    await page.goto(`${BASE_URL}${screenshot.url}`);
    await page.waitForLoadState("networkidle");

    // Wait for content to be visible
    if (screenshot.waitForSelector) {
      try {
        await page.waitForSelector(screenshot.waitForSelector, {
          timeout: 8000,
        });
      } catch {
        console.warn(`    Warning: Selector not found, continuing anyway`);
      }
    }

    // Additional wait for any animations/renders
    await page.waitForTimeout(2000);

    const outputPath = join(OUTPUT_DIR, screenshot.name);
    await page.screenshot({
      path: outputPath,
      fullPage: false,
    });

    console.log(`    ✓ Saved: ${screenshot.name}`);
    return true;
  } catch (error) {
    console.error(`    ✗ Failed: ${screenshot.name}`);
    console.error(`      Error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("=================================================");
  console.log("FreelanceOS Portfolio Screenshot Capture");
  console.log("=================================================\n");

  // Check server
  console.log("Checking server availability...");
  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    console.error("✗ Server not available at", BASE_URL);
    console.error("  Please ensure the application is running:");
    console.error("  pnpm dev");
    process.exit(1);
  }
  console.log("✓ Server is running\n");

  let browser: Browser | null = null;

  try {
    // Launch browser
    console.log("Launching browser...");
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    // Login
    console.log("\nAuthenticating with demo account...");
    await login(page);

    // Capture screenshots
    console.log("\nCapturing screenshots...");
    const results: Array<{ name: string; success: boolean }> = [];

    for (const screenshot of SCREENSHOTS) {
      const success = await captureScreenshot(page, screenshot);
      results.push({ name: screenshot.name, success });
    }

    // Close browser
    await browser.close();
    browser = null;

    // Summary
    console.log("\n=================================================");
    console.log("Capture Summary");
    console.log("=================================================\n");

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✓ Successful: ${successful.length}/${results.length}`);
    if (successful.length > 0) {
      successful.forEach((r) => console.log(`  - ${r.name}`));
    }

    if (failed.length > 0) {
      console.log(`\n✗ Failed: ${failed.length}/${results.length}`);
      failed.forEach((r) => console.log(`  - ${r.name}`));
    }

    console.log(`\nOutput directory: ${OUTPUT_DIR}`);

    if (failed.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("\nFatal error during screenshot capture:");
    console.error(error);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

main();

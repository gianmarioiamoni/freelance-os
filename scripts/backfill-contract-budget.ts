#!/usr/bin/env tsx
// scripts/backfill-contract-budget.ts

/**
 * One-shot backfill script to populate allocatedMinutes for existing contracts.
 *
 * Semantic:
 * - allocatedMinutes = total contract budget (lifetime).
 * - For finite contracts (validTo !== null), derive from monthlyContractedMinutes × duration.
 * - Explicit allocatedMinutes values are preserved (not overwritten).
 * - Ongoing contracts (validTo === null) remain null unless explicitly set.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-contract-budget.ts --dry-run
 *   pnpm tsx scripts/backfill-contract-budget.ts --execute
 */

import { PrismaClient } from "@prisma/client";

import { calculateContractAllocatedMinutes } from "@/domain/contract-budget";

type ContractRow = {
  id: string;
  clientId: string;
  validFrom: Date;
  validTo: Date | null;
  monthlyContractedMinutes: number | null;
  allocatedMinutes: number | null;
};

type BackfillAction =
  | { type: "skip"; reason: string }
  | { type: "calculate"; calculated: number }
  | { type: "keep-explicit"; current: number };

function analyzeContract(contract: ContractRow): BackfillAction {
  // Keep explicit allocatedMinutes (already set, authoritative)
  if (contract.allocatedMinutes !== null) {
    return { type: "keep-explicit", current: contract.allocatedMinutes };
  }

  // Cannot derive for ongoing contracts
  if (contract.validTo === null) {
    return { type: "skip", reason: "ongoing contract (validTo = null)" };
  }

  // Cannot derive without monthly capacity
  if (contract.monthlyContractedMinutes === null) {
    return { type: "skip", reason: "no monthlyContractedMinutes" };
  }

  // Calculate from monthly capacity × duration
  const calculated = calculateContractAllocatedMinutes(
    contract.validFrom,
    contract.validTo,
    contract.monthlyContractedMinutes,
  );

  if (calculated === null) {
    return { type: "skip", reason: "calculation returned null" };
  }

  return { type: "calculate", calculated };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");

  if (!dryRun && !execute) {
    console.error("Usage: pnpm tsx scripts/backfill-contract-budget.ts --dry-run|--execute");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    // Fetch all contracts
    const contracts = await prisma.contract.findMany({
      select: {
        id: true,
        clientId: true,
        validFrom: true,
        validTo: true,
        monthlyContractedMinutes: true,
        allocatedMinutes: true,
        client: {
          select: {
            companyName: true,
          },
        },
      },
      orderBy: [{ validFrom: "asc" }],
    });

    console.log(`\n📊 Analyzing ${contracts.length} contracts...\n`);

    const results = contracts.map((contract) => {
      const action = analyzeContract(contract);
      return {
        contract,
        action,
      };
    });

    // Group by action type
    const toCalculate = results.filter((r) => r.action.type === "calculate");
    const toKeep = results.filter((r) => r.action.type === "keep-explicit");
    const toSkip = results.filter((r) => r.action.type === "skip");

    // Display summary
    console.log("📋 SUMMARY");
    console.log("─".repeat(80));
    console.log(`Total contracts:     ${contracts.length}`);
    console.log(`Calculate budget:    ${toCalculate.length}`);
    console.log(`Keep explicit:       ${toKeep.length}`);
    console.log(`Skip (no change):    ${toSkip.length}`);
    console.log("");

    // Display contracts to calculate
    if (toCalculate.length > 0) {
      console.log("✅ CONTRACTS TO CALCULATE");
      console.log("─".repeat(80));
      for (const { contract, action } of toCalculate) {
        if (action.type !== "calculate") continue;
        const months =
          contract.validTo && contract.monthlyContractedMinutes
            ? Math.round(
                ((contract.validTo.getTime() - contract.validFrom.getTime()) /
                  (1000 * 60 * 60 * 24 * 30.44)),
              )
            : 0;
        console.log(`Contract: ${contract.id}`);
        console.log(`  Client: ${contract.client.companyName}`);
        console.log(`  Period: ${contract.validFrom.toISOString().slice(0, 10)} → ${contract.validTo?.toISOString().slice(0, 10)}`);
        console.log(`  Monthly capacity: ${contract.monthlyContractedMinutes}min (~${Math.round((contract.monthlyContractedMinutes || 0) / 60)}h)`);
        console.log(`  Duration: ~${months} months`);
        console.log(`  Current allocatedMinutes: null`);
        console.log(`  Calculated allocatedMinutes: ${action.calculated}min (~${Math.round(action.calculated / 60)}h)`);
        console.log("");
      }
    }

    // Display contracts to keep
    if (toKeep.length > 0) {
      console.log("⚪️ CONTRACTS WITH EXPLICIT BUDGET (keep as-is)");
      console.log("─".repeat(80));
      for (const { contract, action } of toKeep) {
        if (action.type !== "keep-explicit") continue;
        console.log(`Contract: ${contract.id}`);
        console.log(`  Client: ${contract.client.companyName}`);
        console.log(`  Explicit allocatedMinutes: ${action.current}min (~${Math.round(action.current / 60)}h)`);
        console.log("");
      }
    }

    // Display skipped contracts
    if (toSkip.length > 0) {
      console.log("⏭️  SKIPPED CONTRACTS");
      console.log("─".repeat(80));
      for (const { contract, action } of toSkip) {
        if (action.type !== "skip") continue;
        console.log(`Contract: ${contract.id}`);
        console.log(`  Client: ${contract.client.companyName}`);
        console.log(`  Reason: ${action.reason}`);
        console.log("");
      }
    }

    // Execute updates if not dry-run
    if (execute) {
      console.log("🚀 EXECUTING BACKFILL...");
      console.log("─".repeat(80));

      let updated = 0;

      await prisma.$transaction(async (tx) => {
        for (const { contract, action } of toCalculate) {
          if (action.type !== "calculate") continue;

          await tx.contract.update({
            where: { id: contract.id },
            data: { allocatedMinutes: action.calculated },
          });

          updated++;
          console.log(`✓ Updated contract ${contract.id} → ${action.calculated}min`);
        }
      });

      console.log("");
      console.log(`✅ Backfill complete. Updated ${updated} contracts.`);
    } else {
      console.log("🔍 DRY-RUN MODE (no changes made)");
      console.log("─".repeat(80));
      console.log(`Would update ${toCalculate.length} contracts.`);
      console.log("Run with --execute to apply changes.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Backfill failed:", error);
  process.exit(1);
});

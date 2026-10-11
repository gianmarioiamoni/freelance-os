// prisma/seed-demo.ts
// Demo seed for portfolio screenshots - ISOLATED LOCAL ONLY
// DO NOT run against production, Vercel, or Neon databases

import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient();

// Better Auth instance for seed (bypasses server-only module)
const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret: process.env.BETTER_AUTH_SECRET || "seed-demo-secret-for-local-only",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

// Demo credentials documented in DEMO-CREDENTIALS.md
const DEMO_OWNER_EMAIL = "marco.demo@example.com";
const DEMO_MEMBER_EMAIL = "lucia.demo@example.com";
const DEMO_PASSWORD = "Demo2024!Secure";

// Demo UUIDs
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const OWNER_USER_ID = "demo-owner-user-id";
const MEMBER_USER_ID = "demo-member-user-id";

const CLIENT_TECHVISION_ID = "22222222-2222-4222-8222-222222222211";
const CLIENT_DIGITALSPHERE_ID = "22222222-2222-4222-8222-222222222212";
const CLIENT_INNOVATECH_ID = "22222222-2222-4222-8222-222222222213";
const CLIENT_ARCHIVED_ID = "22222222-2222-4222-8222-222222222214";

const CONTRACT_TECHVISION_H1_ID = "22222222-2222-4222-8222-222222222311";
const CONTRACT_TECHVISION_D1_ID = "22222222-2222-4222-8222-222222222312";
const CONTRACT_DIGITALSPHERE_ID = "22222222-2222-4222-8222-222222222313";
const CONTRACT_INNOVATECH_ID = "22222222-2222-4222-8222-222222222314";
const CONTRACT_ARCHIVED_ID = "22222222-2222-4222-8222-222222222315";

const INVOICE_TECHVISION_1_ID = "22222222-2222-4222-8222-222222222411";
const INVOICE_TECHVISION_2_ID = "22222222-2222-4222-8222-222222222412";
const INVOICE_DIGITALSPHERE_ID = "22222222-2222-4222-8222-222222222413";
const INVOICE_INNOVATECH_ID = "22222222-2222-4222-8222-222222222414";
const INVOICE_VOIDED_ID = "22222222-2222-4222-8222-222222222415";

const PAYMENT_TECHVISION_1_FULL_ID = "22222222-2222-4222-8222-222222222511";
const PAYMENT_TECHVISION_2_PARTIAL_ID = "22222222-2222-4222-8222-222222222512";
const PAYMENT_DIGITALSPHERE_ID = "22222222-2222-4222-8222-222222222513";

const ALERT_WARNING_ID = "22222222-2222-4222-8222-222222222611";
const ALERT_EXCEEDED_ID = "22222222-2222-4222-8222-222222222612";
const ALERT_PAYMENT_OVERDUE_ID = "22222222-2222-4222-8222-222222222613";

const NOTIFICATION_WARNING_ID = "22222222-2222-4222-8222-222222222711";
const NOTIFICATION_EXCEEDED_ID = "22222222-2222-4222-8222-222222222712";
const NOTIFICATION_PAYMENT_ID = "22222222-2222-4222-8222-222222222713";

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isLocalEnvironment(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0"
    );
  } catch {
    return false;
  }
}

function isProductionEnvironment(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    const productionIndicators = [
      "prod",
      "production",
      "vercel",
      "neon",
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

interface TimeEntryInput {
  id: string;
  userId: string;
  clientId: string;
  contractId: string;
  workDate: Date;
  durationMinutes: number;
  description: string;
  billable: boolean;
}

const TIME_ENTRIES: TimeEntryInput[] = [
  // TechVision - Hourly contract (Jan-Jun 2026)
  {
    id: "22222222-2222-4222-8222-222222222801",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-01-15"),
    durationMinutes: 480,
    description: "Initial requirements gathering and system architecture design",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222802",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-01-22"),
    durationMinutes: 360,
    description: "Database schema design and API specification",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222803",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-02-05"),
    durationMinutes: 420,
    description: "Frontend component library setup and first pages implementation",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222804",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-02-18"),
    durationMinutes: 300,
    description: "Authentication system integration and security audit",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222805",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-03-10"),
    durationMinutes: 240,
    description: "Dashboard widgets and data visualization implementation",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222806",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-03-25"),
    durationMinutes: 180,
    description: "Internal team code review and refactoring session",
    billable: false,
  },
  {
    id: "22222222-2222-4222-8222-222222222807",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-04-08"),
    durationMinutes: 390,
    description: "REST API endpoints implementation and testing",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222808",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-04-22"),
    durationMinutes: 450,
    description: "Payment integration with external gateway and webhook handling",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222809",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-05-12"),
    durationMinutes: 360,
    description: "Performance optimization and load testing",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222810",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_H1_ID,
    workDate: date("2026-05-28"),
    durationMinutes: 240,
    description: "Final acceptance testing and production deployment support",
    billable: true,
  },

  // TechVision - Daily contract (Jul-Oct 2026)
  {
    id: "22222222-2222-4222-8222-222222222811",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-07-03"),
    durationMinutes: 480,
    description: "Ongoing maintenance and feature development",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222812",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-07-17"),
    durationMinutes: 480,
    description: "New module implementation for reporting feature",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222813",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-08-05"),
    durationMinutes: 480,
    description: "User feedback implementation and UX improvements",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222814",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-08-21"),
    durationMinutes: 180,
    description: "Emergency bugfix deployment",
    billable: false,
  },
  {
    id: "22222222-2222-4222-8222-222222222815",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-09-10"),
    durationMinutes: 480,
    description: "Infrastructure upgrade and security patches",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222816",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-09-25"),
    durationMinutes: 480,
    description: "Mobile responsive design implementation",
    billable: true,
  },

  // OCTOBER 2026 - Current month entries for dashboard visibility
  {
    id: "22222222-2222-4222-8222-222222222834",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-10-01"),
    durationMinutes: 480,
    description: "October sprint planning and backlog refinement",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222835",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-10-02"),
    durationMinutes: 450,
    description: "New feature implementation - user notifications system",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222836",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-10-03"),
    durationMinutes: 360,
    description: "E-commerce checkout flow optimization",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222837",
    userId: OWNER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-10-03"),
    durationMinutes: 240,
    description: "Database performance tuning and index optimization",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222838",
    userId: OWNER_USER_ID,
    clientId: CLIENT_INNOVATECH_ID,
    contractId: CONTRACT_INNOVATECH_ID,
    workDate: date("2026-10-04"),
    durationMinutes: 420,
    description: "Mobile API endpoints development and testing",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222839",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-10-07"),
    durationMinutes: 480,
    description: "Weekly status meeting and code review session",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222840",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-10-08"),
    durationMinutes: 390,
    description: "Payment gateway integration improvements",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222841",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-10-09"),
    durationMinutes: 480,
    description: "Feature deployment and production monitoring",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222842",
    userId: OWNER_USER_ID,
    clientId: CLIENT_INNOVATECH_ID,
    contractId: CONTRACT_INNOVATECH_ID,
    workDate: date("2026-10-10"),
    durationMinutes: 360,
    description: "API documentation and developer guides",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222843",
    userId: OWNER_USER_ID,
    clientId: CLIENT_TECHVISION_ID,
    contractId: CONTRACT_TECHVISION_D1_ID,
    workDate: date("2026-10-10"),
    durationMinutes: 120,
    description: "Team sync and planning for next sprint",
    billable: false,
  },

  // DigitalSphere - Historical entries
  {
    id: "22222222-2222-4222-8222-222222222817",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-02-10"),
    durationMinutes: 300,
    description: "E-commerce platform consultation and technical architecture",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222818",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-03-05"),
    durationMinutes: 360,
    description: "Shopping cart implementation with persistent state",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222819",
    userId: OWNER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-03-20"),
    durationMinutes: 240,
    description: "Product catalog migration and search optimization",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222820",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-04-15"),
    durationMinutes: 420,
    description: "Order management system and email notifications",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222821",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-05-08"),
    durationMinutes: 180,
    description: "Analytics dashboard for sales tracking",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222822",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-06-12"),
    durationMinutes: 270,
    description: "Inventory management integration",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222823",
    userId: OWNER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-07-08"),
    durationMinutes: 300,
    description: "Customer review system implementation",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222824",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_DIGITALSPHERE_ID,
    contractId: CONTRACT_DIGITALSPHERE_ID,
    workDate: date("2026-08-14"),
    durationMinutes: 240,
    description: "SEO optimization and meta tags management",
    billable: true,
  },

  // InnovaTech - Historical entries
  {
    id: "22222222-2222-4222-8222-222222222825",
    userId: OWNER_USER_ID,
    clientId: CLIENT_INNOVATECH_ID,
    contractId: CONTRACT_INNOVATECH_ID,
    workDate: date("2026-04-05"),
    durationMinutes: 360,
    description: "Mobile app API backend development",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222826",
    userId: OWNER_USER_ID,
    clientId: CLIENT_INNOVATECH_ID,
    contractId: CONTRACT_INNOVATECH_ID,
    workDate: date("2026-05-20"),
    durationMinutes: 420,
    description: "Real-time notification service with WebSocket",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222827",
    userId: OWNER_USER_ID,
    clientId: CLIENT_INNOVATECH_ID,
    contractId: CONTRACT_INNOVATECH_ID,
    workDate: date("2026-06-18"),
    durationMinutes: 300,
    description: "Third-party integrations and OAuth setup",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222828",
    userId: OWNER_USER_ID,
    clientId: CLIENT_INNOVATECH_ID,
    contractId: CONTRACT_INNOVATECH_ID,
    workDate: date("2026-07-22"),
    durationMinutes: 240,
    description: "Data synchronization logic and conflict resolution",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222829",
    userId: OWNER_USER_ID,
    clientId: CLIENT_INNOVATECH_ID,
    contractId: CONTRACT_INNOVATECH_ID,
    workDate: date("2026-08-28"),
    durationMinutes: 360,
    description: "Automated testing suite for API endpoints",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222830",
    userId: OWNER_USER_ID,
    clientId: CLIENT_INNOVATECH_ID,
    contractId: CONTRACT_INNOVATECH_ID,
    workDate: date("2026-09-15"),
    durationMinutes: 180,
    description: "Documentation and developer onboarding materials",
    billable: true,
  },

  // Archived client - historical data
  {
    id: "22222222-2222-4222-8222-222222222831",
    userId: OWNER_USER_ID,
    clientId: CLIENT_ARCHIVED_ID,
    contractId: CONTRACT_ARCHIVED_ID,
    workDate: date("2025-10-10"),
    durationMinutes: 240,
    description: "Legacy system migration analysis",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222832",
    userId: OWNER_USER_ID,
    clientId: CLIENT_ARCHIVED_ID,
    contractId: CONTRACT_ARCHIVED_ID,
    workDate: date("2025-11-15"),
    durationMinutes: 360,
    description: "Data migration execution and validation",
    billable: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222833",
    userId: OWNER_USER_ID,
    clientId: CLIENT_ARCHIVED_ID,
    contractId: CONTRACT_ARCHIVED_ID,
    workDate: date("2025-12-05"),
    durationMinutes: 180,
    description: "Project closeout and final documentation",
    billable: true,
  },
];

const CONTRACT_SNAPSHOTS: Record<
  string,
  {
    snapshotBillingModel: "HOURLY" | "DAILY";
    snapshotRate: string;
    snapshotCurrency: string;
  }
> = {
  [CONTRACT_TECHVISION_H1_ID]: {
    snapshotBillingModel: "HOURLY",
    snapshotRate: "95.0000",
    snapshotCurrency: "EUR",
  },
  [CONTRACT_TECHVISION_D1_ID]: {
    snapshotBillingModel: "DAILY",
    snapshotRate: "650.0000",
    snapshotCurrency: "EUR",
  },
  [CONTRACT_DIGITALSPHERE_ID]: {
    snapshotBillingModel: "HOURLY",
    snapshotRate: "75.0000",
    snapshotCurrency: "EUR",
  },
  [CONTRACT_INNOVATECH_ID]: {
    snapshotBillingModel: "HOURLY",
    snapshotRate: "85.0000",
    snapshotCurrency: "EUR",
  },
  [CONTRACT_ARCHIVED_ID]: {
    snapshotBillingModel: "HOURLY",
    snapshotRate: "60.0000",
    snapshotCurrency: "EUR",
  },
};

async function seedDemo(): Promise<void> {
  console.log("=================================================");
  console.log("FreelanceOS Demo Seed - Portfolio Screenshots");
  console.log("=================================================");
  console.log("");

  if (!isLocalEnvironment()) {
    console.error("ERROR: Not a local database environment.");
    console.error("       This seed only runs on localhost databases.");
    process.exit(1);
  }

  if (isProductionEnvironment()) {
    console.error("ERROR: Production environment detected.");
    console.error("       This seed cannot run against production databases.");
    process.exit(1);
  }

  console.log("Environment validation: PASSED");
  console.log("Database: LOCAL");
  console.log("");

  // Create demo users with Better Auth
  console.log("Creating demo users...");

  let ownerUserId: string;
  let memberUserId: string;

  try {
    const ownerResult = await auth.api.signUpEmail({
      body: {
        email: DEMO_OWNER_EMAIL,
        password: DEMO_PASSWORD,
        name: "Marco Rossi",
      },
    });
    ownerUserId = ownerResult.user.id;
    console.log(`  Owner account created: ${DEMO_OWNER_EMAIL}`);
  } catch (error: unknown) {
    const existingOwner = await prisma.user.findUnique({
      where: { email: DEMO_OWNER_EMAIL },
    });
    if (!existingOwner) {
      throw error;
    }
    ownerUserId = existingOwner.id;
    console.log(`  Owner account exists: ${DEMO_OWNER_EMAIL}`);
  }

  try {
    const memberResult = await auth.api.signUpEmail({
      body: {
        email: DEMO_MEMBER_EMAIL,
        password: DEMO_PASSWORD,
        name: "Lucia Bianchi",
      },
    });
    memberUserId = memberResult.user.id;
    console.log(`  Member account created: ${DEMO_MEMBER_EMAIL}`);
  } catch (error: unknown) {
    const existingMember = await prisma.user.findUnique({
      where: { email: DEMO_MEMBER_EMAIL },
    });
    if (!existingMember) {
      throw error;
    }
    memberUserId = existingMember.id;
    console.log(`  Member account exists: ${DEMO_MEMBER_EMAIL}`);
  }

  console.log("");
  console.log("Seeding workspace and members...");

  await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    create: {
      id: WORKSPACE_ID,
      name: "Demo Freelance Studio",
      timezone: "Europe/Rome",
      currency: "EUR",
    },
    update: {
      name: "Demo Freelance Studio",
      timezone: "Europe/Rome",
      currency: "EUR",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: WORKSPACE_ID, userId: ownerUserId },
    },
    create: {
      workspaceId: WORKSPACE_ID,
      userId: ownerUserId,
      role: "OWNER",
    },
    update: { role: "OWNER" },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: WORKSPACE_ID, userId: memberUserId },
    },
    create: {
      workspaceId: WORKSPACE_ID,
      userId: memberUserId,
      role: "MEMBER",
    },
    update: { role: "MEMBER" },
  });

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: WORKSPACE_ID },
    create: {
      workspaceId: WORKSPACE_ID,
      timezone: "Europe/Rome",
      currency: "EUR",
      contractWarningPercent: 75,
      monthlyCapacityWarningPercent: 85,
    },
    update: {
      timezone: "Europe/Rome",
      currency: "EUR",
      contractWarningPercent: 75,
      monthlyCapacityWarningPercent: 85,
    },
  });

  console.log("  Workspace created/updated");
  console.log("");
  console.log("Seeding clients...");

  await prisma.client.upsert({
    where: { id: CLIENT_TECHVISION_ID },
    create: {
      id: CLIENT_TECHVISION_ID,
      workspaceId: WORKSPACE_ID,
      companyName: "TechVision Solutions S.r.l.",
      vatNumber: "IT12345678901",
      taxCode: "12345678901",
      address: "Via Roma 123, 20121 Milano (MI)",
      contactName: "Giulia Verdi",
      email: "giulia.verdi@techvision.example",
      phone: "+39 02 1234567",
      notes: "Main client for web application development projects",
      status: "ACTIVE",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      companyName: "TechVision Solutions S.r.l.",
      vatNumber: "IT12345678901",
      taxCode: "12345678901",
      address: "Via Roma 123, 20121 Milano (MI)",
      contactName: "Giulia Verdi",
      email: "giulia.verdi@techvision.example",
      phone: "+39 02 1234567",
      notes: "Main client for web application development projects",
      status: "ACTIVE",
    },
  });

  await prisma.client.upsert({
    where: { id: CLIENT_DIGITALSPHERE_ID },
    create: {
      id: CLIENT_DIGITALSPHERE_ID,
      workspaceId: WORKSPACE_ID,
      companyName: "DigitalSphere Italia S.p.A.",
      vatNumber: "IT98765432109",
      taxCode: "98765432109",
      address: "Corso Vittorio Emanuele 456, 10123 Torino (TO)",
      contactName: "Paolo Neri",
      email: "p.neri@digitalsphere.example",
      phone: "+39 011 9876543",
      notes: "E-commerce platform and digital marketing solutions",
      status: "ACTIVE",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      companyName: "DigitalSphere Italia S.p.A.",
      vatNumber: "IT98765432109",
      taxCode: "98765432109",
      address: "Corso Vittorio Emanuele 456, 10123 Torino (TO)",
      contactName: "Paolo Neri",
      email: "p.neri@digitalsphere.example",
      phone: "+39 011 9876543",
      notes: "E-commerce platform and digital marketing solutions",
      status: "ACTIVE",
    },
  });

  await prisma.client.upsert({
    where: { id: CLIENT_INNOVATECH_ID },
    create: {
      id: CLIENT_INNOVATECH_ID,
      workspaceId: WORKSPACE_ID,
      companyName: "InnovaTech Labs S.r.l.",
      vatNumber: "IT55667788990",
      taxCode: "55667788990",
      address: "Via Giuseppe Garibaldi 789, 00185 Roma (RM)",
      contactName: "Elena Russo",
      email: "e.russo@innovatech.example",
      phone: "+39 06 5566778",
      notes: "Mobile application backend and API development",
      status: "ACTIVE",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      companyName: "InnovaTech Labs S.r.l.",
      vatNumber: "IT55667788990",
      taxCode: "55667788990",
      address: "Via Giuseppe Garibaldi 789, 00185 Roma (RM)",
      contactName: "Elena Russo",
      email: "e.russo@innovatech.example",
      phone: "+39 06 5566778",
      notes: "Mobile application backend and API development",
      status: "ACTIVE",
    },
  });

  await prisma.client.upsert({
    where: { id: CLIENT_ARCHIVED_ID },
    create: {
      id: CLIENT_ARCHIVED_ID,
      workspaceId: WORKSPACE_ID,
      companyName: "Vecchia Industria S.p.A.",
      vatNumber: "IT11223344556",
      status: "ARCHIVED",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      companyName: "Vecchia Industria S.p.A.",
      vatNumber: "IT11223344556",
      status: "ARCHIVED",
    },
  });

  console.log("  4 clients created/updated");
  console.log("");
  console.log("Seeding contracts...");

  await prisma.contract.upsert({
    where: { id: CONTRACT_TECHVISION_H1_ID },
    create: {
      id: CONTRACT_TECHVISION_H1_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_TECHVISION_ID,
      validFrom: date("2026-01-01"),
      validTo: date("2026-06-30"),
      billingModel: "HOURLY",
      rate: "95.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "55.00",
      allocatedMinutes: 34320, // 572 hours for 6 months at 55%
      paymentTermsDays: 30,
      paymentTermsNote: "Bank transfer within 30 days from invoice date",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_TECHVISION_ID,
      validFrom: date("2026-01-01"),
      validTo: date("2026-06-30"),
      billingModel: "HOURLY",
      rate: "95.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "55.00",
      allocatedMinutes: 34320,
      paymentTermsDays: 30,
      paymentTermsNote: "Bank transfer within 30 days from invoice date",
    },
  });

  await prisma.contract.upsert({
    where: { id: CONTRACT_TECHVISION_D1_ID },
    create: {
      id: CONTRACT_TECHVISION_D1_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_TECHVISION_ID,
      validFrom: date("2026-07-01"),
      validTo: null,
      billingModel: "DAILY",
      rate: "650.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "50.00",
      allocatedMinutes: null,
      paymentTermsDays: 30,
      paymentTermsNote: "Ongoing maintenance and feature development - daily rate",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_TECHVISION_ID,
      validFrom: date("2026-07-01"),
      validTo: null,
      billingModel: "DAILY",
      rate: "650.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "50.00",
      allocatedMinutes: null,
      paymentTermsDays: 30,
      paymentTermsNote: "Ongoing maintenance and feature development - daily rate",
    },
  });

  await prisma.contract.upsert({
    where: { id: CONTRACT_DIGITALSPHERE_ID },
    create: {
      id: CONTRACT_DIGITALSPHERE_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_DIGITALSPHERE_ID,
      validFrom: date("2026-02-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "75.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "30.00",
      allocatedMinutes: null,
      paymentTermsDays: 15,
      paymentTermsNote: "E-commerce platform consulting and development",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_DIGITALSPHERE_ID,
      validFrom: date("2026-02-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "75.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "30.00",
      allocatedMinutes: null,
      paymentTermsDays: 15,
      paymentTermsNote: "E-commerce platform consulting and development",
    },
  });

  await prisma.contract.upsert({
    where: { id: CONTRACT_INNOVATECH_ID },
    create: {
      id: CONTRACT_INNOVATECH_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_INNOVATECH_ID,
      validFrom: date("2026-04-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "85.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "25.00",
      allocatedMinutes: null,
      paymentTermsDays: 30,
      paymentTermsNote: "Mobile backend API development",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_INNOVATECH_ID,
      validFrom: date("2026-04-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "85.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "25.00",
      allocatedMinutes: null,
      paymentTermsDays: 30,
      paymentTermsNote: "Mobile backend API development",
    },
  });

  await prisma.contract.upsert({
    where: { id: CONTRACT_ARCHIVED_ID },
    create: {
      id: CONTRACT_ARCHIVED_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_ARCHIVED_ID,
      validFrom: date("2025-10-01"),
      validTo: date("2025-12-31"),
      billingModel: "HOURLY",
      rate: "60.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "15.00",
      allocatedMinutes: 7920, // 132 hours for 3 months at 15%
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_ARCHIVED_ID,
      validFrom: date("2025-10-01"),
      validTo: date("2025-12-31"),
      billingModel: "HOURLY",
      rate: "60.0000",
      currency: "EUR",
      commitmentMode: "PERCENTAGE",
      commitmentPercentage: "15.00",
      allocatedMinutes: 7920,
    },
  });

  console.log("  5 contracts created/updated");
  console.log("");
  console.log("Seeding time entries...");

  for (const entry of TIME_ENTRIES) {
    const snapshot = CONTRACT_SNAPSHOTS[entry.contractId];
    await prisma.timeEntry.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        workspaceId: WORKSPACE_ID,
        userId: entry.userId === OWNER_USER_ID ? ownerUserId : memberUserId,
        clientId: entry.clientId,
        contractId: entry.contractId,
        workDate: entry.workDate,
        durationMinutes: entry.durationMinutes,
        description: entry.description,
        billable: entry.billable,
        ...snapshot,
      },
      update: {
        workspaceId: WORKSPACE_ID,
        userId: entry.userId === OWNER_USER_ID ? ownerUserId : memberUserId,
        clientId: entry.clientId,
        contractId: entry.contractId,
        workDate: entry.workDate,
        durationMinutes: entry.durationMinutes,
        description: entry.description,
        billable: entry.billable,
        ...snapshot,
      },
    });
  }

  console.log(`  ${TIME_ENTRIES.length} time entries created/updated`);
  console.log("");
  console.log("Seeding invoices...");

  await prisma.invoice.upsert({
    where: { id: INVOICE_TECHVISION_1_ID },
    create: {
      id: INVOICE_TECHVISION_1_ID,
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_TECHVISION_H1_ID,
      invoiceDate: date("2026-03-31"),
      amount: "14250.00",
      currency: "EUR",
      reference: "FT-2026/001 - TechVision Q1 2026",
      paymentTermsDays: 30,
      dueDate: date("2026-04-30"),
      voidedAt: null,
    },
    update: {
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_TECHVISION_H1_ID,
      invoiceDate: date("2026-03-31"),
      amount: "14250.00",
      currency: "EUR",
      reference: "FT-2026/001 - TechVision Q1 2026",
      paymentTermsDays: 30,
      dueDate: date("2026-04-30"),
      voidedAt: null,
    },
  });

  await prisma.invoice.upsert({
    where: { id: INVOICE_TECHVISION_2_ID },
    create: {
      id: INVOICE_TECHVISION_2_ID,
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_TECHVISION_H1_ID,
      invoiceDate: date("2026-06-30"),
      amount: "12350.00",
      currency: "EUR",
      reference: "FT-2026/002 - TechVision Q2 2026",
      paymentTermsDays: 30,
      dueDate: date("2026-07-30"),
      voidedAt: null,
    },
    update: {
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_TECHVISION_H1_ID,
      invoiceDate: date("2026-06-30"),
      amount: "12350.00",
      currency: "EUR",
      reference: "FT-2026/002 - TechVision Q2 2026",
      paymentTermsDays: 30,
      dueDate: date("2026-07-30"),
      voidedAt: null,
    },
  });

  await prisma.invoice.upsert({
    where: { id: INVOICE_DIGITALSPHERE_ID },
    create: {
      id: INVOICE_DIGITALSPHERE_ID,
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_DIGITALSPHERE_ID,
      invoiceDate: date("2026-08-31"),
      amount: "7875.00",
      currency: "EUR",
      reference: "FT-2026/003 - DigitalSphere Development",
      paymentTermsDays: 15,
      dueDate: date("2026-09-15"),
      voidedAt: null,
    },
    update: {
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_DIGITALSPHERE_ID,
      invoiceDate: date("2026-08-31"),
      amount: "7875.00",
      currency: "EUR",
      reference: "FT-2026/003 - DigitalSphere Development",
      paymentTermsDays: 15,
      dueDate: date("2026-09-15"),
      voidedAt: null,
    },
  });

  await prisma.invoice.upsert({
    where: { id: INVOICE_INNOVATECH_ID },
    create: {
      id: INVOICE_INNOVATECH_ID,
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_INNOVATECH_ID,
      invoiceDate: date("2026-09-30"),
      amount: "6545.00",
      currency: "EUR",
      reference: "FT-2026/004 - InnovaTech Backend API",
      paymentTermsDays: 30,
      dueDate: date("2026-10-30"),
      voidedAt: null,
    },
    update: {
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_INNOVATECH_ID,
      invoiceDate: date("2026-09-30"),
      amount: "6545.00",
      currency: "EUR",
      reference: "FT-2026/004 - InnovaTech Backend API",
      paymentTermsDays: 30,
      dueDate: date("2026-10-30"),
      voidedAt: null,
    },
  });

  await prisma.invoice.upsert({
    where: { id: INVOICE_VOIDED_ID },
    create: {
      id: INVOICE_VOIDED_ID,
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_ARCHIVED_ID,
      invoiceDate: date("2025-12-31"),
      amount: "4680.00",
      currency: "EUR",
      reference: "FT-2025/999 - ANNULLATA (errore contabile)",
      paymentTermsDays: null,
      dueDate: null,
      voidedAt: new Date("2026-01-05T10:30:00.000Z"),
    },
    update: {
      workspaceId: WORKSPACE_ID,
      contractId: CONTRACT_ARCHIVED_ID,
      invoiceDate: date("2025-12-31"),
      amount: "4680.00",
      currency: "EUR",
      reference: "FT-2025/999 - ANNULLATA (errore contabile)",
      paymentTermsDays: null,
      dueDate: null,
      voidedAt: new Date("2026-01-05T10:30:00.000Z"),
    },
  });

  console.log("  5 invoices created/updated");
  console.log("");
  console.log("Seeding payments...");

  await prisma.payment.upsert({
    where: { id: PAYMENT_TECHVISION_1_FULL_ID },
    create: {
      id: PAYMENT_TECHVISION_1_FULL_ID,
      workspaceId: WORKSPACE_ID,
      invoiceId: INVOICE_TECHVISION_1_ID,
      paymentDate: date("2026-04-25"),
      amount: "14250.00",
      currency: "EUR",
      notes: "Bonifico bancario completo",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      invoiceId: INVOICE_TECHVISION_1_ID,
      paymentDate: date("2026-04-25"),
      amount: "14250.00",
      currency: "EUR",
      notes: "Bonifico bancario completo",
    },
  });

  await prisma.payment.upsert({
    where: { id: PAYMENT_TECHVISION_2_PARTIAL_ID },
    create: {
      id: PAYMENT_TECHVISION_2_PARTIAL_ID,
      workspaceId: WORKSPACE_ID,
      invoiceId: INVOICE_TECHVISION_2_ID,
      paymentDate: date("2026-07-20"),
      amount: "6000.00",
      currency: "EUR",
      notes: "Acconto parziale - saldo in attesa",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      invoiceId: INVOICE_TECHVISION_2_ID,
      paymentDate: date("2026-07-20"),
      amount: "6000.00",
      currency: "EUR",
      notes: "Acconto parziale - saldo in attesa",
    },
  });

  await prisma.payment.upsert({
    where: { id: PAYMENT_DIGITALSPHERE_ID },
    create: {
      id: PAYMENT_DIGITALSPHERE_ID,
      workspaceId: WORKSPACE_ID,
      invoiceId: INVOICE_DIGITALSPHERE_ID,
      paymentDate: date("2026-09-10"),
      amount: "7875.00",
      currency: "EUR",
      notes: "Pagamento completo nei termini",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      invoiceId: INVOICE_DIGITALSPHERE_ID,
      paymentDate: date("2026-09-10"),
      amount: "7875.00",
      currency: "EUR",
      notes: "Pagamento completo nei termini",
    },
  });

  console.log("  3 payments created/updated");
  console.log("");
  console.log("Seeding alerts...");

  await prisma.alert.upsert({
    where: { id: ALERT_WARNING_ID },
    create: {
      id: ALERT_WARNING_ID,
      workspaceId: WORKSPACE_ID,
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      clientId: CLIENT_TECHVISION_ID,
      contractId: CONTRACT_TECHVISION_D1_ID,
      periodStart: date("2026-09-01"),
      periodEnd: date("2026-10-01"),
      deduplicationKey: "demo:techvision-daily:warning:2026-09",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      clientId: CLIENT_TECHVISION_ID,
      contractId: CONTRACT_TECHVISION_D1_ID,
      periodStart: date("2026-09-01"),
      periodEnd: date("2026-10-01"),
      deduplicationKey: "demo:techvision-daily:warning:2026-09",
    },
  });

  await prisma.alert.upsert({
    where: { id: ALERT_EXCEEDED_ID },
    create: {
      id: ALERT_EXCEEDED_ID,
      workspaceId: WORKSPACE_ID,
      type: "CAPACITY_EXCEEDED",
      severity: "ERROR",
      clientId: null,
      contractId: null,
      periodStart: date("2026-08-01"),
      periodEnd: date("2026-09-01"),
      deduplicationKey: "demo:capacity:exceeded:2026-08",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      type: "CAPACITY_EXCEEDED",
      severity: "ERROR",
      clientId: null,
      contractId: null,
      periodStart: date("2026-08-01"),
      periodEnd: date("2026-09-01"),
      deduplicationKey: "demo:capacity:exceeded:2026-08",
    },
  });

  await prisma.alert.upsert({
    where: { id: ALERT_PAYMENT_OVERDUE_ID },
    create: {
      id: ALERT_PAYMENT_OVERDUE_ID,
      workspaceId: WORKSPACE_ID,
      type: "PAYMENT_OVERDUE",
      severity: "ERROR",
      clientId: CLIENT_INNOVATECH_ID,
      contractId: CONTRACT_INNOVATECH_ID,
      invoiceId: INVOICE_INNOVATECH_ID,
      periodStart: null,
      periodEnd: null,
      deduplicationKey: "demo:payment-overdue:innovatech:2026-10",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      type: "PAYMENT_OVERDUE",
      severity: "ERROR",
      clientId: CLIENT_INNOVATECH_ID,
      contractId: CONTRACT_INNOVATECH_ID,
      invoiceId: INVOICE_INNOVATECH_ID,
      periodStart: null,
      periodEnd: null,
      deduplicationKey: "demo:payment-overdue:innovatech:2026-10",
    },
  });

  console.log("  3 alerts created/updated");
  console.log("");
  console.log("Seeding notifications...");

  await prisma.notification.upsert({
    where: { id: NOTIFICATION_WARNING_ID },
    create: {
      id: NOTIFICATION_WARNING_ID,
      workspaceId: WORKSPACE_ID,
      userId: ownerUserId,
      alertId: ALERT_WARNING_ID,
      type: "ALERT",
      title: "Attenzione: soglia contratto raggiunta",
      body: "Il contratto TechVision (daily rate) ha raggiunto il 75% della capacità mensile.",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      userId: ownerUserId,
      alertId: ALERT_WARNING_ID,
      type: "ALERT",
      title: "Attenzione: soglia contratto raggiunta",
      body: "Il contratto TechVision (daily rate) ha raggiunto il 75% della capacità mensile.",
    },
  });

  await prisma.notification.upsert({
    where: { id: NOTIFICATION_EXCEEDED_ID },
    create: {
      id: NOTIFICATION_EXCEEDED_ID,
      workspaceId: WORKSPACE_ID,
      userId: ownerUserId,
      alertId: ALERT_EXCEEDED_ID,
      type: "ALERT",
      title: "Capacità mensile superata",
      body: "La capacità lavorativa complessiva di agosto è stata superata. Verifica i carichi di lavoro.",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      userId: ownerUserId,
      alertId: ALERT_EXCEEDED_ID,
      type: "ALERT",
      title: "Capacità mensile superata",
      body: "La capacità lavorativa complessiva di agosto è stata superata. Verifica i carichi di lavoro.",
    },
  });

  await prisma.notification.upsert({
    where: { id: NOTIFICATION_PAYMENT_ID },
    create: {
      id: NOTIFICATION_PAYMENT_ID,
      workspaceId: WORKSPACE_ID,
      userId: ownerUserId,
      alertId: ALERT_PAYMENT_OVERDUE_ID,
      type: "ALERT",
      title: "Pagamento in ritardo",
      body: "La fattura InnovaTech FT-2026/004 è scaduta. Contatta il cliente per sollecitare il pagamento.",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      userId: ownerUserId,
      alertId: ALERT_PAYMENT_OVERDUE_ID,
      type: "ALERT",
      title: "Pagamento in ritardo",
      body: "La fattura InnovaTech FT-2026/004 è scaduta. Contatta il cliente per sollecitare il pagamento.",
    },
  });

  console.log("  3 notifications created/updated");
  console.log("");
  console.log("=================================================");
  console.log("Demo seed completed successfully");
  console.log("=================================================");
  console.log("");
  console.log("Demo credentials:");
  console.log(`  Owner:  ${DEMO_OWNER_EMAIL}`);
  console.log(`  Member: ${DEMO_MEMBER_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log("");
  console.log("Workspace: Demo Freelance Studio");
  console.log("");
  console.log("Summary:");
  console.log("  - 2 demo users (owner + member)");
  console.log("  - 1 workspace with settings");
  console.log("  - 4 clients (3 active, 1 archived)");
  console.log("  - 5 contracts (hourly and daily rates)");
  console.log(`  - ${TIME_ENTRIES.length} time entries (incl. current month for dashboard)`);
  console.log("  - 5 invoices (4 active, 1 voided)");
  console.log("  - 3 payments (1 full, 1 partial, 1 full)");
  console.log("  - 3 alerts (warning, capacity, payment overdue)");
  console.log("  - 3 notifications");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Start the application: pnpm dev");
  console.log("  2. Login with demo credentials");
  console.log("  3. Explore the populated dashboard and features");
}

seedDemo()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("");
    console.error("ERROR during demo seed:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

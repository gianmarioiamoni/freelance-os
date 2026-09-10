// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_USER_ID = "seed-user-owner";
const MEMBER_USER_ID = "seed-user-member";

const CLIENT_NORTHWIND_ID = "11111111-1111-4111-8111-111111111211";
const CLIENT_CONTOSO_ID = "11111111-1111-4111-8111-111111111212";
const CLIENT_ARCHIVED_ID = "11111111-1111-4111-8111-111111111213";

const CONTRACT_NORTHWIND_H1_ID = "11111111-1111-4111-8111-111111111311";
const CONTRACT_NORTHWIND_D2_ID = "11111111-1111-4111-8111-111111111312";
const CONTRACT_CONTOSO_ID = "11111111-1111-4111-8111-111111111313";
const CONTRACT_ARCHIVED_ID = "11111111-1111-4111-8111-111111111314";

const ALERT_WARNING_ID = "11111111-1111-4111-8111-111111111411";
const ALERT_EXCEEDED_ID = "11111111-1111-4111-8111-111111111412";

const NOTIFICATION_WARNING_ID = "11111111-1111-4111-8111-111111111511";
const NOTIFICATION_EXCEEDED_ID = "11111111-1111-4111-8111-111111111512";

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

const TIME_ENTRIES = [
  {
    id: "11111111-1111-4111-8111-111111111601",
    userId: OWNER_USER_ID,
    clientId: CLIENT_NORTHWIND_ID,
    contractId: CONTRACT_NORTHWIND_H1_ID,
    workDate: date("2026-01-12"),
    durationMinutes: 240,
    description: "Seed: discovery workshop",
    billable: true,
  },
  {
    id: "11111111-1111-4111-8111-111111111602",
    userId: OWNER_USER_ID,
    clientId: CLIENT_NORTHWIND_ID,
    contractId: CONTRACT_NORTHWIND_H1_ID,
    workDate: date("2026-02-03"),
    durationMinutes: 360,
    description: "Seed: API integration",
    billable: true,
  },
  {
    id: "11111111-1111-4111-8111-111111111603",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_NORTHWIND_ID,
    contractId: CONTRACT_NORTHWIND_H1_ID,
    workDate: date("2026-03-18"),
    durationMinutes: 90,
    description: "Seed: internal review",
    billable: false,
  },
  {
    id: "11111111-1111-4111-8111-111111111604",
    userId: OWNER_USER_ID,
    clientId: CLIENT_NORTHWIND_ID,
    contractId: CONTRACT_NORTHWIND_D2_ID,
    workDate: date("2026-07-02"),
    durationMinutes: 480,
    description: "Seed: daily delivery",
    billable: true,
  },
  {
    id: "11111111-1111-4111-8111-111111111605",
    userId: OWNER_USER_ID,
    clientId: CLIENT_NORTHWIND_ID,
    contractId: CONTRACT_NORTHWIND_D2_ID,
    workDate: date("2026-07-15"),
    durationMinutes: 120,
    description: "Seed: non-billable support",
    billable: false,
  },
  {
    id: "11111111-1111-4111-8111-111111111606",
    userId: OWNER_USER_ID,
    clientId: CLIENT_CONTOSO_ID,
    contractId: CONTRACT_CONTOSO_ID,
    workDate: date("2026-01-20"),
    durationMinutes: 180,
    description: "Seed: dashboard work",
    billable: true,
  },
  {
    id: "11111111-1111-4111-8111-111111111607",
    userId: MEMBER_USER_ID,
    clientId: CLIENT_CONTOSO_ID,
    contractId: CONTRACT_CONTOSO_ID,
    workDate: date("2026-04-08"),
    durationMinutes: 300,
    description: "Seed: reporting pass",
    billable: true,
  },
  {
    id: "11111111-1111-4111-8111-111111111608",
    userId: OWNER_USER_ID,
    clientId: CLIENT_ARCHIVED_ID,
    contractId: CONTRACT_ARCHIVED_ID,
    workDate: date("2025-11-10"),
    durationMinutes: 150,
    description: "Seed: historical close-out",
    billable: true,
  },
] as const;

async function seed(): Promise<void> {
  await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    create: {
      id: WORKSPACE_ID,
      name: "Seed Workspace",
      timezone: "Europe/Rome",
      currency: "EUR",
    },
    update: {
      name: "Seed Workspace",
      timezone: "Europe/Rome",
      currency: "EUR",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: WORKSPACE_ID, userId: OWNER_USER_ID },
    },
    create: {
      workspaceId: WORKSPACE_ID,
      userId: OWNER_USER_ID,
      role: "OWNER",
    },
    update: { role: "OWNER" },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: WORKSPACE_ID, userId: MEMBER_USER_ID },
    },
    create: {
      workspaceId: WORKSPACE_ID,
      userId: MEMBER_USER_ID,
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
      contractWarningPercent: 80,
      monthlyCapacityWarningPercent: 80,
    },
    update: {
      timezone: "Europe/Rome",
      currency: "EUR",
      contractWarningPercent: 80,
      monthlyCapacityWarningPercent: 80,
    },
  });

  await prisma.client.upsert({
    where: { id: CLIENT_NORTHWIND_ID },
    create: {
      id: CLIENT_NORTHWIND_ID,
      workspaceId: WORKSPACE_ID,
      companyName: "Northwind Labs",
      vatNumber: "IT00000000001",
      status: "ACTIVE",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      companyName: "Northwind Labs",
      vatNumber: "IT00000000001",
      status: "ACTIVE",
    },
  });

  await prisma.client.upsert({
    where: { id: CLIENT_CONTOSO_ID },
    create: {
      id: CLIENT_CONTOSO_ID,
      workspaceId: WORKSPACE_ID,
      companyName: "Contoso Workshop",
      vatNumber: "IT00000000002",
      status: "ACTIVE",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      companyName: "Contoso Workshop",
      vatNumber: "IT00000000002",
      status: "ACTIVE",
    },
  });

  await prisma.client.upsert({
    where: { id: CLIENT_ARCHIVED_ID },
    create: {
      id: CLIENT_ARCHIVED_ID,
      workspaceId: WORKSPACE_ID,
      companyName: "Archived Transit Co",
      status: "ARCHIVED",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      companyName: "Archived Transit Co",
      status: "ARCHIVED",
    },
  });

  await prisma.contract.upsert({
    where: { id: CONTRACT_NORTHWIND_H1_ID },
    create: {
      id: CONTRACT_NORTHWIND_H1_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_NORTHWIND_ID,
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 8000,
      paymentTermsDays: 30,
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_NORTHWIND_ID,
      validFrom: date("2026-01-01"),
      validTo: date("2026-07-01"),
      billingModel: "HOURLY",
      rate: "80.0000",
      currency: "EUR",
      monthlyContractedMinutes: 8000,
      paymentTermsDays: 30,
    },
  });

  await prisma.contract.upsert({
    where: { id: CONTRACT_NORTHWIND_D2_ID },
    create: {
      id: CONTRACT_NORTHWIND_D2_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_NORTHWIND_ID,
      validFrom: date("2026-07-01"),
      validTo: null,
      billingModel: "DAILY",
      rate: "500.0000",
      currency: "EUR",
      monthlyContractedMinutes: 8000,
      paymentTermsDays: 30,
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_NORTHWIND_ID,
      validFrom: date("2026-07-01"),
      validTo: null,
      billingModel: "DAILY",
      rate: "500.0000",
      currency: "EUR",
      monthlyContractedMinutes: 8000,
      paymentTermsDays: 30,
    },
  });

  await prisma.contract.upsert({
    where: { id: CONTRACT_CONTOSO_ID },
    create: {
      id: CONTRACT_CONTOSO_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_CONTOSO_ID,
      validFrom: date("2026-01-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "65.0000",
      currency: "EUR",
      monthlyContractedMinutes: 6000,
      paymentTermsDays: 15,
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_CONTOSO_ID,
      validFrom: date("2026-01-01"),
      validTo: null,
      billingModel: "HOURLY",
      rate: "65.0000",
      currency: "EUR",
      monthlyContractedMinutes: 6000,
      paymentTermsDays: 15,
    },
  });

  await prisma.contract.upsert({
    where: { id: CONTRACT_ARCHIVED_ID },
    create: {
      id: CONTRACT_ARCHIVED_ID,
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_ARCHIVED_ID,
      validFrom: date("2025-01-01"),
      validTo: date("2026-01-01"),
      billingModel: "HOURLY",
      rate: "50.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4000,
    },
    update: {
      workspaceId: WORKSPACE_ID,
      clientId: CLIENT_ARCHIVED_ID,
      validFrom: date("2025-01-01"),
      validTo: date("2026-01-01"),
      billingModel: "HOURLY",
      rate: "50.0000",
      currency: "EUR",
      monthlyContractedMinutes: 4000,
    },
  });

  for (const entry of TIME_ENTRIES) {
    await prisma.timeEntry.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        workspaceId: WORKSPACE_ID,
        userId: entry.userId,
        clientId: entry.clientId,
        contractId: entry.contractId,
        workDate: entry.workDate,
        durationMinutes: entry.durationMinutes,
        description: entry.description,
        billable: entry.billable,
      },
      update: {
        workspaceId: WORKSPACE_ID,
        userId: entry.userId,
        clientId: entry.clientId,
        contractId: entry.contractId,
        workDate: entry.workDate,
        durationMinutes: entry.durationMinutes,
        description: entry.description,
        billable: entry.billable,
      },
    });
  }

  await prisma.alert.upsert({
    where: { id: ALERT_WARNING_ID },
    create: {
      id: ALERT_WARNING_ID,
      workspaceId: WORKSPACE_ID,
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      clientId: CLIENT_NORTHWIND_ID,
      contractId: CONTRACT_NORTHWIND_D2_ID,
      periodStart: date("2026-07-01"),
      periodEnd: date("2026-08-01"),
      deduplicationKey: "seed:northwind:contract-warning:2026-07",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      type: "CONTRACT_WARNING",
      severity: "WARNING",
      clientId: CLIENT_NORTHWIND_ID,
      contractId: CONTRACT_NORTHWIND_D2_ID,
      periodStart: date("2026-07-01"),
      periodEnd: date("2026-08-01"),
      deduplicationKey: "seed:northwind:contract-warning:2026-07",
    },
  });

  await prisma.alert.upsert({
    where: { id: ALERT_EXCEEDED_ID },
    create: {
      id: ALERT_EXCEEDED_ID,
      workspaceId: WORKSPACE_ID,
      type: "CONTRACT_EXCEEDED",
      severity: "ERROR",
      clientId: CLIENT_CONTOSO_ID,
      contractId: CONTRACT_CONTOSO_ID,
      periodStart: date("2026-04-01"),
      periodEnd: date("2026-05-01"),
      deduplicationKey: "seed:contoso:contract-exceeded:2026-04",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      type: "CONTRACT_EXCEEDED",
      severity: "ERROR",
      clientId: CLIENT_CONTOSO_ID,
      contractId: CONTRACT_CONTOSO_ID,
      periodStart: date("2026-04-01"),
      periodEnd: date("2026-05-01"),
      deduplicationKey: "seed:contoso:contract-exceeded:2026-04",
    },
  });

  await prisma.notification.upsert({
    where: { id: NOTIFICATION_WARNING_ID },
    create: {
      id: NOTIFICATION_WARNING_ID,
      workspaceId: WORKSPACE_ID,
      userId: OWNER_USER_ID,
      alertId: ALERT_WARNING_ID,
      type: "ALERT",
      title: "Northwind contract warning",
      body: "Seed notification for the Northwind July warning.",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      userId: OWNER_USER_ID,
      alertId: ALERT_WARNING_ID,
      type: "ALERT",
      title: "Northwind contract warning",
      body: "Seed notification for the Northwind July warning.",
    },
  });

  await prisma.notification.upsert({
    where: { id: NOTIFICATION_EXCEEDED_ID },
    create: {
      id: NOTIFICATION_EXCEEDED_ID,
      workspaceId: WORKSPACE_ID,
      userId: OWNER_USER_ID,
      alertId: ALERT_EXCEEDED_ID,
      type: "ALERT",
      title: "Contoso contract exceeded",
      body: "Seed notification for the Contoso exceeded alert.",
    },
    update: {
      workspaceId: WORKSPACE_ID,
      userId: OWNER_USER_ID,
      alertId: ALERT_EXCEEDED_ID,
      type: "ALERT",
      title: "Contoso contract exceeded",
      body: "Seed notification for the Contoso exceeded alert.",
    },
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ownerPassword = await bcrypt.hash("changeme123", 10);
  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    create: {
      email: "owner@example.com",
      passwordHash: ownerPassword,
      name: "Business Owner",
      role: "owner",
    },
    update: {},
  });

  const workerPassword = await bcrypt.hash("changeme123", 10);
  const worker = await prisma.user.upsert({
    where: { email: "worker@example.com" },
    create: {
      email: "worker@example.com",
      passwordHash: workerPassword,
      name: "Sample Field Worker",
      role: "field_worker",
      hourlyRate: 45,
    },
    update: {},
  });

  const job = await prisma.job.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "123 Example St Renovation",
      clientName: "Sample Client",
      address: "123 Example St",
      lat: -37.8136,
      lng: 144.9631,
      status: "active",
    },
    update: {},
  });

  await prisma.jobAssignment.upsert({
    where: { jobId_userId: { jobId: job.id, userId: worker.id } },
    create: { jobId: job.id, userId: worker.id },
    update: {},
  });

  await prisma.budgetLine.upsert({
    where: { jobId_category: { jobId: job.id, category: "labour" } },
    create: { jobId: job.id, category: "labour", budgetedAmount: 8000 },
    update: {},
  });
  await prisma.budgetLine.upsert({
    where: { jobId_category: { jobId: job.id, category: "materials" } },
    create: { jobId: job.id, category: "materials", budgetedAmount: 12000 },
    update: {},
  });

  console.log("Seeded:", { owner: owner.email, worker: worker.email, job: job.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

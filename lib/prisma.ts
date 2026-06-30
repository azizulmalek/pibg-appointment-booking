import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "") ?? "./dev.db";
  const url = dbPath.startsWith("/") ? dbPath : dbPath.replace(/^\.\//, "");
  const adapter = new PrismaBetterSqlite3({ url: `file:${url}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

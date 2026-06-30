import { prisma } from "./prisma";

export async function logAudit(params: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  await prisma.auditLog.create({ data: params });
}

export async function getRecentAuditLogs(limit = 20) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true, role: true } } },
  });
}

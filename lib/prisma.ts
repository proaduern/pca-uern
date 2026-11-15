import { PrismaClient } from "@prisma/client";

function otimizarDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("neon.tech") && !url.hostname.includes("-pooler")) {
      url.hostname = url.hostname.replace(/^([^.]+)/, "$1-pooler");
    }
    if (url.hostname.includes("-pooler")) {
      if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
      if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
      if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
      if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const pooledUrl = otimizarDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
export default prisma;

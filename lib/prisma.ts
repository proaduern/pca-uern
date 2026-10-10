import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // Se já define schema explicitamente, mantém
  if (url.includes("schema=")) return url;
  // Garante que o isolamento do schema 'pca' seja sempre respeitado mesmo se a variável no Vercel vier sem o parâmetro
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}schema=pca`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  (dbUrl
    ? new PrismaClient({
        datasources: {
          db: { url: dbUrl },
        },
      })
    : new PrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

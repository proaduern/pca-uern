import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawUrl = process.env.DATABASE_URL || "";
    let parsedInfo: any = {};
    try {
      const u = new URL(rawUrl);
      parsedInfo = {
        protocol: u.protocol,
        username: u.username,
        host: u.host,
        pathname: u.pathname,
        schemaParam: u.searchParams.get("schema"),
        search: u.search
      };
    } catch (e: any) {
      parsedInfo = { parseError: e.message };
    }

    const dbInfo: any = await prisma.$queryRawUnsafe(`
      SELECT current_database(), current_schema(), version();
    `);

    // Total DFDs e DFDs 2027
    const totalDfds = await prisma.dfd.count();
    const totalDfds2027 = await prisma.dfd.count({ where: { ano: 2027 } });

    // 10 DFDs mais recentemente atualizados
    const recentesDfds = await prisma.dfd.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        numero: true,
        ano: true,
        descricaoSumaria: true,
        updatedAt: true,
        unidadeId: true
      }
    });

    // 10 Itens mais recentemente atualizados
    const recentesItens = await prisma.itemDfd.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        dfdId: true,
        descricao: true,
        valorTotal: true,
        quantidade: true,
        updatedAt: true
      }
    });

    // Amostra de DFDs de Obras / Serviços TI / Locação
    const amostraTitulos = await prisma.dfd.findMany({
      where: {
        ano: 2027,
        OR: [
          { descricaoSumaria: { contains: "Obra", mode: "insensitive" } },
          { descricaoSumaria: { contains: "Locação", mode: "insensitive" } },
          { descricaoSumaria: { contains: "TI", mode: "insensitive" } }
        ]
      },
      take: 10,
      select: {
        id: true,
        numero: true,
        descricaoSumaria: true
      }
    });

    return NextResponse.json({
      parsedInfo,
      rawUrlPreview: rawUrl.slice(0, 30) + "..." + rawUrl.slice(-20),
      dbInfo,
      totalDfds,
      totalDfds2027,
      recentesDfds,
      recentesItens,
      amostraTitulos
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

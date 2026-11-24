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

    // DFDs atualizados recentemente
    const recentesDfds = await prisma.dfd.findMany({
      where: { ano: 2027 },
      orderBy: { updatedAt: "desc" },
      take: 15,
      select: {
        id: true,
        numero: true,
        ano: true,
        descricaoSumaria: true,
        updatedAt: true,
        unidade: { select: { id: true, nome: true } }
      }
    });

    // Diagnosticar alterações manuais do usuário:
    // 1. Coffee Break 200 Pessoas / R$ 6.800
    const coffeeBreakItens = await prisma.itemDfd.findMany({
      where: {
        OR: [
          { itemNomeLivre: { contains: "Coffee", mode: "insensitive" } },
          { itemCatalogoNome: { contains: "Coffee", mode: "insensitive" } },
          { valorUnit: 6800 },
          { valorTotal: 6800 }
        ]
      },
      select: {
        id: true,
        dfdId: true,
        itemCatalogoNome: true,
        itemNomeLivre: true,
        quantidade: true,
        valorUnit: true,
        valorTotal: true,
        dfd: { select: { id: true, numero: true, descricaoSumaria: true, unidade: { select: { nome: true } } } }
      }
    });

    // 2. UERNTV / Comissão de Rádio e TV
    const uerntvDfds = await prisma.dfd.findMany({
      where: {
        OR: [
          { descricaoSumaria: { contains: "UERN", mode: "insensitive" } },
          { descricaoSumaria: { contains: "TV", mode: "insensitive" } },
          { descricaoSumaria: { contains: "Rádio", mode: "insensitive" } },
          { unidade: { nome: { contains: "Rádio", mode: "insensitive" } } },
          { unidade: { nome: { contains: "TV", mode: "insensitive" } } }
        ]
      },
      select: {
        id: true,
        numero: true,
        descricaoSumaria: true,
        unidade: { select: { id: true, nome: true } },
        itens: {
          select: {
            id: true,
            itemNomeLivre: true,
            itemCatalogoNome: true,
            valorTotal: true
          }
        }
      }
    });

    // 3. PROPEG TI / 570k
    const propegDfds = await prisma.dfd.findMany({
      where: {
        ano: 2027,
        unidade: { nome: { contains: "PROPEG", mode: "insensitive" } }
      },
      select: {
        id: true,
        numero: true,
        descricaoSumaria: true,
        itens: {
          select: {
            id: true,
            itemNomeLivre: true,
            itemCatalogoNome: true,
            valorTotal: true
          }
        }
      }
    });

    // 4. Caneta PROEX
    const proexCaneta = await prisma.itemDfd.findMany({
      where: {
        dfd: { ano: 2027, unidade: { nome: { contains: "PROEX", mode: "insensitive" } } },
        OR: [
          { itemNomeLivre: { contains: "Caneta", mode: "insensitive" } },
          { itemCatalogoNome: { contains: "Caneta", mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        dfdId: true,
        itemNomeLivre: true,
        itemCatalogoNome: true,
        quantidade: true,
        valorUnit: true,
        valorTotal: true
      }
    });

    // 5. Amostra de DFDs de Obras / TI / Locação (para checar se o objeto está no título)
    const amostraObrasTiLocacao = await prisma.dfd.findMany({
      where: {
        ano: 2027,
        OR: [
          { descricaoSumaria: { contains: "Obra", mode: "insensitive" } },
          { descricaoSumaria: { contains: "Locação", mode: "insensitive" } },
          { descricaoSumaria: { contains: "Tecnologia", mode: "insensitive" } },
          { descricaoSumaria: { contains: "Engenharia", mode: "insensitive" } }
        ]
      },
      take: 10,
      select: {
        id: true,
        numero: true,
        descricaoSumaria: true,
        unidade: { select: { nome: true } }
      }
    });

    // 6. Centro Cultural
    const centroCultural = await prisma.itemDfd.findMany({
      where: {
        OR: [
          { itemNomeLivre: { contains: "Centro Cultural", mode: "insensitive" } },
          { itemCatalogoNome: { contains: "Centro Cultural", mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        dfdId: true,
        itemNomeLivre: true,
        dfd: {
          select: {
            id: true,
            numero: true,
            descricaoSumaria: true,
            unidade: { select: { nome: true } }
          }
        }
      }
    });

    return NextResponse.json({
      parsedInfo,
      dbInfo,
      totalDfds,
      totalDfds2027,
      recentesDfds,
      coffeeBreakItens,
      uerntvDfds,
      propegDfds,
      proexCaneta,
      amostraObrasTiLocacao,
      centroCultural
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

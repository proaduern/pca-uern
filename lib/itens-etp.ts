"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { ResultadoAcao } from "@/lib/actions/tipos";

export interface ItemEtpDto {
  id: string;
  ordem: number;
  item: string;
  especificacaoCompleta: string | null;
  quantidade: number;
  unidadeMedida: string;
  valorUnitarioEstimado: number;
  valorTotalEstimado: number;
  divisivel: boolean;
  tipoBem: "CONSUMO" | "PERMANENTE" | null;
  unidadesDemandantes: string | null;
  catmatOuCatser: string | null;
  observacoes: string | null;
}

/**
 * Obtém os itens consolidados do ETP ou os inicializa a partir dos
 * DFDs Consolidados e Itens Técnicos caso ainda não tenham sido gerados.
 */
export async function obterOuInicializarItensEtp(
  consolidacaoId: string,
): Promise<ItemEtpDto[]> {
  const existentes = await prisma.itemEtp.findMany({
    where: { consolidacaoTecnicaId: consolidacaoId },
    orderBy: { ordem: "asc" },
  });

  if (existentes.length > 0) {
    return existentes.map((it) => ({
      id: it.id,
      ordem: it.ordem,
      item: it.item,
      especificacaoCompleta: it.especificacaoCompleta,
      quantidade: Number(it.quantidade),
      unidadeMedida: it.unidadeMedida,
      valorUnitarioEstimado: Number(it.valorUnitarioEstimado),
      valorTotalEstimado: Number(it.valorTotalEstimado),
      divisivel: it.divisivel,
      tipoBem: it.tipoBem,
      unidadesDemandantes: it.unidadesDemandantes,
      catmatOuCatser: it.catmatOuCatser,
      observacoes: it.observacoes,
    }));
  }

  // Inicializa a partir de itensDfd + itensTecnicos
  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      itensDfd: {
        include: {
          dfd: { include: { unidade: true } },
          categoria: true,
        },
      },
      itensTecnicos: true,
    },
  });

  if (!consolidacao) return [];

  // Agrupa itens do DFD por nome para consolidar quantidades e rastrear demandantes
  const mapa = new Map<
    string,
    {
      nome: string;
      quantidade: number;
      valorUnit: number;
      tipoBem: "CONSUMO" | "PERMANENTE" | null;
      unidades: Set<string>;
    }
  >();

  for (const it of consolidacao.itensDfd) {
    const nome = (it.itemCatalogoNome ?? it.itemNomeLivre ?? it.categoria.nome).trim();
    const atual = mapa.get(nome) ?? {
      nome,
      quantidade: 0,
      valorUnit: it.valorUnit != null ? Number(it.valorUnit) : 0,
      tipoBem: it.tipoBem ?? null,
      unidades: new Set<string>(),
    };
    atual.quantidade += Number(it.quantidade ?? 1);
    if (!atual.valorUnit && it.valorUnit != null) {
      atual.valorUnit = Number(it.valorUnit);
    }
    if (it.dfd?.unidade) {
      const u = it.dfd.unidade;
      atual.unidades.add(u.nome);
    }
    mapa.set(nome, atual);
  }

  for (const it of consolidacao.itensTecnicos) {
    const nome = it.item.trim();
    const atual = mapa.get(nome) ?? {
      nome,
      quantidade: 0,
      valorUnit: Number(it.valorUnit),
      tipoBem: it.tipoBem,
      unidades: new Set<string>(),
    };
    atual.quantidade += Number(it.quantidade);
    atual.unidades.add("Setor Técnico");
    mapa.set(nome, atual);
  }

  const criados: ItemEtpDto[] = [];
  let ordem = 0;

  for (const [, val] of mapa.entries()) {
    const valorTotal = Number((val.quantidade * val.valorUnit).toFixed(2));
    const demandantes = [...val.unidades].join(", ");

    const registro = await prisma.itemEtp.create({
      data: {
        consolidacaoTecnicaId: consolidacaoId,
        ordem: ordem++,
        item: val.nome,
        especificacaoCompleta: val.nome,
        quantidade: val.quantidade,
        unidadeMedida: "UN",
        valorUnitarioEstimado: val.valorUnit,
        valorTotalEstimado: valorTotal,
        divisivel: consolidacao.categoria.tipo === "MATERIAL",
        tipoBem: val.tipoBem,
        unidadesDemandantes: demandantes,
      },
    });

    criados.push({
      id: registro.id,
      ordem: registro.ordem,
      item: registro.item,
      especificacaoCompleta: registro.especificacaoCompleta,
      quantidade: Number(registro.quantidade),
      unidadeMedida: registro.unidadeMedida,
      valorUnitarioEstimado: Number(registro.valorUnitarioEstimado),
      valorTotalEstimado: Number(registro.valorTotalEstimado),
      divisivel: registro.divisivel,
      tipoBem: registro.tipoBem,
      unidadesDemandantes: registro.unidadesDemandantes,
      catmatOuCatser: registro.catmatOuCatser,
      observacoes: registro.observacoes,
    });
  }

  return criados;
}

/**
 * Salva a lista de itens do ETP após edições pelo Setor Técnico
 */
export async function salvarItensEtpAction(
  consolidacaoId: string,
  itens: Array<{
    id?: string;
    item: string;
    especificacaoCompleta?: string;
    quantidade: number;
    unidadeMedida: string;
    valorUnitarioEstimado: number;
    divisivel: boolean;
    unidadesDemandantes?: string;
    catmatOuCatser?: string;
  }>,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao || !["ADMIN", "SETOR_TECNICO", "LICITACOES"].includes(sessao.tipo)) {
    return { erro: "Não autorizado." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Deleta itens existentes para recriar ordenadamente
      await tx.itemEtp.deleteMany({
        where: { consolidacaoTecnicaId: consolidacaoId },
      });

      let ordem = 0;
      for (const it of itens) {
        const qtd = Number(it.quantidade) || 1;
        const vUnit = Number(it.valorUnitarioEstimado) || 0;
        const vTotal = Number((qtd * vUnit).toFixed(2));

        await tx.itemEtp.create({
          data: {
            consolidacaoTecnicaId: consolidacaoId,
            ordem: ordem++,
            item: it.item.trim(),
            especificacaoCompleta: it.especificacaoCompleta?.trim() || it.item.trim(),
            quantidade: qtd,
            unidadeMedida: (it.unidadeMedida || "UN").trim().toUpperCase(),
            valorUnitarioEstimado: vUnit,
            valorTotalEstimado: vTotal,
            divisivel: it.divisivel !== false,
            unidadesDemandantes: it.unidadesDemandantes?.trim() || null,
            catmatOuCatser: it.catmatOuCatser?.trim() || null,
          },
        });
      }
    });

    revalidatePath(`/consolidacao/[categoriaId]/etp/${consolidacaoId}`);
    revalidatePath(`/agente-contratacao/${consolidacaoId}`);
    revalidatePath(`/planejamento/${consolidacaoId}`);
    revalidatePath(`/licitacoes/${consolidacaoId}`);
    return {};
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao salvar itens do ETP." };
  }
}

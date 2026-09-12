"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSetorTecnico } from "@/lib/auth";
import { agruparPorCategoriaEItem } from "@/lib/consolidacao";

async function obterCategoriaDoSetorOuErro(categoriaId: string, setorTecnicoId: string) {
  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria || categoria.setorTecnicoId !== setorTecnicoId) {
    throw new Error("Esta categoria não está atribuída ao seu setor técnico.");
  }
  return categoria;
}

/**
 * Gera/atualiza a consolidação de uma categoria a partir dos itens de DFDs
 * aprovados que ainda não foram consolidados. Nunca altera uma linha já
 * aprovada — um item novo cuja chave bate com uma linha aprovada cai numa
 * linha rascunho separada, pra não mudar em silêncio algo já revisado.
 */
export async function atualizarConsolidacaoAction(categoriaId: string, pcaAno: number) {
  const sessao = await exigirSetorTecnico();
  await obterCategoriaDoSetorOuErro(categoriaId, sessao.id);

  const itensPendentes = await prisma.itemDfd.findMany({
    where: {
      categoriaId,
      itemConsolidadoId: null,
      dfd: { ano: pcaAno, status: "APROVADO" },
    },
  });

  if (itensPendentes.length === 0) {
    return { criados: 0, atualizados: 0 };
  }

  const grupos = agruparPorCategoriaEItem(
    itensPendentes.map((it) => ({
      id: it.id,
      categoriaId: it.categoriaId,
      nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      quantidade: Number(it.quantidade ?? 1),
      valorTotal: Number(it.valorTotal),
    })),
  );

  let criados = 0;
  let atualizados = 0;

  for (const grupo of grupos) {
    const rascunhoExistente = await prisma.itemConsolidado.findFirst({
      where: {
        pcaAno,
        categoriaId: grupo.categoriaId,
        chaveAgrupamento: grupo.chaveAgrupamento,
        status: "RASCUNHO",
      },
    });

    if (rascunhoExistente) {
      await prisma.$transaction([
        prisma.itemConsolidado.update({
          where: { id: rascunhoExistente.id },
          data: {
            quantidadeTotal: { increment: grupo.quantidadeTotal },
            valorTotal: { increment: grupo.valorTotal },
          },
        }),
        prisma.itemDfd.updateMany({
          where: { id: { in: grupo.itemDfdIds } },
          data: { itemConsolidadoId: rascunhoExistente.id },
        }),
      ]);
      atualizados++;
    } else {
      const novo = await prisma.itemConsolidado.create({
        data: {
          pcaAno,
          categoriaId: grupo.categoriaId,
          chaveAgrupamento: grupo.chaveAgrupamento,
          nomeItem: grupo.nomeItem,
          quantidadeTotal: grupo.quantidadeTotal,
          valorTotal: grupo.valorTotal,
        },
      });
      await prisma.itemDfd.updateMany({
        where: { id: { in: grupo.itemDfdIds } },
        data: { itemConsolidadoId: novo.id },
      });
      criados++;
    }
  }

  revalidatePath(`/consolidacao/${categoriaId}`);
  return { criados, atualizados };
}

export async function renomearConsolidadoAction(itemConsolidadoId: string, novoNome: string) {
  const sessao = await exigirSetorTecnico();
  const item = await prisma.itemConsolidado.findUniqueOrThrow({ where: { id: itemConsolidadoId } });
  await obterCategoriaDoSetorOuErro(item.categoriaId, sessao.id);
  if (item.status === "APROVADO") throw new Error("Este item já foi aprovado e não pode ser editado.");

  const nome = novoNome.trim();
  if (!nome) throw new Error("Informe um nome.");

  await prisma.itemConsolidado.update({ where: { id: itemConsolidadoId }, data: { nomeItem: nome } });
  revalidatePath(`/consolidacao/${item.categoriaId}`);
}

export async function mesclarConsolidadosAction(destinoId: string, origemId: string) {
  const sessao = await exigirSetorTecnico();
  if (destinoId === origemId) throw new Error("Selecione dois itens diferentes para mesclar.");

  const [destino, origem] = await Promise.all([
    prisma.itemConsolidado.findUniqueOrThrow({ where: { id: destinoId } }),
    prisma.itemConsolidado.findUniqueOrThrow({ where: { id: origemId } }),
  ]);

  if (destino.categoriaId !== origem.categoriaId) {
    throw new Error("Só é possível mesclar itens da mesma categoria.");
  }
  await obterCategoriaDoSetorOuErro(destino.categoriaId, sessao.id);
  if (destino.status === "APROVADO" || origem.status === "APROVADO") {
    throw new Error("Não é possível mesclar um item já aprovado.");
  }

  await prisma.$transaction([
    prisma.itemDfd.updateMany({ where: { itemConsolidadoId: origemId }, data: { itemConsolidadoId: destinoId } }),
    prisma.itemConsolidado.update({
      where: { id: destinoId },
      data: {
        quantidadeTotal: { increment: origem.quantidadeTotal },
        valorTotal: { increment: origem.valorTotal },
      },
    }),
    prisma.itemConsolidado.delete({ where: { id: origemId } }),
  ]);

  revalidatePath(`/consolidacao/${destino.categoriaId}`);
}

export async function aprovarConsolidadoAction(itemConsolidadoId: string) {
  const sessao = await exigirSetorTecnico();
  const item = await prisma.itemConsolidado.findUniqueOrThrow({ where: { id: itemConsolidadoId } });
  await obterCategoriaDoSetorOuErro(item.categoriaId, sessao.id);
  if (item.status === "APROVADO") throw new Error("Este item já está aprovado.");

  await prisma.itemConsolidado.update({
    where: { id: itemConsolidadoId },
    data: { status: "APROVADO", aprovadoPorId: sessao.id, aprovadoEm: new Date() },
  });

  revalidatePath(`/consolidacao/${item.categoriaId}`);
}

export async function desfazerAprovacaoConsolidadoAction(itemConsolidadoId: string) {
  const sessao = await exigirSetorTecnico();
  const item = await prisma.itemConsolidado.findUniqueOrThrow({ where: { id: itemConsolidadoId } });
  await obterCategoriaDoSetorOuErro(item.categoriaId, sessao.id);
  if (item.status !== "APROVADO") throw new Error("Este item não está aprovado.");

  await prisma.itemConsolidado.update({
    where: { id: itemConsolidadoId },
    data: { status: "RASCUNHO", aprovadoPorId: null, aprovadoEm: null },
  });

  revalidatePath(`/consolidacao/${item.categoriaId}`);
}

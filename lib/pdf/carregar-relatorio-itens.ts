import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { dfdComprometeOrcamento } from "@/lib/cota";
import type { ItemParaRelatorio } from "@/lib/relatorio-unidade";

export type ResultadoCarregarRelatorioItens =
  | { erro: string; status: 401 | 403 }
  | { unidadeNome: string; itens: ItemParaRelatorio[] };

/** Itens de todos os DFDs que já comprometem orçamento da unidade logada
 * (aguardando aprovação ou aprovados) — mesmo recorte usado nos cômputos do
 * painel da Unidade, pra manter os números consistentes entre tela e relatório. */
export async function carregarRelatorioItens(): Promise<ResultadoCarregarRelatorioItens> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };
  if (sessao.tipo !== "UNIDADE") return { erro: "Acesso restrito a unidades demandantes.", status: 403 };

  const [unidade, dfds] = await Promise.all([
    prisma.unidade.findUniqueOrThrow({ where: { id: sessao.id } }),
    prisma.dfd.findMany({
      where: { unidadeId: sessao.id },
      include: { itens: { include: { categoria: true } } },
    }),
  ]);

  const itens = dfds
    .filter((d) => dfdComprometeOrcamento(d.status))
    .flatMap((d) => d.itens)
    .map((it) => ({
      categoriaNome: it.categoria.nome,
      nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      quantidade: it.quantidade != null ? Number(it.quantidade) : null,
      valorUnit: it.valorUnit != null ? Number(it.valorUnit) : null,
      valorTotal: Number(it.valorTotal),
    }));

  return { unidadeNome: unidade.nome, itens };
}

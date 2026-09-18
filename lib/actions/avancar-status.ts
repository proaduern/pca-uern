import { prisma } from "@/lib/prisma";
import { STATUS_LICITACAO_OPCOES, type StatusLicitacaoValor } from "@/lib/licitacao";

function ordemStatus(status: StatusLicitacaoValor): number {
  return STATUS_LICITACAO_OPCOES.findIndex((o) => o.value === status);
}

/**
 * Avanço automático de StatusLicitacao como efeito colateral de finalizar um
 * documento (Pesquisa de Preços, Termo de Referência, Minuta de Edital) ou
 * de zerar as pendências de homologação — nunca por clique manual de
 * Licitações (`criadoPorId` fica nulo, mesmo padrão já usado em
 * autorizarExecucaoAtaAction).
 *
 * Só insere se o status atual (nulo, ou anterior na sequência de
 * STATUS_LICITACAO_OPCOES) ainda não chegou em `novoStatus` — nunca regride
 * nem duplica um avanço que Licitações já tenha feito manualmente antes (o
 * registro manual de status é independente da finalização dos documentos, e
 * os dois mecanismos convivem).
 */
export async function avancarStatusLicitacaoSeNecessario(
  consolidacaoId: string,
  novoStatus: StatusLicitacaoValor,
  responsavel?: string | null,
): Promise<void> {
  const ultimo = await prisma.statusLicitacao.findFirst({
    where: { consolidacaoId },
    orderBy: { createdAt: "desc" },
  });
  if (ultimo && ordemStatus(ultimo.status) >= ordemStatus(novoStatus)) return;

  await prisma.statusLicitacao.create({
    data: { consolidacaoId, status: novoStatus, responsavel: responsavel?.trim() || null },
  });
}

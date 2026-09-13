"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirGestorAta } from "@/lib/auth";

/**
 * A Unidade Gestora de Ata solicita à PROAD autorização para dar início à
 * execução de um processo já remetido a ela pela Licitação (tipoContratacao
 * ATA) — equivalente a solicitarExecucaoAta do sistema original.
 */
export async function solicitarExecucaoAtaAction(consolidacaoId: string) {
  const sessao = await exigirGestorAta();
  const consolidacao = await prisma.consolidacaoTecnica.findUniqueOrThrow({ where: { id: consolidacaoId } });
  if (consolidacao.solicitacaoExecucaoAtaEm) {
    throw new Error("A autorização de execução já foi solicitada para este processo.");
  }

  await prisma.consolidacaoTecnica.update({
    where: { id: consolidacaoId },
    data: { solicitacaoExecucaoAtaEm: new Date(), solicitacaoExecucaoAtaPorId: sessao.id },
  });

  revalidatePath("/");
}

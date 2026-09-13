import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirEntrega } from "@/lib/auth";
import { proximosStatusEntrega } from "@/lib/entrega";
import PainelEntregaDetalhe from "./PainelEntregaDetalhe";

export default async function EntregaDetalhePage({ params }: { params: Promise<{ entregaId: string }> }) {
  const { entregaId } = await params;
  const sessao = await exigirEntrega();

  const entrega = await prisma.entrega.findUnique({
    where: { id: entregaId },
    include: {
      unidade: true,
      categoria: true,
      itemDfd: true,
      statusEntrega: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!entrega) notFound();
  if (entrega.subperfilBens !== (await prisma.acessoEntrega.findUniqueOrThrow({ where: { id: sessao.id } })).subperfil) {
    notFound();
  }

  const statusAtual = entrega.statusEntrega[0]?.status ?? null;
  const proximos = proximosStatusEntrega(statusAtual);
  const quantidadeItemOriginal = entrega.itemDfd ? Number(entrega.itemDfd.quantidade ?? 1) : 1;

  return (
    <PainelEntregaDetalhe
      entregaId={entrega.id}
      itemNome={entrega.itemNome}
      unidadeNome={entrega.unidade?.nome ?? null}
      categoriaNome={entrega.categoria.nome}
      enquadramento={entrega.enquadramento}
      viaEstoque={entrega.viaEstoque}
      valorAdjudicado={Number(entrega.valorAdjudicado)}
      quantidadeItemOriginal={quantidadeItemOriginal}
      statusAtual={statusAtual}
      proximos={proximos}
      historico={entrega.statusEntrega.map((h) => ({ id: h.id, status: h.status, criadoEm: h.createdAt.toISOString() }))}
    />
  );
}

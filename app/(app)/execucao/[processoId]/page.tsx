import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirExecucao } from "@/lib/auth";
import { calcularAtrasoExecucao, proximosStatusExecucao } from "@/lib/execucao";
import PainelExecucaoProcesso from "./PainelExecucaoProcesso";

export default async function ExecucaoProcessoPage({ params }: { params: Promise<{ processoId: string }> }) {
  const { processoId } = await params;
  const sessao = await exigirExecucao();

  const proc = await prisma.processoExecucao.findUnique({
    where: { id: processoId },
    include: {
      consolidacao: { include: { categoria: true } },
      itensDfd: { include: { dfd: { include: { unidade: true } } } },
      itensTecnicos: true,
      statusExecucao: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!proc) notFound();
  if (proc.acessoExecucaoId !== sessao.id) notFound();

  const statusAtual = proc.statusExecucao[0]?.status ?? null;
  const atraso = calcularAtrasoExecucao(
    statusAtual,
    proc.statusExecucao[0]?.dataEnvio ?? null,
    proc.statusExecucao[0]?.prazoDias ?? null,
  );
  const proximos = proximosStatusExecucao(statusAtual);

  const itens = [
    ...proc.itensDfd.map((it) => ({
      id: it.id,
      nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      unidadeNome: it.dfd.unidade.nome,
      tipo: it.tipo,
      quantidade: Number(it.quantidade ?? 1),
      valorAdjudicado: Number(it.valorAdjudicado ?? it.valorTotal),
    })),
    ...proc.itensTecnicos.map((it) => ({
      id: it.id,
      nome: it.item,
      unidadeNome: null,
      tipo: "MATERIAL" as const,
      quantidade: Number(it.quantidade),
      valorAdjudicado: Number(it.valorAdjudicado ?? it.valorTotal),
    })),
  ];
  const itensMaterialParaRecebimento = proc.itensDfd
    .filter((it) => it.tipo === "MATERIAL")
    .map((it) => ({
      id: it.id,
      nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      unidadeNome: it.dfd.unidade.nome,
      quantidade: Number(it.quantidade ?? 1),
    }));

  return (
    <PainelExecucaoProcesso
      processoId={proc.id}
      processoSEIExecucao={proc.processoSEIExecucao}
      categoriaNome={proc.consolidacao.categoria.nome}
      processoSEILicitacao={proc.consolidacao.processoSEI}
      itens={itens}
      itensMaterialParaRecebimento={itensMaterialParaRecebimento}
      atraso={atraso}
      proximos={proximos}
      historico={proc.statusExecucao.map((h) => ({
        id: h.id,
        status: h.status,
        criadoEm: h.createdAt.toISOString(),
        dataEnvio: h.dataEnvio ? h.dataEnvio.toISOString() : null,
        prazoDias: h.prazoDias,
      }))}
    />
  );
}

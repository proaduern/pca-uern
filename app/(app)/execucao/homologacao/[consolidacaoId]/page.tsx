import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirExecucao } from "@/lib/auth";
import { subperfilEfetivoCategoria } from "@/lib/execucao";
import PainelHomologacaoExecucao from "./PainelHomologacaoExecucao";

export default async function HomologacaoExecucaoPage({
  params,
}: {
  params: Promise<{ consolidacaoId: string }>;
}) {
  const { consolidacaoId } = await params;
  const sessao = await exigirExecucao();
  const acesso = await prisma.acessoExecucao.findUniqueOrThrow({ where: { id: sessao.id } });

  const cons = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      itensDfd: { where: { resultadoHomologacao: "SUCESSO" }, include: { dfd: { include: { unidade: true } } } },
      itensTecnicos: { where: { resultadoHomologacao: "SUCESSO" } },
      processosExecucao: { include: { itensDfd: true, itensTecnicos: true } },
    },
  });
  if (!cons) notFound();
  if (subperfilEfetivoCategoria(cons.categoria.nome, cons.categoria.subperfilExecucaoOverride) !== acesso.subperfil) {
    notFound();
  }

  const pendentes = [
    ...cons.itensDfd
      .filter((it) => !it.processoExecucaoId)
      .map((it) => ({
        id: it.id,
        origem: "DFD" as const,
        nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
        unidadeNome: it.dfd.unidade.nome,
        valorAdjudicado: Number(it.valorAdjudicado ?? it.valorTotal),
      })),
    ...cons.itensTecnicos
      .filter((it) => !it.processoExecucaoId)
      .map((it) => ({
        id: it.id,
        origem: "TECNICO" as const,
        nome: it.item,
        unidadeNome: null,
        valorAdjudicado: Number(it.valorAdjudicado ?? it.valorTotal),
      })),
  ];

  const emExecucao = [
    ...cons.itensDfd
      .filter((it) => it.processoExecucaoId)
      .map((it) => ({
        id: it.id,
        nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
        unidadeNome: it.dfd.unidade.nome,
        valorAdjudicado: Number(it.valorAdjudicado ?? it.valorTotal),
        processoExecucaoId: it.processoExecucaoId!,
      })),
    ...cons.itensTecnicos
      .filter((it) => it.processoExecucaoId)
      .map((it) => ({
        id: it.id,
        nome: it.item,
        unidadeNome: null,
        valorAdjudicado: Number(it.valorAdjudicado ?? it.valorTotal),
        processoExecucaoId: it.processoExecucaoId!,
      })),
  ];
  const processoSEIPorId = Object.fromEntries(cons.processosExecucao.map((p) => [p.id, p.processoSEIExecucao]));

  return (
    <PainelHomologacaoExecucao
      consolidacaoId={cons.id}
      categoriaNome={cons.categoria.nome}
      processoSEI={cons.processoSEI}
      pendentes={pendentes}
      emExecucao={emExecucao.map((it) => ({ ...it, processoSEIExecucao: processoSEIPorId[it.processoExecucaoId] ?? "—" }))}
    />
  );
}

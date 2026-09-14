import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { resolverPcaEmAtuacao } from "@/lib/pca-contexto";
import PainelConsolidacao from "./PainelConsolidacao";

export default async function ConsolidacaoCategoriaPage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  const { categoriaId } = await params;
  const sessao = await obterSessao();
  if (!sessao || sessao.tipo !== "SETOR_TECNICO") return null;

  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria || categoria.setorTecnicoId !== sessao.id) notFound();

  // AppLayout já redireciona pra /selecionar-pca quando há mais de um PCA
  // ativo e o setor técnico ainda não escolheu em qual está atuando.
  const contextoPca = await resolverPcaEmAtuacao(sessao);
  const pcaAtivo = contextoPca.status === "resolvido" ? contextoPca.pca : null;

  const [itensDfd, itensTecnicos, itensCatalogo, historico] = await Promise.all([
    pcaAtivo && !categoria.fluxoContinuo
      ? prisma.itemDfd.findMany({
          where: { categoriaId, consolidacaoTecnicaId: null, dfd: { ano: pcaAtivo.ano, status: "APROVADO" } },
          include: { dfd: { include: { unidade: true, prioridade: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    categoria.fluxoContinuo
      ? Promise.resolve([])
      : prisma.itemTecnico.findMany({
          where: { categoriaId, consolidacaoTecnicaId: null },
          orderBy: { createdAt: "asc" },
        }),
    prisma.itemCatalogo.findMany({ where: { categoriaId, ativo: true }, orderBy: { item: "asc" } }),
    pcaAtivo
      ? prisma.consolidacaoTecnica.findMany({
          where: { categoriaId, pcaAno: pcaAtivo.ano },
          include: { _count: { select: { itensDfd: true, itensTecnicos: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const pendentes = [
    ...itensDfd.map((it) => ({
      origem: "dfd" as const,
      id: it.id,
      nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      unidadeNome: it.dfd.unidade.nome,
      prioridade: it.dfd.prioridade.nivel as string | null,
      tipoBem: it.tipoBem,
      quantidade: Number(it.quantidade ?? 1),
      valorUnit: it.valorUnit !== null ? Number(it.valorUnit) : null,
      valorTotal: Number(it.valorTotal),
      substituido: it.itemSubstituidoNome !== null,
      itemOriginalNome: it.itemSubstituidoNome,
    })),
    ...itensTecnicos.map((it) => ({
      origem: "tecnico" as const,
      id: it.id,
      nome: it.item,
      unidadeNome: "Incluído pelo setor técnico",
      prioridade: null,
      tipoBem: it.tipoBem,
      quantidade: Number(it.quantidade),
      valorUnit: Number(it.valorUnit),
      valorTotal: Number(it.valorTotal),
      substituido: it.itemSubstituidoNome !== null,
      itemOriginalNome: it.itemSubstituidoNome,
    })),
  ];

  return (
    <PainelConsolidacao
      categoriaId={categoriaId}
      categoriaNome={categoria.nome}
      fluxoContinuo={categoria.fluxoContinuo}
      pcaAno={pcaAtivo?.ano ?? null}
      pendentes={pendentes}
      itensCatalogo={itensCatalogo.map((c) => ({ id: c.id, item: c.item, valor: Number(c.valor) }))}
      historico={historico.map((c) => ({
        id: c.id,
        processoSEI: c.processoSEI,
        idDocumentoETP: c.idDocumentoETP,
        dataETP: c.dataETP.toISOString(),
        prioridade: c.prioridade,
        tipoContratacao: c.tipoContratacao,
        dataEsperadaConclusao: c.dataEsperadaConclusao.toISOString(),
        codigoPca: c.codigoPca,
        totalItens: c._count.itensDfd + c._count.itensTecnicos,
      }))}
    />
  );
}

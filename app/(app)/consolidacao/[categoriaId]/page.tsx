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
  if (!sessao || (sessao.tipo !== "SETOR_TECNICO" && sessao.tipo !== "ADMIN")) return null;

  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria || (sessao.tipo === "SETOR_TECNICO" && categoria.setorTecnicoId !== sessao.id)) {
    notFound();
  }

  const contextoPca =
    sessao.tipo === "SETOR_TECNICO"
      ? await resolverPcaEmAtuacao(sessao)
      : await prisma.pca
          .findFirst({ where: { ativo: true }, orderBy: { ano: "desc" } })
          .then((pca) => (pca ? ({ status: "resolvido" as const, pca, totalAtivos: 1 }) : ({ status: "nenhum" as const })));
  const pcaAtivo = contextoPca.status === "resolvido" ? contextoPca.pca : null;

  const [itensDfd, itensAguardandoAprovacao, itensTecnicos, itensCatalogo, historico, todasCategoriasPcaAno] =
    await Promise.all([
      pcaAtivo && !categoria.fluxoContinuo
        ? prisma.itemDfd.findMany({
            where: { categoriaId, consolidacaoTecnicaId: null, dfd: { ano: pcaAtivo.ano, status: "APROVADO" } },
            include: { dfd: { include: { unidade: true, prioridade: true } } },
            orderBy: { createdAt: "asc" },
          })
        : Promise.resolve([]),
      pcaAtivo && !categoria.fluxoContinuo
        ? prisma.itemDfd.findMany({
            where: {
              categoriaId,
              consolidacaoTecnicaId: null,
              dfd: { ano: pcaAtivo.ano, status: "AGUARDANDO_APROVACAO" },
            },
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
            include: {
              _count: { select: { itensDfd: true, itensTecnicos: true } },
              estudoTecnicoPreliminar: { select: { status: true } },
              analiseRiscos: { select: { status: true } },
              instrumentoMedicaoResultado: { select: { status: true } },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      pcaAtivo
        ? prisma.itemDfd.findMany({
            where: {
              dfd: { ano: pcaAtivo.ano, status: { in: ["APROVADO", "AGUARDANDO_APROVACAO"] } },
              categoria: { fluxoContinuo: false, ignoraPCA: false },
            },
            include: {
              categoria: { select: { id: true, nome: true, codigoPcaPadrao: true } },
              consolidacaoTecnica: { select: { codigoPca: true } },
            },
          })
        : Promise.resolve([]),
    ]);

  const categoriasSemPncpSet = new Set<string>();
  for (const it of todasCategoriasPcaAno) {
    const cod =
      it.consolidacaoTecnica?.codigoPca?.trim() ||
      it.codigoPncpReferencia?.trim() ||
      it.categoria.codigoPcaPadrao?.trim() ||
      "";
    if (!cod) {
      categoriasSemPncpSet.add(it.categoria.nome);
    }
  }

  const pendentes = [
    ...itensDfd.map((it) => ({
      origem: "dfd" as const,
      id: it.id,
      nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      unidadeNome: it.dfd.unidade.nome,
      setorSolicitante: it.setorSolicitanteTexto,
      processoSeiOrigem: it.processoSeiOrigem ?? it.dfd.processoSeiOrigem,
      idSeiDfdOrigem: it.idSeiDfdOrigem ?? it.dfd.idSeiDfdOrigem,
      codigoPncpReferencia: it.codigoPncpReferencia ?? categoria.codigoPcaPadrao,
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
      setorSolicitante: null,
      processoSeiOrigem: null,
      idSeiDfdOrigem: null,
      codigoPncpReferencia: categoria.codigoPcaPadrao,
      prioridade: null,
      tipoBem: it.tipoBem,
      quantidade: Number(it.quantidade),
      valorUnit: Number(it.valorUnit),
      valorTotal: Number(it.valorTotal),
      substituido: it.itemSubstituidoNome !== null,
      itemOriginalNome: it.itemSubstituidoNome,
    })),
  ];

  const emAprovacaoProad = itensAguardandoAprovacao.map((it) => ({
    id: it.id,
    nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
    unidadeNome: it.dfd.unidade.nome,
    setorSolicitante: it.setorSolicitanteTexto,
    processoSeiOrigem: it.processoSeiOrigem ?? it.dfd.processoSeiOrigem,
    idSeiDfdOrigem: it.idSeiDfdOrigem ?? it.dfd.idSeiDfdOrigem,
    codigoPncpReferencia: it.codigoPncpReferencia ?? categoria.codigoPcaPadrao,
    quantidade: Number(it.quantidade ?? 1),
    valorTotal: Number(it.valorTotal),
  }));

  const processoSeiSugerido =
    itensDfd.find((it) => it.processoSeiOrigem || it.dfd.processoSeiOrigem)?.processoSeiOrigem ??
    itensDfd.find((it) => it.dfd.processoSeiOrigem)?.dfd.processoSeiOrigem ??
    itensAguardandoAprovacao.find((it) => it.processoSeiOrigem || it.dfd.processoSeiOrigem)?.processoSeiOrigem ??
    "";

  return (
    <PainelConsolidacao
      categoriaId={categoriaId}
      categoriaNome={categoria.nome}
      codigoPcaPadrao={categoria.codigoPcaPadrao ?? ""}
      consolidarPorObjeto={categoria.consolidarPorObjeto}
      fluxoContinuo={categoria.fluxoContinuo}
      pcaAno={pcaAtivo?.ano ?? null}
      processoSeiSugerido={processoSeiSugerido ?? ""}
      categoriasPendentesPncp={Array.from(categoriasSemPncpSet).sort()}
      pendentes={pendentes}
      emAprovacaoProad={emAprovacaoProad}
      itensCatalogo={itensCatalogo.map((c) => ({ id: c.id, item: c.item, valor: Number(c.valor) }))}
      historico={historico.map((c) => ({
        id: c.id,
        processoSEI: c.processoSEI,
        dataETP: c.dataETP.toISOString(),
        prioridade: c.prioridade,
        tipoContratacao: c.tipoContratacao,
        dataEsperadaConclusao: c.dataEsperadaConclusao.toISOString(),
        codigoPca: c.codigoPca,
        totalItens: c._count.itensDfd + c._count.itensTecnicos,
        statusEtp: c.estudoTecnicoPreliminar?.status ?? null,
        statusRiscos: c.analiseRiscos?.status ?? null,
        statusImr: c.instrumentoMedicaoResultado?.status ?? null,
      }))}
    />
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import {
  agruparItensParaHomologacao,
  agruparServicosValorPorCategoria,
  proximosStatusLicitacao,
  servicosPendentesHomologacao,
  type ItemHomologavel,
  type StatusLicitacaoValor,
} from "@/lib/licitacao";
import PainelLicitacao from "./PainelLicitacao";

export default async function LicitacaoDetalhePage({
  params,
}: {
  params: Promise<{ consolidacaoId: string }>;
}) {
  const { consolidacaoId } = await params;
  const sessao = await obterSessao();
  if (!sessao || sessao.tipo !== "LICITACOES") return null;

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      setorTecnico: true,
      statusLicitacao: { orderBy: { createdAt: "desc" } },
      itensDfd: { include: { dfd: { include: { unidade: true } }, categoria: true } },
      itensTecnicos: { include: { categoria: true } },
    },
  });
  if (!consolidacao) notFound();

  const todosItens: ItemHomologavel[] = [
    ...consolidacao.itensDfd.map(
      (it): ItemHomologavel => ({
        id: it.id,
        origem: "DFD",
        nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
        unidadeNome: it.dfd.unidade.nome,
        enquadramento: it.enquadramento,
        tipo: it.tipo,
        modoServico: it.categoria.modoServico,
        categoriaNome: it.categoria.nome,
        quantidade: Number(it.quantidade ?? 1),
        valorUnit: Number(it.valorUnit ?? 0),
        valorTotal: Number(it.valorTotal),
      }),
    ),
    ...consolidacao.itensTecnicos.map(
      (it): ItemHomologavel => ({
        id: it.id,
        origem: "TECNICO",
        nome: it.item,
        unidadeNome: null,
        enquadramento: null,
        tipo: it.categoria.tipo,
        modoServico: it.categoria.modoServico,
        categoriaNome: it.categoria.nome,
        quantidade: Number(it.quantidade),
        valorUnit: Number(it.valorUnit),
        valorTotal: Number(it.valorTotal),
      }),
    ),
  ];

  const pendentes = todosItens.filter((it) => {
    const original =
      it.origem === "DFD"
        ? consolidacao.itensDfd.find((x) => x.id === it.id)
        : consolidacao.itensTecnicos.find((x) => x.id === it.id);
    return !original?.resultadoHomologacao;
  });

  const statusAtual: StatusLicitacaoValor | null = consolidacao.statusLicitacao[0]?.status ?? null;
  const jaHomologou = consolidacao.statusLicitacao.some((s) => s.status === "HOMOLOGADO");
  const proximos = proximosStatusLicitacao(statusAtual, consolidacao.tipoContratacao);

  return (
    <PainelLicitacao
      consolidacaoId={consolidacaoId}
      categoriaNome={consolidacao.categoria.nome}
      processoSEI={consolidacao.processoSEI}
      idDocumentoETP={consolidacao.idDocumentoETP}
      dataETP={consolidacao.dataETP.toISOString()}
      prioridade={consolidacao.prioridade}
      tipoContratacao={consolidacao.tipoContratacao}
      dataEsperadaConclusao={consolidacao.dataEsperadaConclusao.toISOString()}
      revisao={
        consolidacao.revisaoEm
          ? {
              prioridade: consolidacao.revisaoPrioridade!,
              dataEsperadaConclusao: consolidacao.revisaoDataEsperadaConclusao!.toISOString(),
              justificativa: consolidacao.revisaoJustificativa!,
              revisadoEm: consolidacao.revisaoEm.toISOString(),
            }
          : null
      }
      itens={todosItens.map((it) => ({
        id: it.id,
        nome: it.nome,
        unidadeNome: it.unidadeNome,
        tipoBem:
          it.origem === "DFD"
            ? (consolidacao.itensDfd.find((x) => x.id === it.id)?.tipoBem ?? null)
            : (consolidacao.itensTecnicos.find((x) => x.id === it.id)?.tipoBem ?? null),
        quantidade: it.quantidade,
        valorTotal: it.valorTotal,
      }))}
      statusAtual={statusAtual}
      proximos={proximos}
      historico={consolidacao.statusLicitacao.map((s) => ({
        id: s.id,
        status: s.status,
        criadoEm: s.createdAt.toISOString(),
        responsavel: s.responsavel,
        dataDiligencia: s.dataDiligencia?.toISOString() ?? null,
        prazoResposta: s.prazoResposta?.toISOString() ?? null,
        dataSessao: s.dataSessao?.toISOString() ?? null,
        agenteNome: s.agenteNome,
        agenteMatricula: s.agenteMatricula,
      }))}
      homologacaoIniciada={jaHomologou}
      gruposMaterial={agruparItensParaHomologacao(pendentes).map((g) => ({
        nome: g.nome,
        quantidadeTotal: g.quantidadeTotal,
        quantidadeOP: g.quantidadeOP,
        itens: g.itens.map((it) => ({
          id: it.id,
          unidadeNome: it.unidadeNome,
          enquadramento: it.enquadramento,
          quantidade: it.quantidade,
        })),
      }))}
      gruposServicoValor={agruparServicosValorPorCategoria(pendentes).map((g) => ({
        nome: g.nome,
        valorTotal: g.valorTotal,
        itens: g.itens.map((it) => ({ unidadeNome: it.unidadeNome, enquadramento: it.enquadramento, valorTotal: it.valorTotal })),
      }))}
      servicosObjeto={servicosPendentesHomologacao(pendentes).map((it) => ({
        id: it.id,
        nome: it.nome,
        unidadeNome: it.unidadeNome,
        valorTotal: it.valorTotal,
      }))}
    />
  );
}

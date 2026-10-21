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
  if (!sessao) return null;
  if (
    sessao.tipo !== "LICITACOES" &&
    sessao.tipo !== "ADMIN" &&
    sessao.tipo !== "AGENTE_CONTRATACAO" &&
    sessao.tipo !== "GESTOR_ATA"
  ) {
    return null;
  }

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      setorTecnico: true,
      agenteContratacaoDesignado: true,
      estudoTecnicoPreliminar: { select: { status: true, objeto: true } },
      analiseRiscos: { select: { status: true } },
      pesquisaDePrecos: {
        select: {
          status: true,
          itens: { select: { item: true, valorUnitarioPesquisado: true } },
        },
      },
      termoReferencia: { select: { status: true } },
      minutaEdital: { select: { status: true } },
      minutaContrato: true,
      minutaAta: true,
      diligenciasJuridicas: { orderBy: { createdAt: "desc" } },
      statusLicitacao: { orderBy: { createdAt: "desc" } },
      itensDfd: { include: { dfd: { include: { unidade: true } }, categoria: true } },
      itensTecnicos: { include: { categoria: true } },
    },
  });
  if (!consolidacao) notFound();

  const podeGerenciarStatus =
    sessao.tipo === "LICITACOES" || sessao.tipo === "ADMIN" || sessao.tipo === "GESTOR_ATA";
  if (sessao.tipo === "AGENTE_CONTRATACAO" && consolidacao.agenteContratacaoDesignadoId !== sessao.id) {
    return null;
  }

  const agentesContratacao = podeGerenciarStatus
    ? await prisma.agenteContratacao.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } })
    : [];

  // Mapa de preço referencial da Pesquisa de Preços por nome do item (apenas informativo/teto)
  const mapaPrecoPesquisa = new Map<string, number>();
  for (const ip of consolidacao.pesquisaDePrecos?.itens ?? []) {
    mapaPrecoPesquisa.set(ip.item.trim().toLowerCase(), Number(ip.valorUnitarioPesquisado ?? 0));
  }

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

  const sgcItem = consolidacao.itensDfd.find((i) => i.sgcContratoId || i.sgcAtaId) || null;
  const statusSgc = sgcItem
    ? {
        tipo: sgcItem.sgcAtaId ? ("ATA" as const) : ("CONTRATO" as const),
        id: (sgcItem.sgcAtaId || sgcItem.sgcContratoId)!,
        numeroRegistro: sgcItem.sgcNumeroAta || sgcItem.sgcNumeroContrato || "Pendente de Formalização",
        fornecedorNome: sgcItem.sgcFornecedorNome,
        statusExecucao: sgcItem.sgcStatusExecucao,
      }
    : null;

  return (
    <PainelLicitacao
      consolidacaoId={consolidacaoId}
      statusSgc={statusSgc}
      podeGerenciarStatus={podeGerenciarStatus}
      agenteDesignado={
        consolidacao.agenteContratacaoDesignado
          ? { id: consolidacao.agenteContratacaoDesignado.id, nome: consolidacao.agenteContratacaoDesignado.nome }
          : null
      }
      agentesContratacao={agentesContratacao.map((a) => ({ id: a.id, nome: a.nome }))}
      categoriaNome={consolidacao.categoria.nome}
      processoSEI={consolidacao.processoSEI}
      statusEtp={consolidacao.estudoTecnicoPreliminar?.status ?? null}
      objetoEtp={consolidacao.estudoTecnicoPreliminar?.objeto ?? null}
      statusRiscos={consolidacao.analiseRiscos?.status ?? null}
      statusPesquisa={consolidacao.pesquisaDePrecos?.status ?? null}
      statusTr={consolidacao.termoReferencia?.status ?? null}
      statusMinutaEdital={consolidacao.minutaEdital?.status ?? null}
      minutaContrato={
        consolidacao.minutaContrato
          ? {
              status: consolidacao.minutaContrato.status,
              clausulaVigenciaProrrogacao: consolidacao.minutaContrato.clausulaVigenciaProrrogacao,
              clausulaDotacaoOrcamentaria: consolidacao.minutaContrato.clausulaDotacaoOrcamentaria,
              clausulaReajusteRepactuacao: consolidacao.minutaContrato.clausulaReajusteRepactuacao,
              clausulaGarantiaContratual: consolidacao.minutaContrato.clausulaGarantiaContratual,
              clausulaObrigacoesContratada: consolidacao.minutaContrato.clausulaObrigacoesContratada,
              clausulaObrigacoesContratante: consolidacao.minutaContrato.clausulaObrigacoesContratante,
              clausulaFiscalizacaoGestao: consolidacao.minutaContrato.clausulaFiscalizacaoGestao,
              clausulaExtincaoForo: consolidacao.minutaContrato.clausulaExtincaoForo,
              responsavelNome: consolidacao.minutaContrato.responsavelNome,
              responsavelMatricula: consolidacao.minutaContrato.responsavelMatricula,
            }
          : null
      }
      minutaAta={
        consolidacao.minutaAta
          ? {
              status: consolidacao.minutaAta.status,
              clausulaValidadeAta: consolidacao.minutaAta.clausulaValidadeAta,
              clausulaOrgaoGerenciadorParticipantes: consolidacao.minutaAta.clausulaOrgaoGerenciadorParticipantes,
              clausulaAdesaoCarona: consolidacao.minutaAta.clausulaAdesaoCarona,
              clausulaRevisaoCancelamentoPrecos: consolidacao.minutaAta.clausulaRevisaoCancelamentoPrecos,
              clausulaCadastroReserva: consolidacao.minutaAta.clausulaCadastroReserva,
              clausulaCondicoesFornecimento: consolidacao.minutaAta.clausulaCondicoesFornecimento,
              clausulaPenalidadesAta: consolidacao.minutaAta.clausulaPenalidadesAta,
              clausulaDisposicoesFinais: consolidacao.minutaAta.clausulaDisposicoesFinais,
              responsavelNome: consolidacao.minutaAta.responsavelNome,
              responsavelMatricula: consolidacao.minutaAta.responsavelMatricula,
            }
          : null
      }
      diligenciasJuridicas={consolidacao.diligenciasJuridicas.map((d) => ({
        id: d.id,
        numeroParecerSei: d.numeroParecerSei,
        dataParecer: d.dataParecer.toISOString(),
        descricaoDiligencia: d.descricaoDiligencia,
        artefatosAfetados: d.artefatosAfetados,
        status: d.status,
        atendidaEm: d.atendidaEm?.toISOString() ?? null,
      }))}
      editalDefinitivoInfo={{
        geradoEm: consolidacao.editalDefinitivoGeradoEm?.toISOString() ?? null,
        observacoes: consolidacao.editalDefinitivoObservacoes ?? null,
        aprovacaoAutoridadeSei: consolidacao.aprovacaoAutoridadeSei ?? null,
        aprovacaoAutoridadeData: consolidacao.aprovacaoAutoridadeData?.toISOString() ?? null,
        publicacaoPncpCodigo: consolidacao.publicacaoPncpCodigo ?? null,
        publicacaoPncpData: consolidacao.publicacaoPncpData?.toISOString() ?? null,
      }}
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
      itens={todosItens.map((it) => {
        const origDfd = it.origem === "DFD" ? consolidacao.itensDfd.find((x) => x.id === it.id) : null;
        const origTec = it.origem === "TECNICO" ? consolidacao.itensTecnicos.find((x) => x.id === it.id) : null;
        const precoRefPesquisa = mapaPrecoPesquisa.get(it.nome.trim().toLowerCase()) ?? null;
        const precoRealHomologado = Number(
          origDfd?.valorUnitarioHomologado ?? origTec?.valorUnitarioHomologado ?? 0,
        );
        const totalHomologado = Number(origDfd?.valorAdjudicado ?? origTec?.valorAdjudicado ?? 0);
        const fornecedorVencedor = origDfd?.fornecedorVencedorNome ?? origTec?.fornecedorVencedorNome ?? null;
        return {
          id: it.id,
          nome: it.nome,
          unidadeNome: it.unidadeNome,
          tipoBem: origDfd?.tipoBem ?? origTec?.tipoBem ?? null,
          quantidade: it.quantidade,
          valorTotal: it.valorTotal,
          precoReferencialPesquisa: precoRefPesquisa,
          precoRealHomologado: precoRealHomologado > 0 ? precoRealHomologado : null,
          valorTotalHomologado: totalHomologado > 0 ? totalHomologado : null,
          fornecedorVencedor,
          resultadoHomologacao: origDfd?.resultadoHomologacao ?? origTec?.resultadoHomologacao ?? null,
        };
      })}
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
        precoReferencialUnitario: mapaPrecoPesquisa.get(g.nome.trim().toLowerCase()) ?? null,
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
        itens: g.itens.map((it) => ({
          unidadeNome: it.unidadeNome,
          enquadramento: it.enquadramento,
          valorTotal: it.valorTotal,
        })),
      }))}
      servicosObjeto={servicosPendentesHomologacao(pendentes).map((it) => ({
        id: it.id,
        nome: it.nome,
        unidadeNome: it.unidadeNome,
        valorTotal: it.valorTotal,
        precoReferencialPesquisa: mapaPrecoPesquisa.get(it.nome.trim().toLowerCase()) ?? null,
      }))}
    />
  );
}

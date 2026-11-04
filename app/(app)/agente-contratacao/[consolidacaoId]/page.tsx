import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { sincronizarPerfisHomologadosDoPortal } from "@/lib/sincronizar-perfis-portal";
import IniciarDocumentoBotao from "../../IniciarDocumentoBotao";
import { criarMinutaEditalAction } from "@/lib/actions/minuta-edital";
import MinutaEditalForm from "./MinutaEditalForm";
import PainelFluxoAgente, { type ItemResumoAgente } from "./PainelFluxoAgente";

export default async function AgenteContratacaoDetalhePage({
  params,
}: {
  params: Promise<{ consolidacaoId: string }>;
}) {
  const { consolidacaoId } = await params;
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (
    sessao.tipo !== "AGENTE_CONTRATACAO" &&
    sessao.tipo !== "ADMIN" &&
    sessao.tipo !== "LICITACOES"
  ) {
    redirect("/");
  }

  await sincronizarPerfisHomologadosDoPortal();

  const [consolidacao, servidoresPlanejamento] = await Promise.all([
    prisma.consolidacaoTecnica.findUnique({
      where: { id: consolidacaoId },
      include: {
        categoria: true,
        setorTecnico: true,
        agenteContratacaoDesignado: true,
        planejamentoDesignado: true,
        estudoTecnicoPreliminar: true,
        pesquisaDePrecos: true,
        termoReferencia: true,
        minutaEdital: true,
        itensDfd: true,
        itensTecnicos: true,
      },
    }),
    prisma.planejamento.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);
  if (!consolidacao) notFound();

  const etp = consolidacao.estudoTecnicoPreliminar;
  const tr = consolidacao.termoReferencia;
  const trFinalizado = tr?.status === "FINALIZADO";

  // Consolida itens por nome para exibição na Análise Preliminar do Agente
  const mapaItens = new Map<string, { quantidade: number; valorTotalEstimado: number }>();
  for (const it of consolidacao.itensDfd) {
    const nome = (it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)").trim();
    const atual = mapaItens.get(nome) ?? { quantidade: 0, valorTotalEstimado: 0 };
    atual.quantidade += Number(it.quantidade ?? 1);
    atual.valorTotalEstimado += Number(it.valorTotal);
    mapaItens.set(nome, atual);
  }
  for (const it of consolidacao.itensTecnicos) {
    const nome = it.item.trim();
    const atual = mapaItens.get(nome) ?? { quantidade: 0, valorTotalEstimado: 0 };
    atual.quantidade += Number(it.quantidade);
    atual.valorTotalEstimado += Number(it.valorTotal);
    mapaItens.set(nome, atual);
  }
  const itensConsolidados: ItemResumoAgente[] = [...mapaItens.entries()].map(([nome, v]) => ({
    nome,
    quantidade: v.quantidade,
    valorTotalEstimado: v.valorTotalEstimado,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Painel do Agente de Contratação — {consolidacao.categoria.nome}
        </h1>
        <p className="text-sm text-slate-500">
          Processo SEI: {consolidacao.processoSEI} · Setor Técnico: {consolidacao.setorTecnico.nome}
          {consolidacao.agenteContratacaoDesignado && (
            <> · Agente Designado: {consolidacao.agenteContratacaoDesignado.nome}</>
          )}
        </p>
      </div>

      {/* Fluxo Pós-ETP: 1. Análise Preliminar / Diligência -> 2. Retorno da Pesquisa + Dotação Contabilidade + Envio TR */}
      <PainelFluxoAgente
        consolidacaoId={consolidacaoId}
        categoriaId={consolidacao.categoriaId}
        etapaFluxoPosEtp={consolidacao.etapaFluxoPosEtp}
        analisePreliminarStatus={consolidacao.analisePreliminarStatus}
        analisePreliminarEm={consolidacao.analisePreliminarEm?.toISOString() ?? null}
        analisePreliminarObservacao={consolidacao.analisePreliminarObservacao}
        diligenciaAgenteAlvo={consolidacao.diligenciaAgenteAlvo}
        diligenciaAgenteMotivo={consolidacao.diligenciaAgenteMotivo}
        diligenciaAgenteEm={consolidacao.diligenciaAgenteEm?.toISOString() ?? null}
        diligenciaAgenteAtendidaEm={consolidacao.diligenciaAgenteAtendidaEm?.toISOString() ?? null}
        pesquisaConcluidaRetornadaAgenteEm={
          consolidacao.pesquisaConcluidaRetornadaAgenteEm?.toISOString() ?? null
        }
        dotacaoSolicitadaContabilidadeEm={
          consolidacao.dotacaoSolicitadaContabilidadeEm?.toISOString() ?? null
        }
        dotacaoSolicitadaObservacao={consolidacao.dotacaoSolicitadaObservacao}
        dotacaoRecebidaEm={consolidacao.dotacaoRecebidaEm?.toISOString() ?? null}
        dotacaoOrcamentariaTexto={consolidacao.dotacaoOrcamentariaTexto}
        planejamentoDesignado={
          consolidacao.planejamentoDesignado
            ? {
                id: consolidacao.planejamentoDesignado.id,
                nome: consolidacao.planejamentoDesignado.nome,
                matricula: consolidacao.planejamentoDesignado.matricula,
              }
            : null
        }
        encaminhadoPlanejamentoEm={consolidacao.encaminhadoPlanejamentoEm?.toISOString() ?? null}
        servidoresPlanejamento={servidoresPlanejamento.map((sp) => ({
          id: sp.id,
          nome: sp.nome,
          matricula: sp.matricula,
        }))}
        etpStatus={etp?.status ?? null}
        pesquisaStatus={consolidacao.pesquisaDePrecos?.status ?? null}
        trStatus={tr?.status ?? null}
        itensConsolidados={itensConsolidados}
      />

      {/* Etapa 3: Elaboração da Minuta de Edital (após conclusão do TR) */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          3. Elaboração da Minuta de Edital (Após Conclusão do Termo de Referência)
        </h2>

        {!consolidacao.minutaEdital ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
              <h3 className="mb-2 text-xs font-semibold text-slate-900">Pré-requisito para a Minuta de Edital</h3>
              <p className="text-sm">
                Termo de Referência:{" "}
                <span className={trFinalizado ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                  {trFinalizado ? "Finalizado" : tr ? "Em rascunho no Planejamento" : "Aguardando elaboração pelo Planejamento"}
                </span>
              </p>
              {!trFinalizado && (
                <p className="mt-3 rounded-md bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  A Minuta de Edital será liberada assim que o servidor do Setor de Planejamento concluir o Termo de Referência.
                </p>
              )}
            </div>

            {trFinalizado && (
              <IniciarDocumentoBotao
                rotulo="Iniciar Minuta de Edital"
                acao={criarMinutaEditalAction}
                consolidacaoTecnicaId={consolidacaoId}
              />
            )}
          </div>
        ) : (
          <MinutaEditalForm
            pdfHref={`/agente-contratacao/${consolidacaoId}/pdf`}
            etp={{ objeto: etp!.objeto }}
            tr={{
              formaSelecaoFornecedor: tr!.formaSelecaoFornecedor,
              exigenciasHabilitacao: tr!.exigenciasHabilitacao,
              criteriosMedicaoPagamento: tr!.criteriosMedicaoPagamento,
              garantiaExecucao: tr!.garantiaExecucao,
            }}
            minuta={{
              id: consolidacao.minutaEdital.id,
              condicoesParticipacao: consolidacao.minutaEdital.condicoesParticipacao,
              credenciamento: consolidacao.minutaEdital.credenciamento,
              apresentacaoProposta: consolidacao.minutaEdital.apresentacaoProposta,
              julgamentoPropostas: consolidacao.minutaEdital.julgamentoPropostas,
              documentosHabilitacao: consolidacao.minutaEdital.documentosHabilitacao,
              recursosAdministrativos: consolidacao.minutaEdital.recursosAdministrativos,
              sancoesAdministrativas: consolidacao.minutaEdital.sancoesAdministrativas,
              disposicoesGerais: consolidacao.minutaEdital.disposicoesGerais,
              status: consolidacao.minutaEdital.status,
              responsavelNome: consolidacao.minutaEdital.responsavelNome,
              responsavelMatricula: consolidacao.minutaEdital.responsavelMatricula,
            }}
          />
        )}
      </div>
    </div>
  );
}

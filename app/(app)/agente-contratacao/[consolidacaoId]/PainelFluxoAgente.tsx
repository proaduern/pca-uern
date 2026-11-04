"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  FileText,
  Landmark,
  ArrowRight,
  Clock,
} from "lucide-react";
import { brl, formatarDataHora } from "@/lib/formato";
import {
  aprovarAnalisePreliminarAgenteAction,
  diligenciarAoSetorTecnicoAction,
  registrarRecebimentoDotacaoEEncaminharTrAction,
  registrarSolicitacaoDotacaoContabilidadeAction,
} from "@/lib/actions/fluxo-pos-etp";

const ETAPA_LABEL: Record<string, string> = {
  AGUARDANDO_DESIGNACAO_DLC: "Aguardando Designação pelo Diretor da DLC",
  ANALISE_PRELIMINAR_AGENTE: "Em Análise Preliminar pelo Agente de Contratação",
  DILIGENCIA_SETOR_TECNICO: "Em Diligência no Setor Técnico (Ajuste de ETP / Lista de Itens)",
  EM_PESQUISA_PRECOS: "Em Pesquisa de Preços",
  AGUARDANDO_DOTACAO_ORCAMENTARIA:
    "Pesquisa de Preços Concluída — Com o Agente (Solicitar Dotação à Contabilidade)",
  DOTACAO_SOLICITADA_CONTABILIDADE:
    "Dotação Solicitada à Contabilidade — Aguardando Recebimento para Encaminhar ao TR",
  ENCAMINHADO_PLANEJAMENTO_TR: "Dotação Registrada — Encaminhado ao Planejamento para Elaborar o TR",
  TR_CONCLUIDO: "Termo de Referência Concluído — Liberado para Minutas / Edital",
};

export interface ItemResumoAgente {
  nome: string;
  quantidade: number;
  valorTotalEstimado: number;
}

export default function PainelFluxoAgente({
  consolidacaoId,
  categoriaId,
  etapaFluxoPosEtp,
  analisePreliminarStatus,
  analisePreliminarEm,
  analisePreliminarObservacao,
  diligenciaAgenteAlvo,
  diligenciaAgenteMotivo,
  diligenciaAgenteEm,
  diligenciaAgenteAtendidaEm,
  pesquisaConcluidaRetornadaAgenteEm,
  dotacaoSolicitadaContabilidadeEm,
  dotacaoSolicitadaObservacao,
  dotacaoRecebidaEm,
  dotacaoOrcamentariaTexto,
  planejamentoDesignado,
  encaminhadoPlanejamentoEm,
  servidoresPlanejamento,
  etpStatus,
  pesquisaStatus,
  trStatus,
  itensConsolidados,
}: {
  consolidacaoId: string;
  categoriaId: string;
  etapaFluxoPosEtp: string | null;
  analisePreliminarStatus: string | null;
  analisePreliminarEm: string | null;
  analisePreliminarObservacao: string | null;
  diligenciaAgenteAlvo: string | null;
  diligenciaAgenteMotivo: string | null;
  diligenciaAgenteEm: string | null;
  diligenciaAgenteAtendidaEm: string | null;
  pesquisaConcluidaRetornadaAgenteEm: string | null;
  dotacaoSolicitadaContabilidadeEm: string | null;
  dotacaoSolicitadaObservacao: string | null;
  dotacaoRecebidaEm: string | null;
  dotacaoOrcamentariaTexto: string | null;
  planejamentoDesignado: { id: string; nome: string; matricula: string } | null;
  encaminhadoPlanejamentoEm: string | null;
  servidoresPlanejamento: { id: string; nome: string; matricula: string }[];
  etpStatus: "RASCUNHO" | "FINALIZADO" | null;
  pesquisaStatus: "RASCUNHO" | "FINALIZADO" | null;
  trStatus: "RASCUNHO" | "FINALIZADO" | null;
  itensConsolidados: ItemResumoAgente[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mostrarFormDiligencia, setMostrarFormDiligencia] = useState(false);

  function executar(fn: () => Promise<{ erro?: string }>, msgSucesso: string) {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      const res = await fn();
      if (res.erro) {
        setErro(res.erro);
        return;
      }
      setMensagem(msgSucesso);
      setMostrarFormDiligencia(false);
    });
  }

  const etpFinalizado = etpStatus === "FINALIZADO";
  const pesquisaFinalizada = pesquisaStatus === "FINALIZADO";
  const analiseAprovada = analisePreliminarStatus === "APROVADO";

  return (
    <div className="space-y-5">
      {/* Banner de Status Atual do Fluxo Pós-ETP */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-slate-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Fluxo Pós-ETP — Condução pelo Agente de Contratação
            </span>
            <h2 className="mt-0.5 text-sm font-bold text-slate-900">
              {etapaFluxoPosEtp
                ? (ETAPA_LABEL[etapaFluxoPosEtp] ?? etapaFluxoPosEtp)
                : etpFinalizado
                  ? "Em Análise Preliminar pelo Agente de Contratação"
                  : "Aguardando Finalização do ETP pelo Setor Técnico"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/consolidacao/${categoriaId}/dfd/${consolidacaoId}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-3.5 w-3.5 text-blue-700" />
              <span>PDF do DFD Consolidado</span>
            </a>
            {etpStatus && (
              <a
                href={`/consolidacao/${categoriaId}/etp/${consolidacaoId}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-700" />
                <span>PDF do ETP</span>
              </a>
            )}
            {pesquisaStatus && (
              <a
                href={`/pesquisa-precos/${consolidacaoId}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-700" />
                <span>PDF da Pesquisa de Preços</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{erro}</p>}
      {mensagem && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{mensagem}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ETAPA 1: ANÁLISE PRELIMINAR DO AGENTE (APROVAR OU DILIGENCIAR)        */}
      {/* ==================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              1. Análise Preliminar do Agente de Contratação (ETP e Lista de Itens)
            </h3>
            <p className="text-xs text-slate-500">
              Verifique a consistência do ETP e da Lista Consolidada de Itens. Você pode diligenciar ao Setor Técnico para correções ou aprovar e encaminhar para a Pesquisa de Preços.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              analiseAprovada
                ? "bg-emerald-100 text-emerald-800"
                : etapaFluxoPosEtp === "DILIGENCIA_SETOR_TECNICO"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
            }`}
          >
            {analiseAprovada
              ? "Análise Preliminar Aprovada"
              : etapaFluxoPosEtp === "DILIGENCIA_SETOR_TECNICO"
                ? "Em Diligência no Setor Técnico"
                : "Pendente de Análise"}
          </span>
        </div>

        {/* Resumo rápido da Lista de Itens Consolidada */}
        <details className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-slate-800">
            Ver Lista Consolidada de Itens do Processo ({itensConsolidados.length} item(ns))
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Especificação do Item</th>
                  <th className="py-1 pr-2">Qtd. Consolidada</th>
                  <th className="py-1">Valor Estimado Inicial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {itensConsolidados.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-1 pr-2 text-slate-400">{idx + 1}</td>
                    <td className="py-1 pr-2 font-medium text-slate-800">{it.nome}</td>
                    <td className="py-1 pr-2 text-slate-600">{it.quantidade}</td>
                    <td className="py-1 text-slate-600">{brl(it.valorTotalEstimado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        {/* Histórico de Diligência se houver */}
        {diligenciaAgenteMotivo && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>
                Diligência enviada ao Setor Técnico (Alvo: {diligenciaAgenteAlvo ?? "ETP / Itens"})
              </span>
            </div>
            <p className="text-amber-900">
              <b>Orientação / Inconsistência apontada:</b> {diligenciaAgenteMotivo}
            </p>
            <p className="text-[11px] text-amber-700">
              Enviada em: {diligenciaAgenteEm ? formatarDataHora(diligenciaAgenteEm) : "—"}
              {diligenciaAgenteAtendidaEm &&
                ` · Atendida pelo Setor Técnico em: ${formatarDataHora(diligenciaAgenteAtendidaEm)}`}
            </p>
          </div>
        )}

        {analiseAprovada ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
            <b>Análise Preliminar aprovada</b>
            {analisePreliminarEm ? ` em ${formatarDataHora(analisePreliminarEm)}` : ""}. Processo encaminhado ao Setor de Pesquisa de Preços.
            {analisePreliminarObservacao && (
              <p className="mt-1 text-emerald-800">Despacho: {analisePreliminarObservacao}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {!etpFinalizado && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                O ETP encontra-se aberto com o Setor Técnico (Rascunho / Em Diligência). Assim que o Setor Técnico finalizar o ETP, você poderá aprovar e seguir para a Pesquisa de Preços.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {etpFinalizado && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    executar(
                      () => aprovarAnalisePreliminarAgenteAction(consolidacaoId, fd),
                      "Análise preliminar aprovada! Processo enviado para a Pesquisa de Preços.",
                    );
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    name="observacao"
                    placeholder="Observação / despacho de aprovação (opcional)"
                    className="w-72 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Aprovar e Enviar para Pesquisa de Preços</span>
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => setMostrarFormDiligencia((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                <span>
                  {mostrarFormDiligencia
                    ? "Cancelar Diligência"
                    : "Diligenciar ao Setor Técnico (Corrigir ETP / Itens)"}
                </span>
              </button>
            </div>

            {mostrarFormDiligencia && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  executar(
                    () => diligenciarAoSetorTecnicoAction(consolidacaoId, fd),
                    "Diligência registrada e encaminhada ao Setor Técnico para correção.",
                  );
                }}
                className="rounded-xl border border-amber-300 bg-amber-50/50 p-3.5 space-y-3 text-xs"
              >
                <h4 className="font-bold text-amber-950">
                  Registrar Diligência ao Setor Técnico
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">
                      Ponto a ser corrigido pelo Setor Técnico
                    </label>
                    <select
                      name="alvo"
                      defaultValue="AMBOS"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    >
                      <option value="AMBOS">ETP e Lista de Itens</option>
                      <option value="ETP">Estudo Técnico Preliminar (ETP)</option>
                      <option value="ITENS">Lista de Itens da Consolidação</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-medium text-slate-700">
                      Descrição da inconsistência / orientação para correção *
                    </label>
                    <textarea
                      name="motivo"
                      rows={2}
                      required
                      placeholder="Descreva o que o Setor Técnico precisa ajustar no ETP e/ou na lista de itens..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Enviar Diligência ao Setor Técnico</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ETAPA 2: RETORNO DA PESQUISA, DOTAÇÃO ORÇAMENTÁRIA (CONTABILIDADE)   */}
      {/*          E ENCAMINHAMENTO AO PLANEJAMENTO (TR)                       */}
      {/* ==================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              2. Retorno da Pesquisa de Preços, Dotação Orçamentária (Contabilidade) e Envio para o TR
            </h3>
            <p className="text-xs text-slate-500">
              Após a conclusão da Pesquisa de Preços, o processo retorna a você para solicitar à Contabilidade (fora do sistema) a Dotação Orçamentária, registrar este ato e encaminhar ao Setor de Planejamento para elaborar o TR.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              encaminhadoPlanejamentoEm
                ? "bg-emerald-100 text-emerald-800"
                : pesquisaFinalizada
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {encaminhadoPlanejamentoEm
              ? "Encaminhado ao Planejamento (TR)"
              : pesquisaFinalizada
                ? "Pesquisa Concluída — Com o Agente"
                : "Aguardando Pesquisa de Preços"}
          </span>
        </div>

        {!pesquisaFinalizada ? (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>
              Aguardando o Setor de Pesquisa de Preços concluir a pesquisa e devolver o processo ao Agente de Contratação.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {pesquisaConcluidaRetornadaAgenteEm && (
              <p className="text-xs text-emerald-800 bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2">
                <b>Pesquisa de Preços concluída e retornada ao Agente</b> em{" "}
                {formatarDataHora(pesquisaConcluidaRetornadaAgenteEm)}.
              </p>
            )}

            {/* Ato 2.1: Registro de que solicitou a Dotação Orçamentária à Contabilidade */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-[#003366]" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Ato 1: Registro da Solicitação de Dotação Orçamentária à Contabilidade
                  </h4>
                </div>
                {dotacaoSolicitadaContabilidadeEm && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Solicitação Registrada em {formatarDataHora(dotacaoSolicitadaContabilidadeEm)}
                  </span>
                )}
              </div>

              {dotacaoSolicitadaContabilidadeEm ? (
                <p className="text-xs text-slate-700">
                  <b>Registro do Ato:</b>{" "}
                  {dotacaoSolicitadaObservacao ||
                    "Solicitação de informações de dotação orçamentária realizada junto à Contabilidade."}
                </p>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    executar(
                      () => registrarSolicitacaoDotacaoContabilidadeAction(consolidacaoId, fd),
                      "Ato de solicitação de Dotação Orçamentária à Contabilidade registrado no sistema!",
                    );
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    name="observacao"
                    placeholder="Ex.: Solicitação enviada à Contabilidade via Despacho SEI nº..."
                    className="flex-1 min-w-[16rem] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-[#003366] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
                  >
                    Registrar que Solicitei a Dotação à Contabilidade
                  </button>
                </form>
              )}
            </div>

            {/* Ato 2.2: Após receber a dotação, registrar e encaminhar ao Servidor do Setor de Planejamento para fazer o TR */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900">
                  Ato 2: Recebimento da Dotação Orçamentária e Encaminhamento ao Planejamento (Elaborar TR)
                </h4>
                {encaminhadoPlanejamentoEm && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Encaminhado em {formatarDataHora(encaminhadoPlanejamentoEm)}
                  </span>
                )}
              </div>

              {encaminhadoPlanejamentoEm && planejamentoDesignado && (
                <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs space-y-1">
                  <p className="text-slate-800">
                    <b>Servidor do Planejamento Designado (TR):</b> {planejamentoDesignado.nome} (Matrícula:{" "}
                    {planejamentoDesignado.matricula})
                  </p>
                  <p className="text-slate-700">
                    <b>Dotação Orçamentária Informada:</b> {dotacaoOrcamentariaTexto}
                  </p>
                </div>
              )}

              {trStatus !== "FINALIZADO" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    executar(
                      () => registrarRecebimentoDotacaoEEncaminharTrAction(consolidacaoId, fd),
                      "Dotação Orçamentária registrada e processo encaminhado ao Servidor do Setor de Planejamento para elaborar o TR!",
                    );
                  }}
                  className="space-y-3 text-xs"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-medium text-slate-700">
                        Dotação Orçamentária recebida da Contabilidade *
                      </label>
                      <textarea
                        name="dotacaoOrcamentariaTexto"
                        rows={2}
                        required
                        defaultValue={dotacaoOrcamentariaTexto ?? ""}
                        placeholder="Informe a Unidade Orçamentária, Programa de Trabalho, Natureza da Despesa, Fonte de Recursos / Despacho Contábil..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-slate-700">
                        Servidor do Setor de Planejamento (Elaboração do TR) *
                      </label>
                      <select
                        name="planejamentoDesignadoId"
                        required
                        defaultValue={planejamentoDesignado?.id ?? ""}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                      >
                        <option value="" disabled>
                          Selecione o servidor do Setor de Planejamento
                        </option>
                        {servidoresPlanejamento.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.nome} (Matrícula: {sp.matricula})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Lista alimentada automaticamente pelos servidores homologados pelo Admin como Planejamento.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-4 py-2 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
                    >
                      <span>
                        {encaminhadoPlanejamentoEm
                          ? "Atualizar Dotação / Encaminhamento ao Planejamento"
                          : "Registrar Recebimento da Dotação e Encaminhar para o TR"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

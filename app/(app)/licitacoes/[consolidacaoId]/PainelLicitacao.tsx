"use client";

import { useState, useTransition } from "react";
import { brl, formatarData, formatarDataHora } from "@/lib/formato";
import {
  statusLicitacaoInfo,
  statusLicitacaoLabel,
  type CampoStatusLicitacao,
  type StatusLicitacaoInfo,
  type StatusLicitacaoValor,
} from "@/lib/licitacao";
import {
  confirmarHomologacaoManualAction,
  designarAgenteContratacaoAction,
  registrarHomologacaoGrupoAction,
  registrarHomologacaoGrupoServicoValorAction,
  registrarHomologacaoServicoAction,
  registrarStatusLicitacaoAction,
  salvarRevisaoLicitacaoAction,
  despacharHomologacaoParaSgcAction,
} from "@/lib/actions/licitacoes";
import {
  salvarMinutaContratoAction,
  salvarMinutaAtaAction,
  registrarDiligenciaJuridicaAction,
  concluirDiligenciaJuridicaAction,
  registrarEditalDefinitivoEPublicacaoAction,
  publicarEditalViaApiPncpAction,
} from "@/lib/actions/minutas-juridico";

const PRIORIDADE_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" };
const TIPO_CONTRATACAO_LABEL: Record<string, string> = {
  NORMAL: "Contratação Normal (Contrato / Empenho)",
  ATA: "Ata de Registro de Preços (ARP)",
};
const CAMPO_LABEL: Record<CampoStatusLicitacao, string> = {
  responsavel: "Nome do servidor responsável",
  dataDiligencia: "Data da diligência",
  prazoResposta: "Prazo esperado de resposta",
  dataSessao: "Data da sessão",
  agenteNome: "Nome do agente de contratação",
  agenteMatricula: "Matrícula do agente",
};
const CAMPO_TIPO: Record<CampoStatusLicitacao, "text" | "date"> = {
  responsavel: "text",
  dataDiligencia: "date",
  prazoResposta: "date",
  dataSessao: "date",
  agenteNome: "text",
  agenteMatricula: "text",
};

interface RevisaoInfo {
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  dataEsperadaConclusao: string;
  justificativa: string;
  revisadoEm: string;
}

interface ItemLinha {
  id: string;
  nome: string;
  unidadeNome: string | null;
  tipoBem: "CONSUMO" | "PERMANENTE" | null;
  quantidade: number;
  valorTotal: number;
  precoReferencialPesquisa?: number | null;
  precoRealHomologado?: number | null;
  valorTotalHomologado?: number | null;
  fornecedorVencedor?: string | null;
  resultadoHomologacao?: "SUCESSO" | "FRACASSADO" | "DESERTO" | null;
}

interface HistoricoLinha {
  id: string;
  status: StatusLicitacaoValor;
  criadoEm: string;
  responsavel: string | null;
  dataDiligencia: string | null;
  prazoResposta: string | null;
  dataSessao: string | null;
  agenteNome: string | null;
  agenteMatricula: string | null;
}

interface GrupoMaterialProp {
  nome: string;
  quantidadeTotal: number;
  quantidadeOP: number;
  precoReferencialUnitario?: number | null;
  itens: {
    id: string;
    unidadeNome: string | null;
    enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA" | null;
    quantidade: number;
  }[];
}

interface GrupoServicoValorProp {
  nome: string;
  valorTotal: number;
  itens: { unidadeNome: string | null; enquadramento: string | null; valorTotal: number }[];
}

interface ServicoObjetoProp {
  id: string;
  nome: string;
  unidadeNome: string | null;
  valorTotal: number;
  precoReferencialPesquisa?: number | null;
}

interface MinutaContratoProp {
  status: "RASCUNHO" | "FINALIZADO";
  clausulaVigenciaProrrogacao: string;
  clausulaDotacaoOrcamentaria: string;
  clausulaReajusteRepactuacao: string;
  clausulaGarantiaContratual: string;
  clausulaObrigacoesContratada: string;
  clausulaObrigacoesContratante: string;
  clausulaFiscalizacaoGestao: string;
  clausulaExtincaoForo: string;
  responsavelNome: string | null;
  responsavelMatricula: string | null;
}

interface MinutaAtaProp {
  status: "RASCUNHO" | "FINALIZADO";
  clausulaValidadeAta: string;
  clausulaOrgaoGerenciadorParticipantes: string;
  clausulaAdesaoCarona: string;
  clausulaRevisaoCancelamentoPrecos: string;
  clausulaCadastroReserva: string;
  clausulaCondicoesFornecimento: string;
  clausulaPenalidadesAta: string;
  clausulaDisposicoesFinais: string;
  responsavelNome: string | null;
  responsavelMatricula: string | null;
}

interface DiligenciaJuridicaProp {
  id: string;
  numeroParecerSei: string;
  dataParecer: string;
  descricaoDiligencia: string;
  artefatosAfetados: string[];
  status: string;
  atendidaEm: string | null;
}

interface EditalDefinitivoProp {
  geradoEm: string | null;
  observacoes: string | null;
  aprovacaoAutoridadeSei: string | null;
  aprovacaoAutoridadeData: string | null;
  publicacaoPncpCodigo: string | null;
  publicacaoPncpData: string | null;
}

export default function PainelLicitacao({
  consolidacaoId,
  podeGerenciarStatus,
  agenteDesignado,
  agentesContratacao,
  categoriaNome,
  processoSEI,
  statusEtp,
  objetoEtp,
  statusRiscos,
  statusPesquisa,
  statusTr,
  statusMinutaEdital,
  minutaContrato,
  minutaAta,
  diligenciasJuridicas = [],
  editalDefinitivoInfo,
  dataETP,
  prioridade,
  tipoContratacao,
  dataEsperadaConclusao,
  revisao,
  itens,
  statusAtual,
  proximos,
  historico,
  homologacaoIniciada,
  gruposMaterial,
  gruposServicoValor,
  servicosObjeto,
  statusSgc,
}: {
  consolidacaoId: string;
  podeGerenciarStatus: boolean;
  agenteDesignado: { id: string; nome: string } | null;
  agentesContratacao: { id: string; nome: string }[];
  categoriaNome: string;
  processoSEI: string;
  statusEtp: "RASCUNHO" | "FINALIZADO" | null;
  objetoEtp?: string | null;
  statusRiscos?: "RASCUNHO" | "FINALIZADO" | null;
  statusPesquisa?: "RASCUNHO" | "FINALIZADO" | null;
  statusTr?: "RASCUNHO" | "FINALIZADO" | null;
  statusMinutaEdital?: "RASCUNHO" | "FINALIZADO" | null;
  minutaContrato?: MinutaContratoProp | null;
  minutaAta?: MinutaAtaProp | null;
  diligenciasJuridicas?: DiligenciaJuridicaProp[];
  editalDefinitivoInfo?: EditalDefinitivoProp;
  dataETP: string;
  prioridade: "ALTA" | "MEDIA" | "BAIXA";
  tipoContratacao: "NORMAL" | "ATA";
  dataEsperadaConclusao: string;
  revisao: RevisaoInfo | null;
  itens: ItemLinha[];
  statusAtual: StatusLicitacaoValor | null;
  proximos: StatusLicitacaoInfo[];
  historico: HistoricoLinha[];
  homologacaoIniciada: boolean;
  gruposMaterial: GrupoMaterialProp[];
  gruposServicoValor: GrupoServicoValorProp[];
  servicosObjeto: ServicoObjetoProp[];
  statusSgc?: {
    tipo: "ATA" | "CONTRATO";
    id: string;
    numeroRegistro: string;
    fornecedorNome: string | null;
    statusExecucao: string | null;
  } | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [manualAlocacao, setManualAlocacao] = useState<{
    nomeGrupo: string;
    quantidadeHomologada: number;
    valorUnitario: number;
    fornecedorVencedorCnpj?: string;
    fornecedorVencedorNome?: string;
  } | null>(null);

  function executar(fn: () => Promise<unknown>, sucesso?: string) {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      try {
        const res = (await fn()) as { erro?: string } | undefined;
        if (res && typeof res === "object" && "erro" in res && res.erro) {
          setErro(res.erro);
          return;
        }
        if (sucesso) setMensagem(sucesso);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  const semPendencias =
    homologacaoIniciada &&
    gruposMaterial.length === 0 &&
    gruposServicoValor.length === 0 &&
    servicosObjeto.length === 0;

  const badgeStatusDoc = (st?: "RASCUNHO" | "FINALIZADO" | null) => {
    if (st === "FINALIZADO") {
      return (
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
          Finalizado
        </span>
      );
    }
    if (st === "RASCUNHO") {
      return (
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
          Em ajuste / Rascunho
        </span>
      );
    }
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
        Pendente
      </span>
    );
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Processo SEI {processoSEI} — {categoriaNome}
        </h1>
        {objetoEtp && <p className="mt-1 text-xs text-slate-600">Objeto herdado do ETP: {objetoEtp}</p>}
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensagem}</p>}

      {/* Painel de Status dos Subsistemas Anteriores e Minutas (Herança sem Redigitação) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            Esteira de Subsistemas &amp; Artefatos da Contratação (Herança Automática)
          </h2>
          <span className="text-xs font-medium text-slate-500">
            Modalidade: <b>{TIPO_CONTRATACAO_LABEL[tipoContratacao]}</b>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <p className="font-semibold text-slate-700">1. ETP (Setor Técnico)</p>
            <div className="mt-1.5">{badgeStatusDoc(statusEtp)}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <p className="font-semibold text-slate-700">2. Mapa de Riscos</p>
            <div className="mt-1.5">{badgeStatusDoc(statusRiscos)}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <p className="font-semibold text-slate-700">3. Pesquisa de Preços</p>
            <div className="mt-1.5">{badgeStatusDoc(statusPesquisa)}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <p className="font-semibold text-slate-700">4. Termo de Referência</p>
            <div className="mt-1.5">{badgeStatusDoc(statusTr)}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <p className="font-semibold text-slate-700">5. Minuta de Edital</p>
            <div className="mt-1.5">{badgeStatusDoc(statusMinutaEdital)}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <p className="font-semibold text-slate-700">
              6. {tipoContratacao === "ATA" ? "Minuta de Ata (ARP)" : "Minuta de Contrato"}
            </p>
            <div className="mt-1.5">
              {badgeStatusDoc(tipoContratacao === "ATA" ? minutaAta?.status : minutaContrato?.status)}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          <b>Data do ETP:</b> {formatarData(dataETP)} &nbsp;·&nbsp; <b>Prioridade original:</b>{" "}
          {PRIORIDADE_LABEL[prioridade]} &nbsp;·&nbsp; <b>Conclusão esperada:</b> {formatarData(dataEsperadaConclusao)}
          {revisao && (
            <>
              {" "}
              &nbsp;·&nbsp; <b>Revisada para:</b> {PRIORIDADE_LABEL[revisao.prioridade]} (
              {formatarData(revisao.dataEsperadaConclusao)})
            </>
          )}
        </p>
      </div>

      {/* Designação do Agente de Contratação */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Agente de Contratação Designado</h2>
        <p className="mb-3 text-sm text-slate-700">
          {agenteDesignado ? agenteDesignado.nome : "Nenhum agente designado ainda."}
        </p>
        {podeGerenciarStatus && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              executar(() => designarAgenteContratacaoAction(consolidacaoId, formData), "Agente de Contratação designado.");
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Designar agente</label>
              <select
                name="agenteContratacaoId"
                required
                defaultValue={agenteDesignado?.id ?? ""}
                className="w-full min-w-[16rem] rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Selecione um agente de contratação
                </option>
                {agentesContratacao.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
            >
              {agenteDesignado ? "Alterar Designação" : "Designar"}
            </button>
          </form>
        )}
      </div>

      {/* Tabela de Itens do Processo com Evolução de Preços (Estimado -> Referencial Pesquisa -> Preço Real Homologado) */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Lista Consolidada de Itens ({itens.length}) — Herança Automática do ETP &amp; Pesquisa de Preços
          </h2>
          <span className="text-[11px] text-slate-500">
            Zero redigitação: itens vêm do ETP, preços referenciais vêm da Pesquisa e o Preço Real é lançado na Homologação
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="py-1.5 pr-2 font-medium">Item</th>
                <th className="py-1.5 pr-2 font-medium">Unidade</th>
                <th className="py-1.5 pr-2 font-medium">Qtd</th>
                <th className="py-1.5 pr-2 font-medium">Valor Inicial (DFD)</th>
                <th className="py-1.5 pr-2 font-medium">Preço Ref. (Pesquisa)</th>
                <th className="py-1.5 pr-2 font-semibold text-indigo-800">Preço Real Homologado</th>
                <th className="py-1.5 font-medium">Empresa Vencedora / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((it) => (
                <tr key={it.id}>
                  <td className="py-2 pr-2 font-medium text-slate-900">{it.nome}</td>
                  <td className="py-2 pr-2 text-slate-600">{it.unidadeNome ?? "Setor Técnico"}</td>
                  <td className="py-2 pr-2 text-slate-600">{it.quantidade}</td>
                  <td className="py-2 pr-2 text-slate-500">{brl(it.valorTotal)}</td>
                  <td className="py-2 pr-2 text-slate-700">
                    {it.precoReferencialPesquisa ? `${brl(it.precoReferencialPesquisa)} / un` : "—"}
                  </td>
                  <td className="py-2 pr-2 font-bold text-indigo-900">
                    {it.valorTotalHomologado ? (
                      <>
                        {brl(it.valorTotalHomologado)}
                        {it.precoRealHomologado ? (
                          <span className="block text-[10px] font-normal text-indigo-700">
                            ({brl(it.precoRealHomologado)} / un)
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-slate-700">
                    {it.resultadoHomologacao === "SUCESSO" ? (
                      <span className="inline-flex flex-col">
                        <span className="font-semibold text-emerald-700">Homologado</span>
                        {it.fornecedorVencedor && (
                          <span className="text-[10px] text-slate-500">{it.fornecedorVencedor}</span>
                        )}
                      </span>
                    ) : it.resultadoHomologacao === "FRACASSADO" ? (
                      <span className="font-semibold text-red-600">Fracassado</span>
                    ) : it.resultadoHomologacao === "DESERTO" ? (
                      <span className="font-semibold text-amber-600">Deserto</span>
                    ) : (
                      <span className="text-slate-400">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subsistema de Minutas: Minuta de Contrato (Setor de Contratos) OU Minuta de Ata ARP (Setor de Gestão de Atas) */}
      {tipoContratacao === "NORMAL" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Minuta de Contrato (Setor de Contratos — Contratação Normal)
              </h2>
              <p className="text-xs text-slate-500">
                O Objeto, a Lista de Itens, os Preços Referenciais e as regras de medição/gestão já são herdados
                automaticamente do ETP, da Pesquisa de Preços e do TR. Preencha apenas as cláusulas contratuais.
              </p>
            </div>
            {badgeStatusDoc(minutaContrato?.status)}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              executar(
                () => salvarMinutaContratoAction(consolidacaoId, fd),
                "Minuta de Contrato salva com sucesso.",
              );
            }}
            className="space-y-3 text-xs"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-slate-700">Vigência e Prorrogação (Art. 105 a 107)</label>
                <textarea
                  name="clausulaVigenciaProrrogacao"
                  rows={2}
                  defaultValue={
                    minutaContrato?.clausulaVigenciaProrrogacao ??
                    "Vigência de 12 (doze) meses a contar da assinatura, prorrogável na forma dos arts. 105 a 107 da Lei nº 14.133/2021."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Dotação Orçamentária</label>
                <textarea
                  name="clausulaDotacaoOrcamentaria"
                  rows={2}
                  defaultValue={
                    minutaContrato?.clausulaDotacaoOrcamentaria ??
                    "As despesas correrão à conta da dotação consignada no orçamento da UERN, conforme Nota de Pré-Empenho/Empenho."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Reajuste / Repactuação (IPCA / CCT)</label>
                <textarea
                  name="clausulaReajusteRepactuacao"
                  rows={2}
                  defaultValue={
                    minutaContrato?.clausulaReajusteRepactuacao ??
                    "Os preços inicialmente contratados são fixos e irreajustáveis no prazo de um ano contado da data do orçamento estimado, aplicando-se o IPCA."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Garantia Contratual</label>
                <textarea
                  name="clausulaGarantiaContratual"
                  rows={2}
                  defaultValue={
                    minutaContrato?.clausulaGarantiaContratual ??
                    "Conforme estabelecido no Termo de Referência (art. 96 da Lei nº 14.133/2021)."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Obrigações da Contratada</label>
                <textarea
                  name="clausulaObrigacoesContratada"
                  rows={2}
                  defaultValue={
                    minutaContrato?.clausulaObrigacoesContratada ??
                    "Cumprir todas as obrigações constantes deste Contrato e do Termo de Referência, mantendo a regularidade fiscal e trabalhista (SICAF)."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Obrigações da Contratante (UERN)</label>
                <textarea
                  name="clausulaObrigacoesContratante"
                  rows={2}
                  defaultValue={
                    minutaContrato?.clausulaObrigacoesContratante ??
                    "Exigir o cumprimento de todas as obrigações assumidas pela Contratada, acompanhar e fiscalizar a execução e efetuar o pagamento no prazo."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Gestão e Fiscalização (IN PROAD/UERN)</label>
                <textarea
                  name="clausulaFiscalizacaoGestao"
                  rows={2}
                  defaultValue={
                    minutaContrato?.clausulaFiscalizacaoGestao ??
                    "A execução será acompanhada por Gestor e Fiscais designados por Portaria do Gabinete da PROAD."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Extinção Contratual e Foro</label>
                <textarea
                  name="clausulaExtincaoForo"
                  rows={2}
                  defaultValue={
                    minutaContrato?.clausulaExtincaoForo ??
                    "Aplica-se o disposto nos arts. 137 a 139 da Lei nº 14.133/2021. Foro da Comarca de Mossoró/RN."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex gap-2">
                <input
                  name="responsavelNome"
                  placeholder="Servidor responsável (Setor de Contratos)"
                  defaultValue={minutaContrato?.responsavelNome ?? ""}
                  className="rounded-xl border border-slate-300 px-3 py-1.5"
                />
                <input
                  name="responsavelMatricula"
                  placeholder="Matrícula"
                  defaultValue={minutaContrato?.responsavelMatricula ?? ""}
                  className="w-32 rounded-xl border border-slate-300 px-3 py-1.5"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  name="acao"
                  value="rascunho"
                  disabled={isPending}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="submit"
                  name="acao"
                  value="finalizar"
                  disabled={isPending}
                  className="rounded-xl bg-[#003366] px-3.5 py-1.5 font-semibold text-white hover:bg-[#002244]"
                >
                  Finalizar Minuta de Contrato &amp; Enviar à AJUR/PGE
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Minuta de Ata de Registro de Preços — ARP (Setor de Gestão de Atas)
              </h2>
              <p className="text-xs text-slate-500">
                O Objeto, a Lista de Itens e os Preços Referenciais já são herdados automaticamente do ETP, da
                Pesquisa de Preços e do TR. Preencha apenas as regras próprias do Registro de Preços.
              </p>
            </div>
            {badgeStatusDoc(minutaAta?.status)}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              executar(
                () => salvarMinutaAtaAction(consolidacaoId, fd),
                "Minuta de Ata de Registro de Preços (ARP) salva com sucesso.",
              );
            }}
            className="space-y-3 text-xs"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-slate-700">Validade da Ata (Art. 84 da Lei 14.133/2021)</label>
                <textarea
                  name="clausulaValidadeAta"
                  rows={2}
                  defaultValue={
                    minutaAta?.clausulaValidadeAta ??
                    "O prazo de vigência da ata de registro de preços será de 1 (um) ano e poderá ser prorrogado, por igual período, desde que comprovado o preço vantajoso."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Órgão Gerenciador e Unidades Participantes</label>
                <textarea
                  name="clausulaOrgaoGerenciadorParticipantes"
                  rows={2}
                  defaultValue={
                    minutaAta?.clausulaOrgaoGerenciadorParticipantes ??
                    "O Órgão Gerenciador será a Universidade do Estado do Rio Grande do Norte (UERN / PROAD), contemplando as Unidades Demandantes consolidadas no PCA."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Regras de Adesão (Órgãos Não Participantes)</label>
                <textarea
                  name="clausulaAdesaoCarona"
                  rows={2}
                  defaultValue={
                    minutaAta?.clausulaAdesaoCarona ??
                    "Observados os limites de 50% por órgão e 200% no total do quantitativo de cada item registrado (art. 86, §§ 4º e 5º da Lei nº 14.133/2021)."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Revisão, Alteração e Cancelamento dos Preços</label>
                <textarea
                  name="clausulaRevisaoCancelamentoPrecos"
                  rows={2}
                  defaultValue={
                    minutaAta?.clausulaRevisaoCancelamentoPrecos ??
                    "Os preços registrados poderão ser alterados ou atualizados em decorrência de eventual redução dos preços praticados no mercado ou fato superveniente."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Cadastro de Reserva</label>
                <textarea
                  name="clausulaCadastroReserva"
                  rows={2}
                  defaultValue={
                    minutaAta?.clausulaCadastroReserva ??
                    "Será incluído na ata, na forma de anexo, o registro dos licitantes que aceitarem cotar os bens ou serviços com preços iguais aos do adjudicatário."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Condições de Fornecimento e Contratação</label>
                <textarea
                  name="clausulaCondicoesFornecimento"
                  rows={2}
                  defaultValue={
                    minutaAta?.clausulaCondicoesFornecimento ??
                    "A contratação com os fornecedores registrados na ata será formalizada por intermédio de instrumento contratual, emissão de nota de empenho ou autorização de compra no SGC."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Penalidades</label>
                <textarea
                  name="clausulaPenalidadesAta"
                  rows={2}
                  defaultValue={
                    minutaAta?.clausulaPenalidadesAta ??
                    "O descumprimento da Ata de Registro de Preços ensejará aplicação das penalidades estabelecidas no Edital e no Termo de Referência."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-slate-700">Disposições Finais</label>
                <textarea
                  name="clausulaDisposicoesFinais"
                  rows={2}
                  defaultValue={
                    minutaAta?.clausulaDisposicoesFinais ??
                    "As condições gerais de execução do objeto, tais como prazos de entrega e recebimento, constam no Termo de Referência anexo."
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex gap-2">
                <input
                  name="responsavelNome"
                  placeholder="Servidor responsável (Gestão de Atas)"
                  defaultValue={minutaAta?.responsavelNome ?? ""}
                  className="rounded-xl border border-slate-300 px-3 py-1.5"
                />
                <input
                  name="responsavelMatricula"
                  placeholder="Matrícula"
                  defaultValue={minutaAta?.responsavelMatricula ?? ""}
                  className="w-32 rounded-xl border border-slate-300 px-3 py-1.5"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  name="acao"
                  value="rascunho"
                  disabled={isPending}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
                >
                  Salvar Rascunho
                </button>
                <button
                  type="submit"
                  name="acao"
                  value="finalizar"
                  disabled={isPending}
                  className="rounded-xl bg-[#003366] px-3.5 py-1.5 font-semibold text-white hover:bg-[#002244]"
                >
                  Finalizar Minuta de Ata (ARP) &amp; Enviar à AJUR/PGE
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Fase Jurídica (AJUR / PGE) e Loop de Diligências Seletivas dentro do Sistema */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Fase Jurídica (AJUR / PGE) &amp; Encaminhamento de Diligências Internas
          </h2>
          <p className="text-xs text-slate-600">
            A análise jurídica pela AJUR/PGE ocorre fora do sistema (no SEI). Registre aqui o parecer e, caso haja
            diligências, selecione quais artefatos devem ser reabertos dentro do sistema para o setor competente ajustar.
          </p>
        </div>

        {diligenciasJuridicas.length > 0 && (
          <div className="space-y-2">
            {diligenciasJuridicas.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white p-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    Parecer SEI: {d.numeroParecerSei} ({formatarData(d.dataParecer)}) —{" "}
                    <span className={d.status === "CONCLUIDA" ? "text-emerald-700" : "text-amber-700"}>
                      {d.status === "CONCLUIDA" ? "Diligência Atendida" : "Em Cumprimento pelos Subsistemas"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-slate-600">{d.descricaoDiligencia}</p>
                  <p className="mt-1 text-[11px] font-medium text-indigo-700">
                    Artefatos reabertos para ajuste: {d.artefatosAfetados.join(", ")}
                  </p>
                </div>
                {d.status !== "CONCLUIDA" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      executar(
                        () => concluirDiligenciaJuridicaAction(d.id, consolidacaoId),
                        "Diligência jurídica marcada como atendida.",
                      )
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                  >
                    Confirmar Cumprimento da Diligência
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            executar(
              () => registrarDiligenciaJuridicaAction(consolidacaoId, fd),
              "Diligência registrada e artefatos selecionados reabertos para os setores competentes!",
            );
          }}
          className="space-y-3 rounded-xl border border-amber-200 bg-white p-3.5 text-xs"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-slate-700">Nº do Parecer / Despacho AJUR/PGE (no SEI)</label>
              <input
                name="numeroParecerSei"
                placeholder="Ex.: Parecer PGE/AJUR nº 142/2026"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Data do Parecer</label>
              <input
                name="dataParecer"
                type="date"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">Resumo das Diligências Apontadas pela AJUR/PGE</label>
            <textarea
              name="descricaoDiligencia"
              rows={2}
              required
              placeholder="Descreva os ajustes solicitados para orientação dos setores competentes"
              className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-semibold text-slate-700">
              Quais artefatos precisam ser reabertos dentro do sistema para cumprimento da diligência?
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { val: "ETP", label: "ETP (Setor Técnico)" },
                { val: "MAPA_RISCOS", label: "Mapa de Riscos (Setor Técnico)" },
                { val: "PESQUISA_PRECOS", label: "Pesquisa de Preços" },
                { val: "TERMO_REFERENCIA", label: "Termo de Referência (Planejamento)" },
                { val: "MINUTA_EDITAL", label: "Minuta de Edital (Agente de Contratação)" },
                { val: "MINUTA_CONTRATO", label: "Minuta de Contrato (Contratos)" },
                { val: "MINUTA_ATA", label: "Minuta de Ata / ARP (Gestão de Atas)" },
              ].map((op) => (
                <label key={op.val} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                  <input type="checkbox" name="artefatosAfetados" value={op.val} />
                  <span>{op.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-amber-600 px-3.5 py-1.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              Registrar Diligência &amp; Reabrir Artefatos Selecionados
            </button>
          </div>
        </form>
      </div>

      {/* Edital Definitivo + Registro da Aprovação da Autoridade (no SEI) + Publicação no PNCP */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Edital Definitivo, Aprovação da Autoridade (no SEI) &amp; Publicação no PNCP
            </h2>
            <p className="text-xs text-slate-600">
              Após cumpridas as análises e diligências jurídicas, o Agente de Contratação consolida o Edital Definitivo,
              registra a aprovação da autoridade competente (feita no SEI) e registra a publicação no PNCP com a data da sessão.
            </p>
          </div>
          {editalDefinitivoInfo?.publicacaoPncpCodigo && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Publicado no PNCP: {editalDefinitivoInfo.publicacaoPncpCodigo}
            </span>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            executar(
              () => registrarEditalDefinitivoEPublicacaoAction(consolidacaoId, fd),
              "Edital Definitivo, aprovação da autoridade e publicação no PNCP registrados! Sessão marcada.",
            );
          }}
          className="space-y-3 rounded-xl border border-blue-200 bg-white p-3.5 text-xs"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-medium text-slate-700">
                Doc. SEI de Aprovação pela Autoridade Competente (fora do sistema)
              </label>
              <input
                name="aprovacaoAutoridadeSei"
                required
                defaultValue={editalDefinitivoInfo?.aprovacaoAutoridadeSei ?? ""}
                placeholder="Ex.: Despacho Autorizativo SEI nº 98412"
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Data da Aprovação da Autoridade</label>
              <input
                name="aprovacaoAutoridadeData"
                type="date"
                defaultValue={editalDefinitivoInfo?.aprovacaoAutoridadeData?.slice(0, 10) ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Código / Protocolo de Publicação no PNCP</label>
              <input
                name="publicacaoPncpCodigo"
                required
                defaultValue={editalDefinitivoInfo?.publicacaoPncpCodigo ?? ""}
                placeholder="Ex.: PNCP-2026-EDITAL-0045"
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Data da Publicação no PNCP</label>
              <input
                name="publicacaoPncpData"
                type="date"
                defaultValue={editalDefinitivoInfo?.publicacaoPncpData?.slice(0, 10) ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Data da Sessão Pública (Compras.gov.br)</label>
              <input
                name="dataSessao"
                type="date"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-700">Agente de Contratação Responsável</label>
              <input
                name="agenteNome"
                required
                defaultValue={agenteDesignado?.nome ?? ""}
                placeholder="Nome do Agente de Contratação"
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-slate-700">
              Observações da Consolidação do Edital Definitivo
            </label>
            <input
              name="editalDefinitivoObservacoes"
              defaultValue={editalDefinitivoInfo?.observacoes ?? ""}
              placeholder="Ex.: Edital consolidado após cumprimento integral do Parecer da AJUR/PGE"
              className="w-full rounded-xl border border-slate-300 px-3 py-1.5"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                executar(
                  () => publicarEditalViaApiPncpAction(consolidacaoId),
                  "Edital publicado diretamente via API do PNCP!",
                )
              }
              title="Requer credenciais de integrador do PNCP configuradas pela STI/UERN"
              className="rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Publicar Edital no PNCP (API Direta)
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[#003366] px-4 py-2 font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
            >
              Registrar Manualmente Edital, Publicação PNCP &amp; Marcar Sessão
            </button>
          </div>
        </form>
      </div>

      {/* Registro dos Resultados da Homologação (Preço Real Homologado + Empresa Vencedora por Item/Grupo) */}
      {homologacaoIniciada && (
        <div className="space-y-4 rounded-2xl border-2 border-indigo-200 bg-white shadow-sm p-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Registrar Resultados da Homologação (Preço Real Homologado &amp; Empresa Vencedora)
            </h2>
            <p className="mt-0.5 text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
              <b>Atenção Agente de Contratação:</b> A lista de itens já vem pronta das etapas anteriores (sem precisar
              redigitar itens). Para os itens homologados, informe obrigatoriamente o{" "}
              <b>PREÇO REAL DA HOMOLOGAÇÃO (valor final vencido no certame)</b> — e <u>não</u> o preço da pesquisa — e
              os dados da <b>Empresa Vencedora</b> daquele item/grupo.
            </p>
          </div>
          {semPendencias ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Todos os itens deste processo já têm resultado e Preço Real da Homologação registrados.
            </p>
          ) : (
            <>
              {gruposMaterial.map((grupo) => (
                <GrupoMaterialForm
                  key={grupo.nome}
                  consolidacaoId={consolidacaoId}
                  grupo={grupo}
                  isPending={isPending}
                  executar={executar}
                  manualAlocacao={manualAlocacao}
                  setManualAlocacao={setManualAlocacao}
                />
              ))}

              {gruposServicoValor.length > 0 && (
                <h3 className="pt-2 text-sm font-semibold text-slate-900">Serviços de Valor Agrupado (por categoria)</h3>
              )}
              {gruposServicoValor.map((grupo) => (
                <GrupoServicoValorForm
                  key={grupo.nome}
                  consolidacaoId={consolidacaoId}
                  grupo={grupo}
                  isPending={isPending}
                  executar={executar}
                />
              ))}

              {servicosObjeto.length > 0 && (
                <h3 className="pt-2 text-sm font-semibold text-slate-900">
                  Serviços Pendentes de Resultado (objeto livre — cada um distinto)
                </h3>
              )}
              {servicosObjeto.map((it) => (
                <ServicoObjetoForm
                  key={it.id}
                  consolidacaoId={consolidacaoId}
                  item={it}
                  isPending={isPending}
                  executar={executar}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Interoperabilidade Sistêmica SGC */}
      {homologacaoIniciada && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <h2 className="text-sm font-semibold text-indigo-950">
                  Encaminhamento Automático ao SGC — Empenho, Gabinete PROAD, UCI e Contrato/Ata
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                Envia os itens homologados com seus <b>Preços Reais Homologados</b> e respectivas{" "}
                <b>Empresas Vencedoras</b> diretamente para o SGC (
                {tipoContratacao === "ATA"
                  ? "Módulo de Atas de Registro de Preço — sem exigir empenho prévio"
                  : "Fila de Registro de Empenho -> Designação de Gestor (Gabinete PROAD) -> UCI -> Contrato ou Execução Direta"}
                ).
              </p>
            </div>
            {statusSgc && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                {statusSgc.tipo === "ATA" ? `Ata: ${statusSgc.numeroRegistro}` : `SGC: ${statusSgc.numeroRegistro}`}
              </span>
            )}
          </div>

          {statusSgc ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
              <p className="font-semibold text-emerald-950">
                ✓ Homologação (com Preço Real Licitado) integrada e sincronizada com o SGC.
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-emerald-700 font-medium">Fornecedor Vencedor Principal:</span>
                  <p className="font-bold">{statusSgc.fornecedorNome || "Registrado no SGC"}</p>
                </div>
                <div>
                  <span className="text-emerald-700 font-medium">Instrumento no SGC:</span>
                  <p className="font-bold">
                    {statusSgc.tipo === "ATA"
                      ? "Ata de Registro de Preços (ARP)"
                      : "Processo em Tramitação Pós-Homologação (Empenho -> PROAD -> UCI)"}
                  </p>
                </div>
                <div>
                  <span className="text-emerald-700 font-medium">Status no SGC:</span>
                  <p className="font-bold">{statusSgc.statusExecucao || "Encaminhado ao SGC"}</p>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                executar(
                  () => despacharHomologacaoParaSgcAction(consolidacaoId, formData),
                  "Dados homologados (com Preço Real Licitado e Empresas Vencedoras) enviados ao SGC com sucesso!",
                );
              }}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 text-xs"
            >
              <p className="text-slate-600">
                Se você já informou a empresa vencedora em cada item/grupo acima, o sistema agrupará automaticamente por
                fornecedor. Caso queira definir ou sobrescrever um fornecedor padrão geral, preencha abaixo:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    CNPJ do Fornecedor Vencedor (Opcional se já lançado por item/grupo)
                  </label>
                  <input
                    name="fornecedorCnpj"
                    placeholder="00.000.000/0000-00"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-slate-700">
                    Razão Social do Fornecedor Vencedor
                  </label>
                  <input
                    name="fornecedorRazaoSocial"
                    placeholder="Nome empresarial da contratada"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {tipoContratacao === "NORMAL" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="empenhoSubstituiContrato"
                    name="empenhoSubstituiContrato"
                    value="true"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="empenhoSubstituiContrato" className="text-slate-700">
                    Entrega imediata apenas com Nota de Empenho (sem termo formal de contrato — essa opção também poderá
                    ser confirmada pelo Setor de Empenho no SGC)
                  </label>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 px-3.5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {isPending ? "Transmitindo ao SGC..." : "Encaminhar Homologação para o SGC"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {podeGerenciarStatus && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Revisar Prioridade / Data Esperada de Conclusão</h2>
          <p className="mb-3 text-xs text-slate-500">
            A marcação original do setor técnico é mantida no sistema; esta revisão fica registrada separadamente, com
            justificativa.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              executar(() => salvarRevisaoLicitacaoAction(consolidacaoId, formData), "Revisão salva.");
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nova prioridade</label>
                <select
                  name="prioridade"
                  required
                  defaultValue={revisao?.prioridade ?? prioridade}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Média</option>
                  <option value="BAIXA">Baixa</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nova data esperada de conclusão</label>
                <input
                  name="dataEsperadaConclusao"
                  type="date"
                  required
                  defaultValue={(revisao?.dataEsperadaConclusao ?? dataEsperadaConclusao).slice(0, 10)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Justificativa da revisão</label>
              <textarea
                name="justificativa"
                required
                placeholder="Explique o motivo da alteração"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
            >
              Salvar Revisão
            </button>
          </form>
        </div>
      )}

      {podeGerenciarStatus &&
        (statusAtual === "REMETIDO_GESTOR_ATA" ? (
          <div className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
            Processo remetido ao Gestor de Ata. A partir daqui, a Ata de Registro de Preços é gerida no SGC (sem exigir
            empenho prévio para o registro da Ata).
          </div>
        ) : proximos.length === 0 ? (
          <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Processo concluído — não há próxima etapa disponível.
          </div>
        ) : (
          <ProximoStatusForm
            key={proximos.map((s) => s.value).join(",")}
            consolidacaoId={consolidacaoId}
            proximos={proximos}
            isPending={isPending}
            executar={executar}
          />
        ))}

      {historico.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Histórico de Status (Timeline)</h2>
          <div className="space-y-2">
            {historico.map((h) => (
              <div key={h.id} className="rounded-md border border-slate-100 p-3 text-sm">
                <p className="font-medium text-slate-900">{statusLicitacaoLabel(h.status)}</p>
                <p className="text-xs text-slate-500">{formatarDataHora(h.criadoEm)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {[
                    h.responsavel && `Responsável: ${h.responsavel}`,
                    h.dataDiligencia && `Data da diligência: ${formatarData(h.dataDiligencia)}`,
                    h.prazoResposta && `Prazo esperado de resposta: ${formatarData(h.prazoResposta)}`,
                    h.dataSessao && `Data da sessão: ${formatarData(h.dataSessao)}`,
                    h.agenteNome &&
                      `Agente de contratação: ${h.agenteNome}${h.agenteMatricula ? ` (mat. ${h.agenteMatricula})` : ""}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProximoStatusForm({
  consolidacaoId,
  proximos,
  isPending,
  executar,
}: {
  consolidacaoId: string;
  proximos: StatusLicitacaoInfo[];
  isPending: boolean;
  executar: (fn: () => Promise<unknown>, sucesso?: string) => void;
}) {
  const [statusSelecionado, setStatusSelecionado] = useState<StatusLicitacaoValor | "">(
    proximos.find((p) => !p.intercorrencia)?.value ?? proximos[0]?.value ?? "",
  );
  const infoStatusSelecionado = statusSelecionado ? statusLicitacaoInfo(statusSelecionado) : undefined;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Registrar Próximo Status do Processo</h2>
      <p className="mb-3 text-xs text-slate-500">
        Só é possível avançar para a etapa seguinte da sequência — a etapa anterior precisa estar concluída.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          executar(() => registrarStatusLicitacaoAction(consolidacaoId, formData), "Status registrado com sucesso.");
        }}
        className="space-y-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Próxima etapa</label>
          <select
            name="status"
            required
            value={statusSelecionado}
            onChange={(e) => setStatusSelecionado(e.target.value as StatusLicitacaoValor)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            {proximos.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
                {s.intercorrencia ? " — intercorrência (se aplicável)" : ""}
              </option>
            ))}
          </select>
        </div>
        {infoStatusSelecionado?.campos.map((campo) => (
          <div key={campo}>
            <label className="mb-1 block text-xs font-medium text-slate-700">{CAMPO_LABEL[campo]}</label>
            <input
              name={campo}
              type={CAMPO_TIPO[campo]}
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ))}
        {statusSelecionado === "HOMOLOGADO" && (
          <p className="text-xs text-slate-500">
            Ao registrar este status, o quadro &quot;Registrar Resultados da Homologação&quot; acima ficará disponível
            para lançar o Preço Real Homologado e a Empresa Vencedora por item/grupo.
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
        >
          Registrar Status
        </button>
      </form>
    </div>
  );
}

function CamposFornecedorPorItem() {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-2 text-xs">
      <div>
        <label className="mb-1 block font-medium text-slate-700">CNPJ da Empresa Vencedora (deste item/grupo)</label>
        <input
          name="fornecedorVencedorCnpj"
          required
          placeholder="00.000.000/0001-00"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
        />
      </div>
      <div>
        <label className="mb-1 block font-medium text-slate-700">Razão Social da Empresa Vencedora</label>
        <input
          name="fornecedorVencedorNome"
          required
          placeholder="Razão Social da licitante vencedora"
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
        />
      </div>
    </div>
  );
}

function GrupoMaterialForm({
  consolidacaoId,
  grupo,
  isPending,
  executar,
  manualAlocacao,
  setManualAlocacao,
}: {
  consolidacaoId: string;
  grupo: GrupoMaterialProp;
  isPending: boolean;
  executar: (fn: () => Promise<unknown>, sucesso?: string) => void;
  manualAlocacao: {
    nomeGrupo: string;
    quantidadeHomologada: number;
    valorUnitario: number;
    fornecedorVencedorCnpj?: string;
    fornecedorVencedorNome?: string;
  } | null;
  setManualAlocacao: (
    v: {
      nomeGrupo: string;
      quantidadeHomologada: number;
      valorUnitario: number;
      fornecedorVencedorCnpj?: string;
      fornecedorVencedorNome?: string;
    } | null,
  ) => void;
}) {
  const [resultado, setResultado] = useState<"sucesso_total" | "sucesso_parcial" | "fracassado" | "deserto">(
    "sucesso_total",
  );
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});

  const emAlocacaoManual = manualAlocacao?.nomeGrupo === grupo.nome;
  const somaManual = Object.values(quantidades).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">
          {grupo.nome}{" "}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
            {grupo.quantidadeTotal} unidade(s) pendente(s){grupo.quantidadeOP ? ` · ${grupo.quantidadeOP} OP` : ""}
          </span>
        </p>
        {grupo.precoReferencialUnitario ? (
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
            Teto Estimado na Pesquisa (apenas referência): <b>{brl(grupo.precoReferencialUnitario)} / un</b>
          </span>
        ) : null}
      </div>
      <div className="mb-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 pr-2 font-medium">Unidade Demandante</th>
              <th className="py-1 pr-2 font-medium">Enquadramento</th>
              <th className="py-1 font-medium">Quantidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grupo.itens.map((it) => (
              <tr key={it.id}>
                <td className="py-1 pr-2">{it.unidadeNome ?? "Setor Técnico"}</td>
                <td className="py-1 pr-2">{it.enquadramento ?? "—"}</td>
                <td className="py-1">{it.quantidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {emAlocacaoManual ? (
        <div className="rounded-md border-2 border-amber-400 p-3">
          <p className="mb-2 text-xs text-slate-600">
            A quantidade homologada ({manualAlocacao.quantidadeHomologada}) não cobre todos os itens OP deste grupo (
            {grupo.quantidadeOP} unidade(s) OP no total). Indique quanto de cada linha entra nesta rodada — a soma
            precisa ser exatamente {manualAlocacao.quantidadeHomologada}.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              executar(async () => {
                await confirmarHomologacaoManualAction(consolidacaoId, formData);
                setManualAlocacao(null);
                setQuantidades({});
              }, "Alocação manual e Preço Real Homologado registrados.");
            }}
          >
            <input type="hidden" name="nomeGrupo" value={grupo.nome} />
            <input type="hidden" name="valorUnitario" value={manualAlocacao.valorUnitario} />
            <input type="hidden" name="quantidadeHomologada" value={manualAlocacao.quantidadeHomologada} />
            <input
              type="hidden"
              name="fornecedorVencedorCnpj"
              value={manualAlocacao.fornecedorVencedorCnpj ?? ""}
            />
            <input
              type="hidden"
              name="fornecedorVencedorNome"
              value={manualAlocacao.fornecedorVencedorNome ?? ""}
            />
            <table className="mb-2 w-full text-xs">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">Unidade</th>
                  <th className="py-1 pr-2 font-medium">Solicitado</th>
                  <th className="py-1 font-medium">Incluir Nesta Rodada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grupo.itens.map((it) => (
                  <tr key={it.id}>
                    <td className="py-1 pr-2">{it.unidadeNome ?? "Setor Técnico"}</td>
                    <td className="py-1 pr-2">{it.quantidade}</td>
                    <td className="py-1">
                      <input
                        type="number"
                        name={`qtd_${it.id}`}
                        min={0}
                        max={it.quantidade}
                        defaultValue={0}
                        onChange={(e) =>
                          setQuantidades((q) => ({ ...q, [it.id]: Number(e.target.value) || 0 }))
                        }
                        className="w-20 rounded-xl border border-slate-300 px-2 py-1 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p
              className={`mb-2 text-xs ${
                somaManual === manualAlocacao.quantidadeHomologada ? "text-emerald-600" : "text-red-600"
              }`}
            >
              Soma atual: {somaManual} de {manualAlocacao.quantidadeHomologada}
            </p>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-[#003366] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#002244] disabled:opacity-60"
              >
                Confirmar Alocação
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualAlocacao(null);
                  setQuantidades({});
                }}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const quantidadeHomologada = Number(formData.get("quantidadeHomologada") ?? 0);
            const valorUnitario = Number(formData.get("valorUnitario") ?? 0);
            const fornecedorVencedorCnpj = String(formData.get("fornecedorVencedorCnpj") ?? "");
            const fornecedorVencedorNome = String(formData.get("fornecedorVencedorNome") ?? "");
            if (resultado === "sucesso_parcial" && quantidadeHomologada < grupo.quantidadeOP) {
              setManualAlocacao({
                nomeGrupo: grupo.nome,
                quantidadeHomologada,
                valorUnitario,
                fornecedorVencedorCnpj,
                fornecedorVencedorNome,
              });
              return;
            }
            executar(
              () => registrarHomologacaoGrupoAction(consolidacaoId, formData),
              "Resultado e Preço Real da Homologação registrados para o grupo.",
            );
          }}
          className="space-y-2.5"
        >
          <input type="hidden" name="nomeGrupo" value={grupo.nome} />
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Resultado no Certame</label>
              <select
                name="resultado"
                value={resultado}
                onChange={(e) => setResultado(e.target.value as typeof resultado)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-64"
              >
                <option value="sucesso_total">Homologado (Sucesso) — Total</option>
                <option value="sucesso_parcial">Homologado Parcial (informar qtd)</option>
                <option value="fracassado">Fracassado</option>
                <option value="deserto">Deserto</option>
              </select>
            </div>
            {resultado === "sucesso_parcial" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Quantidade efetivamente homologada
                </label>
                <input
                  name="quantidadeHomologada"
                  type="number"
                  min={1}
                  max={grupo.quantidadeTotal - 1}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-40"
                />
              </div>
            )}
            {(resultado === "sucesso_total" || resultado === "sucesso_parcial") && (
              <div>
                <label className="mb-1 block text-xs font-bold text-indigo-900">
                  Preço Unitário REAL da Homologação (R$) *
                </label>
                <input
                  name="valorUnitario"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  placeholder="Preço real licitado"
                  className="w-full rounded-xl border-2 border-indigo-400 bg-indigo-50/30 px-3 py-2 text-sm font-semibold text-indigo-950 sm:w-48"
                />
              </div>
            )}
          </div>
          {(resultado === "sucesso_total" || resultado === "sucesso_parcial") && <CamposFornecedorPorItem />}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#003366] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
          >
            Registrar Homologação do Item/Grupo
          </button>
        </form>
      )}
    </div>
  );
}

function GrupoServicoValorForm({
  consolidacaoId,
  grupo,
  isPending,
  executar,
}: {
  consolidacaoId: string;
  grupo: GrupoServicoValorProp;
  isPending: boolean;
  executar: (fn: () => Promise<unknown>, sucesso?: string) => void;
}) {
  const [resultado, setResultado] = useState<"sucesso" | "fracassado" | "deserto">("sucesso");
  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <p className="mb-2 text-sm font-semibold text-slate-900">
        {grupo.nome}{" "}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
          Estimativa inicial: {brl(grupo.valorTotal)} ({grupo.itens.length} demanda(s))
        </span>
      </p>
      <div className="mb-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 pr-2 font-medium">Unidade Demandante</th>
              <th className="py-1 pr-2 font-medium">Enquadramento</th>
              <th className="py-1 font-medium">Valor Estimado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grupo.itens.map((it, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">{it.unidadeNome ?? "Setor Técnico"}</td>
                <td className="py-1 pr-2">{it.enquadramento ?? "—"}</td>
                <td className="py-1">{brl(it.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          executar(
            () => registrarHomologacaoGrupoServicoValorAction(consolidacaoId, formData),
            `Resultado e Preço Real Homologado registrados para o grupo "${grupo.nome}".`,
          );
        }}
        className="space-y-2.5"
      >
        <input type="hidden" name="nomeGrupo" value={grupo.nome} />
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Resultado no Certame</label>
            <select
              name="resultado"
              value={resultado}
              onChange={(e) => setResultado(e.target.value as typeof resultado)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-64"
            >
              <option value="sucesso">Homologado (Sucesso) — todo o grupo</option>
              <option value="fracassado">Fracassado</option>
              <option value="deserto">Deserto</option>
            </select>
          </div>
          {resultado === "sucesso" && (
            <div>
              <label className="mb-1 block text-xs font-bold text-indigo-900">
                Preço Total REAL da Homologação (R$) *
              </label>
              <input
                name="valorHomologado"
                type="number"
                min={0.01}
                step="0.01"
                required
                placeholder="Preço real licitado"
                className="w-full rounded-xl border-2 border-indigo-400 bg-indigo-50/30 px-3 py-2 text-sm font-semibold text-indigo-950 sm:w-48"
              />
            </div>
          )}
        </div>
        {resultado === "sucesso" && <CamposFornecedorPorItem />}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#003366] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
        >
          Registrar Homologação do Grupo
        </button>
      </form>
    </div>
  );
}

function ServicoObjetoForm({
  consolidacaoId,
  item,
  isPending,
  executar,
}: {
  consolidacaoId: string;
  item: ServicoObjetoProp;
  isPending: boolean;
  executar: (fn: () => Promise<unknown>, sucesso?: string) => void;
}) {
  const [resultado, setResultado] = useState<"sucesso" | "fracassado" | "deserto">("sucesso");
  return (
    <div className="rounded-xl border border-slate-200 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{item.nome}</p>
        {item.precoReferencialPesquisa ? (
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
            Teto na Pesquisa: <b>{brl(item.precoReferencialPesquisa)}</b>
          </span>
        ) : null}
      </div>
      <p className="mb-2 text-xs text-slate-500">
        {item.unidadeNome ?? "Setor Técnico"} · Estimativa inicial DFD: {brl(item.valorTotal)}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          executar(
            () => registrarHomologacaoServicoAction(consolidacaoId, item.id, formData),
            "Resultado e Preço Real da Homologação registrados.",
          );
        }}
        className="space-y-2.5"
      >
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Resultado no Certame</label>
            <select
              name="resultado"
              value={resultado}
              onChange={(e) => setResultado(e.target.value as typeof resultado)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-64"
            >
              <option value="sucesso">Homologado (Sucesso)</option>
              <option value="fracassado">Fracassado</option>
              <option value="deserto">Deserto</option>
            </select>
          </div>
          {resultado === "sucesso" && (
            <div>
              <label className="mb-1 block text-xs font-bold text-indigo-900">
                Preço REAL da Homologação (R$) *
              </label>
              <input
                name="valor"
                type="number"
                min={0.01}
                step="0.01"
                required
                placeholder="Preço real licitado"
                className="w-full rounded-xl border-2 border-indigo-400 bg-indigo-50/30 px-3 py-2 text-sm font-semibold text-indigo-950 sm:w-48"
              />
            </div>
          )}
        </div>
        {resultado === "sucesso" && <CamposFornecedorPorItem />}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#003366] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
        >
          Registrar Homologação
        </button>
      </form>
    </div>
  );
}

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
  registrarHomologacaoGrupoAction,
  registrarHomologacaoGrupoServicoValorAction,
  registrarHomologacaoServicoAction,
  registrarStatusLicitacaoAction,
  salvarRevisaoLicitacaoAction,
} from "@/lib/actions/licitacoes";

const PRIORIDADE_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" };
const TIPO_CONTRATACAO_LABEL: Record<string, string> = {
  NORMAL: "Contratação Normal",
  ATA: "Ata de Registro de Preços",
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
  itens: { id: string; unidadeNome: string | null; enquadramento: "OP" | "GERAL" | "CONVENIO" | null; quantidade: number }[];
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
}

export default function PainelLicitacao({
  consolidacaoId,
  categoriaNome,
  processoSEI,
  idDocumentoETP,
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
}: {
  consolidacaoId: string;
  categoriaNome: string;
  processoSEI: string;
  idDocumentoETP: string;
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
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [manualAlocacao, setManualAlocacao] = useState<{
    nomeGrupo: string;
    quantidadeHomologada: number;
    valorUnitario: number;
  } | null>(null);

  function executar(fn: () => Promise<unknown>, sucesso?: string) {
    setErro(null);
    setMensagem(null);
    startTransition(async () => {
      try {
        await fn();
        if (sucesso) setMensagem(sucesso);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  const semPendencias = homologacaoIniciada && gruposMaterial.length === 0 && gruposServicoValor.length === 0 && servicosObjeto.length === 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Processo SEI {processoSEI} — {categoriaNome}
        </h1>
      </div>

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensagem}</p>}

      <div className="space-y-1 rounded-2xl border border-slate-100 bg-white shadow-sm p-4 text-sm">
        <p>
          <b>ID do documento ETP:</b> {idDocumentoETP} &nbsp;·&nbsp; <b>Data do ETP:</b> {formatarData(dataETP)}
        </p>
        <p>
          <b>Prioridade original:</b> {PRIORIDADE_LABEL[prioridade]} &nbsp;·&nbsp; <b>Conclusão esperada original:</b>{" "}
          {formatarData(dataEsperadaConclusao)}
        </p>
        <p>
          <b>Tipo de contratação:</b> {TIPO_CONTRATACAO_LABEL[tipoContratacao]}
        </p>
        {revisao && (
          <>
            <p>
              <b>Prioridade revisada:</b> {PRIORIDADE_LABEL[revisao.prioridade]} &nbsp;·&nbsp;{" "}
              <b>Conclusão revisada:</b> {formatarData(revisao.dataEsperadaConclusao)}
            </p>
            <p className="text-xs italic text-slate-500">
              Justificativa da revisão: {revisao.justificativa} ({formatarDataHora(revisao.revisadoEm)})
            </p>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Itens do Processo ({itens.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 pr-2 font-medium">Item</th>
                <th className="py-1 pr-2 font-medium">Unidade de Origem</th>
                <th className="py-1 pr-2 font-medium">Tipo de Bem</th>
                <th className="py-1 pr-2 font-medium">Qtd</th>
                <th className="py-1 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.map((it) => (
                <tr key={it.id}>
                  <td className="py-1.5 pr-2 text-slate-900">{it.nome}</td>
                  <td className="py-1.5 pr-2 text-xs text-slate-600">{it.unidadeNome ?? "Setor Técnico"}</td>
                  <td className="py-1.5 pr-2 text-xs text-slate-600">
                    {it.tipoBem === "CONSUMO" ? "Consumo" : it.tipoBem === "PERMANENTE" ? "Permanente" : "—"}
                  </td>
                  <td className="py-1.5 pr-2 text-slate-600">{it.quantidade}</td>
                  <td className="py-1.5 text-slate-600">{brl(it.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {homologacaoIniciada && (
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-900">Registrar Resultados da Homologação</h2>
          {semPendencias ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Todos os itens deste processo já têm resultado registrado.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Itens agrupados por especificação — registre o resultado para todo o quantitativo, ou apenas
                uma parte. O restante fica pendente para uma rodada posterior, sempre priorizando os itens OP.
              </p>

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

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Revisar Prioridade / Data Esperada de Conclusão</h2>
        <p className="mb-3 text-xs text-slate-500">
          A marcação original do setor técnico é mantida no sistema; esta revisão fica registrada
          separadamente, com justificativa.
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

      {statusAtual === "REMETIDO_GESTOR_ATA" ? (
        <div className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Processo remetido ao Gestor de Ata. A partir daqui, cabe à Unidade Gestora de Ata solicitar a
          autorização de execução à PROAD — assim que autorizada, o processo avança automaticamente para
          &quot;Encaminhado para Execução&quot;.
        </div>
      ) : proximos.length === 0 ? (
        <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Processo concluído — não há próxima etapa disponível.
        </div>
      ) : (
        <ProximoStatusForm
          // Remonta do zero sempre que o conjunto de opções muda (após cada
          // avanço de status) — evita carregar seleção de uma lista antiga.
          key={proximos.map((s) => s.value).join(",")}
          consolidacaoId={consolidacaoId}
          proximos={proximos}
          isPending={isPending}
          executar={executar}
        />
      )}

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
                    h.agenteNome && `Agente de contratação: ${h.agenteNome}${h.agenteMatricula ? ` (mat. ${h.agenteMatricula})` : ""}`,
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
        Só é possível avançar para a etapa seguinte da sequência — a etapa anterior precisa estar
        concluída. Itens marcados como &quot;intercorrência&quot; são eventuais: só use se isso realmente
        ocorreu neste processo.
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
            Ao registrar este status, o quadro &quot;Registrar Resultados da Homologação&quot; acima
            ficará disponível para lançar o resultado por item.
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
  manualAlocacao: { nomeGrupo: string; quantidadeHomologada: number; valorUnitario: number } | null;
  setManualAlocacao: (v: { nomeGrupo: string; quantidadeHomologada: number; valorUnitario: number } | null) => void;
}) {
  const [resultado, setResultado] = useState<"sucesso_total" | "sucesso_parcial" | "fracassado" | "deserto">(
    "sucesso_total",
  );
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});

  const emAlocacaoManual = manualAlocacao?.nomeGrupo === grupo.nome;
  const somaManual = Object.values(quantidades).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-900">
        {grupo.nome}{" "}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
          {grupo.quantidadeTotal} unidade(s) pendente(s){grupo.quantidadeOP ? ` · ${grupo.quantidadeOP} OP` : ""}
        </span>
      </p>
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
            A quantidade homologada ({manualAlocacao.quantidadeHomologada}) não cobre todos os itens OP deste
            grupo ({grupo.quantidadeOP} unidade(s) OP no total). Indique quanto de cada linha entra nesta
            rodada — a soma precisa ser exatamente {manualAlocacao.quantidadeHomologada}.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              executar(async () => {
                await confirmarHomologacaoManualAction(consolidacaoId, formData);
                setManualAlocacao(null);
                setQuantidades({});
              }, "Alocação manual registrada.");
            }}
          >
            <input type="hidden" name="nomeGrupo" value={grupo.nome} />
            <input type="hidden" name="valorUnitario" value={manualAlocacao.valorUnitario} />
            <input type="hidden" name="quantidadeHomologada" value={manualAlocacao.quantidadeHomologada} />
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
              className={`mb-2 text-xs ${somaManual === manualAlocacao.quantidadeHomologada ? "text-emerald-600" : "text-red-600"}`}
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
            if (resultado === "sucesso_parcial" && quantidadeHomologada < grupo.quantidadeOP) {
              setManualAlocacao({ nomeGrupo: grupo.nome, quantidadeHomologada, valorUnitario });
              return;
            }
            executar(() => registrarHomologacaoGrupoAction(consolidacaoId, formData), "Resultado registrado para o grupo.");
          }}
          className="space-y-2"
        >
          <input type="hidden" name="nomeGrupo" value={grupo.nome} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Resultado</label>
            <select
              name="resultado"
              value={resultado}
              onChange={(e) => setResultado(e.target.value as typeof resultado)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-72"
            >
              <option value="sucesso_total">Sucesso — Todo o Quantitativo</option>
              <option value="sucesso_parcial">Sucesso Parcial (informar quantidade)</option>
              <option value="fracassado">Fracassado</option>
              <option value="deserto">Deserto</option>
            </select>
          </div>
          {resultado === "sucesso_parcial" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Quantidade efetivamente homologada</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-700">Valor unitário adjudicado (R$)</label>
              <input
                name="valorUnitario"
                type="number"
                min={0}
                step="0.01"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-40"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
          >
            Registrar Resultado do Grupo
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
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="mb-2 text-sm font-semibold text-slate-900">
        {grupo.nome}{" "}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
          {brl(grupo.valorTotal)} pendente(s), somando {grupo.itens.length} demanda(s)
        </span>
      </p>
      <div className="mb-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 pr-2 font-medium">Unidade Demandante</th>
              <th className="py-1 pr-2 font-medium">Enquadramento</th>
              <th className="py-1 font-medium">Valor</th>
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
            `Resultado registrado para o grupo "${grupo.nome}".`,
          );
        }}
        className="space-y-2"
      >
        <input type="hidden" name="nomeGrupo" value={grupo.nome} />
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Resultado</label>
          <select name="resultado" defaultValue="sucesso" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-72">
            <option value="sucesso">Sucesso — todo o grupo</option>
            <option value="fracassado">Fracassado</option>
            <option value="deserto">Deserto</option>
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Serviços de valor agrupado não têm quantidade fracionável — o resultado se aplica ao grupo todo. Para
          atender parte das unidades agora, registre &quot;Fracassado&quot;/&quot;Deserto&quot; e relance
          manualmente as demandas restantes numa nova consolidação, se necessário.
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
        >
          Registrar Resultado do Grupo
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
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-sm font-semibold text-slate-900">{item.nome}</p>
      <p className="mb-2 text-xs text-slate-500">
        {item.unidadeNome ?? "Setor Técnico"} · {brl(item.valorTotal)}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          executar(() => registrarHomologacaoServicoAction(consolidacaoId, item.id, formData), "Resultado registrado.");
        }}
        className="space-y-2"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Resultado</label>
          <select
            name="resultado"
            value={resultado}
            onChange={(e) => setResultado(e.target.value as typeof resultado)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-72"
          >
            <option value="sucesso">Sucesso</option>
            <option value="fracassado">Fracassado</option>
            <option value="deserto">Deserto</option>
          </select>
        </div>
        {resultado === "sucesso" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Valor adjudicado (R$)</label>
            <input
              name="valor"
              type="number"
              min={0}
              step="0.01"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-40"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
        >
          Registrar
        </button>
      </form>
    </div>
  );
}

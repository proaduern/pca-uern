"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { brl, formatarData } from "@/lib/formato";
import {
  adicionarItemTecnicoAction,
  consolidarCategoriaAction,
  editarParametrosConsolidacaoAction,
  salvarCodigoPcaCategoriaSetorAction,
  salvarCodigoPcaConsolidacaoSetorAction,
  substituirItemAction,
} from "@/lib/actions/consolidacao";

interface ItemPendente {
  origem: "dfd" | "tecnico";
  id: string;
  nome: string;
  unidadeNome: string;
  setorSolicitante?: string | null;
  processoSeiOrigem?: string | null;
  idSeiDfdOrigem?: string | null;
  codigoPncpReferencia?: string | null;
  prioridade: string | null;
  tipoBem: string | null;
  quantidade: number;
  valorUnit: number | null;
  valorTotal: number;
  substituido: boolean;
  itemOriginalNome: string | null;
}

interface ItemEmAprovacaoProad {
  id: string;
  nome: string;
  unidadeNome: string;
  setorSolicitante?: string | null;
  processoSeiOrigem?: string | null;
  idSeiDfdOrigem?: string | null;
  codigoPncpReferencia?: string | null;
  quantidade: number;
  valorTotal: number;
}

interface ItemCatalogoOpcao {
  id: string;
  item: string;
  valor: number;
}

interface ConsolidacaoHistorico {
  id: string;
  processoSEI: string;
  dataETP: string;
  prioridade: string;
  tipoContratacao: string;
  dataEsperadaConclusao: string;
  codigoPca: string | null;
  totalItens: number;
  statusEtp: "RASCUNHO" | "FINALIZADO" | null;
  statusRiscos: "RASCUNHO" | "FINALIZADO" | null;
  statusImr?: "RASCUNHO" | "FINALIZADO" | null;
}

const STATUS_DOCUMENTO_LABEL: Record<"RASCUNHO" | "FINALIZADO", string> = {
  RASCUNHO: "Rascunho",
  FINALIZADO: "Finalizado",
};

const PRIORIDADE_LABEL: Record<string, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" };
const TIPO_CONTRATACAO_LABEL: Record<string, string> = {
  NORMAL: "Contratação Normal",
  ATA: "Ata de Registro de Preços",
};

function chaveItem(origem: string, id: string) {
  return `${origem}:${id}`;
}

export default function PainelConsolidacao({
  categoriaId,
  categoriaNome,
  codigoPcaPadrao = "",
  consolidarPorObjeto = false,
  fluxoContinuo,
  pcaAno,
  processoSeiSugerido = "",
  categoriasPendentesPncp = [],
  pendentes,
  emAprovacaoProad = [],
  itensCatalogo,
  historico,
}: {
  categoriaId: string;
  categoriaNome: string;
  codigoPcaPadrao?: string;
  consolidarPorObjeto?: boolean;
  fluxoContinuo: boolean;
  pcaAno: number | null;
  processoSeiSugerido?: string;
  categoriasPendentesPncp?: string[];
  pendentes: ItemPendente[];
  emAprovacaoProad?: ItemEmAprovacaoProad[];
  itensCatalogo: ItemCatalogoOpcao[];
  historico: ConsolidacaoHistorico[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [substituindo, setSubstituindo] = useState<ItemPendente | null>(null);
  const [editandoConsolidacao, setEditandoConsolidacao] = useState<ConsolidacaoHistorico | null>(null);
  const [dataETP, setDataETP] = useState("");
  const [codigoPcaInput, setCodigoPcaInput] = useState(codigoPcaPadrao);

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

  function alternarSelecao(origem: string, id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      const chave = chaveItem(origem, id);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function selecionarTodos() {
    if (selecionados.size === pendentes.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(pendentes.map((it) => chaveItem(it.origem, it.id))));
    }
  }

  const dataMinimaConclusao = dataETP
    ? (() => {
        const d = new Date(dataETP);
        d.setDate(d.getDate() + 60);
        return d.toISOString().slice(0, 10);
      })()
    : undefined;

  if (fluxoContinuo) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">{categoriaNome}</h1>
        <p className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Esta categoria é de fluxo contínuo — os itens são executados diretamente após a
          aprovação da PROAD e nunca passam pela consolidação do setor técnico.
        </p>
      </div>
    );
  }

  const semPncpNaCategoria = !codigoPcaInput.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Categoria: {categoriaNome}</h1>
          {pcaAno && <p className="text-sm text-slate-500">PCA {pcaAno}</p>}
        </div>

        {/* Card Editável do ID PNCP da Categoria */}
        <div
          className={`rounded-xl border p-3 text-xs ${
            semPncpNaCategoria
              ? "border-amber-300 bg-amber-50/80 text-amber-950"
              : "border-emerald-200 bg-emerald-50/50 text-slate-800"
          }`}
        >
          <p className="mb-1 font-bold">
            ID de Contratação no PNCP (Código PCA {pcaAno ?? ""}) — Editável:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={codigoPcaInput}
              onChange={(e) => setCodigoPcaInput(e.target.value)}
              placeholder={`Ex: 925543-3/${pcaAno ?? 2027}`}
              disabled={isPending}
              className="w-48 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                executar(
                  () => salvarCodigoPcaCategoriaSetorAction(categoriaId, codigoPcaInput),
                  "ID do PNCP da categoria salvo com sucesso!",
                )
              }
              className="rounded-lg bg-[#003366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#002244] disabled:opacity-60"
            >
              Salvar ID PNCP
            </button>
          </div>
          {semPncpNaCategoria ? (
            <p className="mt-1 text-[11px] font-semibold text-amber-800">
              ⚠️ Esta categoria ainda está sem ID do PNCP. É obrigatório incluir o ID do PNCP para concluir o PCA e emitir o DFD Consolidado / ETP.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-emerald-800">
              ✓ ID do PNCP vinculado ({codigoPcaInput}). Você pode editá-lo acima caso necessário.
            </p>
          )}
        </div>
      </div>

      {!pcaAno && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum PCA ativo no momento.
        </div>
      )}

      {pcaAno && categoriasPendentesPncp.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950">
          <p className="font-bold">
            ⚠️ Governança do PCA {pcaAno} — Pendência de IDs do PNCP para avanço de fase ({categoriasPendentesPncp.length} categoria(s) pendente(s))
          </p>
          <p className="mt-1 leading-relaxed">
            O PCA {pcaAno} só pode seguir para as demais fases (<strong>Setores Técnicos, DFD Consolidado, ETP, Mapa de Riscos e IMR</strong>)
            depois que <strong>todos os IDs do PNCP</strong> estiverem devidamente lançados no sistema.
          </p>
          <p className="mt-1 text-[11px] text-amber-900">
            <strong>Categorias ainda sem ID PNCP:</strong> {categoriasPendentesPncp.join(" • ")}
          </p>
        </div>
      )}

      {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      {mensagem && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensagem}</p>}

      {pcaAno && (
        <>
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">
              Adicionar Item Técnico a esta Categoria
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Use isto para incluir um item que o setor técnico entende necessário, mesmo que
              nenhuma unidade tenha lançado DFD para ele.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                executar(async () => {
                  await adicionarItemTecnicoAction(categoriaId, formData);
                  form.reset();
                }, "Item técnico adicionado.");
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Descrição do item</label>
                <input name="item" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Valor unitário estimado (R$)</label>
                <input
                  name="valorUnit"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Quantidade</label>
                <input
                  name="quantidade"
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de bem</label>
                <select name="tipoBem" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="PERMANENTE">Permanente</option>
                  <option value="CONSUMO">Consumo</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Justificativa técnica</label>
                <textarea
                  name="correlacao"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
                >
                  Adicionar Item
                </button>
              </div>
            </form>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              executar(async () => {
                await consolidarCategoriaAction(categoriaId, formData);
                setSelecionados(new Set());
              }, "Categoria consolidada com sucesso.");
            }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Itens Aprovados Pendentes de Consolidação ({pendentes.length})
                </h2>
                {pendentes.length > 0 && (
                  <button
                    type="button"
                    onClick={selecionarTodos}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {selecionados.size === pendentes.length ? "Desmarcar todos" : `Selecionar todos (${pendentes.length})`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="w-10 py-1"></th>
                      <th className="py-1 pr-2 font-medium">Item</th>
                      <th className="py-1 pr-2 font-medium">Demandante / Setor</th>
                      <th className="py-1 pr-2 font-medium">Processo SEI / DFD SEI</th>
                      <th className="py-1 pr-2 font-medium">ID PNCP</th>
                      <th className="py-1 pr-2 font-medium">Prioridade</th>
                      <th className="py-1 pr-2 font-medium">Qtd</th>
                      <th className="py-1 pr-2 font-medium">Valor</th>
                      <th className="py-1 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendentes.map((it) => (
                      <tr key={chaveItem(it.origem, it.id)}>
                        <td className="py-1.5">
                          <input
                            type="checkbox"
                            name={it.origem === "dfd" ? "itemDfdId" : "itemTecnicoId"}
                            value={it.id}
                            checked={selecionados.has(chaveItem(it.origem, it.id))}
                            onChange={() => alternarSelecao(it.origem, it.id)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="py-1.5 pr-2 text-slate-900">
                          {it.nome}
                          {it.substituido && (
                            <div className="text-xs italic text-amber-700">
                              Substituído pelo setor técnico (era: {it.itemOriginalNome})
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-xs text-slate-600">
                          <div className="font-medium text-slate-800">{it.unidadeNome}</div>
                          {it.setorSolicitante && it.setorSolicitante !== it.unidadeNome && (
                            <div className="text-[11px] text-slate-500">{it.setorSolicitante}</div>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-xs font-mono text-slate-600">
                          {it.processoSeiOrigem && <div>{it.processoSeiOrigem}</div>}
                          {it.idSeiDfdOrigem && (
                            <div className="text-[10px] text-slate-500">DFD SEI: {it.idSeiDfdOrigem}</div>
                          )}
                          {!it.processoSeiOrigem && !it.idSeiDfdOrigem && "—"}
                        </td>
                        <td className="py-1.5 pr-2 text-xs font-mono">
                          {it.codigoPncpReferencia ? (
                            <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                              {it.codigoPncpReferencia}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold">Pendente</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-xs text-slate-600">{it.prioridade ?? "—"}</td>
                        <td className="py-1.5 pr-2 text-slate-600">{it.quantidade}</td>
                        <td className="py-1.5 pr-2 text-slate-600">{brl(it.valorTotal)}</td>
                        <td className="py-1.5">
                          <button
                            type="button"
                            onClick={() => setSubstituindo(it)}
                            className="text-xs text-slate-600 underline"
                          >
                            Substituir
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pendentes.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400">
                          Nenhum item aprovado pendente de consolidação nesta categoria.
                          {emAprovacaoProad.length > 0 &&
                            ` (${emAprovacaoProad.length} item(ns) estão aguardando aprovação inicial da PROAD abaixo).`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {pendentes.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-900">Consolidar Itens Selecionados</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Número do processo SEI</label>
                    <input
                      name="processoSEI"
                      required
                      defaultValue={processoSeiSugerido}
                      placeholder="Ex: 04410042.001115/2026-56"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Código PCA / ID de Contratação PNCP (Obrigatório — Editável)
                    </label>
                    <input
                      name="codigoPca"
                      required
                      value={codigoPcaInput}
                      onChange={(e) => setCodigoPcaInput(e.target.value)}
                      placeholder={`Ex: 925543-3/${pcaAno}`}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">Data de criação do ETP</label>
                    <input
                      name="dataETP"
                      type="date"
                      required
                      value={dataETP}
                      onChange={(e) => setDataETP(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Nível de prioridade (Juízo do Setor Técnico)
                    </label>
                    <select name="prioridade" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                      <option value="ALTA">Alta</option>
                      <option value="MEDIA">Média</option>
                      <option value="BAIXA">Baixa</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Tipo de contratação</label>
                    <select
                      name="tipoContratacao"
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="NORMAL">Contratação Normal (contrato/empenho)</option>
                      <option value="ATA">Ata de Registro de Preços</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Define o caminho após a licitação: contratações normais vão direto para a
                      Execução; atas passam pela Gestão de Ata e autorização da PROAD antes.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Data esperada de conclusão / entrega consolidada da demanda
                    </label>
                    <input
                      name="dataEsperadaConclusao"
                      type="date"
                      required
                      min={dataMinimaConclusao}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Data de entrega única consolidada pelo Setor Técnico (mínimo de 60 dias após a data do ETP).
                    </p>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isPending || selecionados.size === 0}
                  className="mt-4 rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
                >
                  Consolidar Itens Selecionados ({selecionados.size})
                </button>
              </div>
            )}
          </form>

          {/* Prévia dos itens desta categoria que estão em status AGUARDANDO_APROVACAO pela PROAD */}
          {emAprovacaoProad.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-amber-950">
                    Demandas Primárias desta Categoria Aguardando Aprovação da PROAD ({emAprovacaoProad.length} itens)
                  </h2>
                  <p className="text-xs text-amber-800">
                    Estes itens já foram lançados no PCA {pcaAno} e passarão automaticamente para a tabela de consolidação acima assim que a PROAD aprovar os respectivos DFDs primários.
                  </p>
                </div>
                <Link
                  href="/"
                  className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  Ir para Aprovação de DFDs (PROAD)
                </Link>
              </div>
              <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-xl border border-amber-200/80 bg-white">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-amber-50 text-left text-amber-900">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Item</th>
                      <th className="px-3 py-1.5 font-medium">Demandante / Setor</th>
                      <th className="px-3 py-1.5 font-medium">Processo SEI / DFD SEI</th>
                      <th className="px-3 py-1.5 font-medium">ID PNCP</th>
                      <th className="px-3 py-1.5 font-medium">Qtd</th>
                      <th className="px-3 py-1.5 font-medium">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {emAprovacaoProad.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-1.5 text-slate-900">{it.nome}</td>
                        <td className="px-3 py-1.5 text-slate-700">
                          <div className="font-medium">{it.unidadeNome}</div>
                          {it.setorSolicitante && it.setorSolicitante !== it.unidadeNome && (
                            <div className="text-[10px] text-slate-500">{it.setorSolicitante}</div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-600">
                          {it.processoSeiOrigem && <div>{it.processoSeiOrigem}</div>}
                          {it.idSeiDfdOrigem && <div className="text-[10px] text-slate-500">DFD: {it.idSeiDfdOrigem}</div>}
                          {!it.processoSeiOrigem && !it.idSeiDfdOrigem && "—"}
                        </td>
                        <td className="px-3 py-1.5 font-mono">
                          {it.codigoPncpReferencia ? (
                            <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                              {it.codigoPncpReferencia}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold">Sem ID PNCP</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600">{it.quantidade}</td>
                        <td className="px-3 py-1.5 font-medium text-slate-800">{brl(it.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {historico.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Consolidações Já Realizadas nesta Categoria
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">Processo SEI</th>
                  <th className="py-1 pr-2 font-medium">Data ETP</th>
                  <th className="py-1 pr-2 font-medium">Prioridade</th>
                  <th className="py-1 pr-2 font-medium">Tipo</th>
                  <th className="py-1 pr-2 font-medium">Entrega Consolidada</th>
                  <th className="py-1 pr-2 font-medium">Código PCA / ID PNCP (Editável)</th>
                  <th className="py-1 pr-2 font-medium">Itens</th>
                  <th className="py-1 font-medium">Documentos &amp; Ajustes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historico.map((c) => (
                  <tr key={c.id}>
                    <td className="py-1.5 pr-2 text-slate-900">{c.processoSEI}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{formatarData(c.dataETP)}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{PRIORIDADE_LABEL[c.prioridade]}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{TIPO_CONTRATACAO_LABEL[c.tipoContratacao]}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{formatarData(c.dataEsperadaConclusao)}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        defaultValue={c.codigoPca ?? ""}
                        placeholder="Ex: 925543-3/2027"
                        onBlur={(e) => {
                          if (e.target.value.trim() !== (c.codigoPca ?? "").trim()) {
                            executar(
                              () => salvarCodigoPcaConsolidacaoSetorAction(c.id, e.target.value),
                              "ID do PNCP da consolidação atualizado!",
                            );
                          }
                        }}
                        className="w-40 rounded-lg border border-slate-300 px-2 py-1 font-mono text-xs"
                      />
                    </td>
                    <td className="py-1.5 pr-2 text-slate-600">{c.totalItens}</td>
                    <td className="py-1.5 text-xs">
                      <div className="flex flex-col gap-1">
                        <a
                          href={`/consolidacao/${categoriaId}/dfd/${c.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#003366] underline hover:text-[#002244]"
                        >
                          📄 DFD Consolidado (PDF)
                        </a>
                        <button
                          type="button"
                          onClick={() => setEditandoConsolidacao(c)}
                          className="text-left text-slate-600 underline hover:text-slate-900"
                        >
                          Ajustar Entrega / Prioridade
                        </button>
                        <Link href={`/consolidacao/${categoriaId}/etp/${c.id}`} className="text-slate-600 underline">
                          ETP {c.statusEtp ? `(${STATUS_DOCUMENTO_LABEL[c.statusEtp]})` : "— elaborar"}
                        </Link>
                        <Link href={`/consolidacao/${categoriaId}/riscos/${c.id}`} className="text-slate-600 underline">
                          Riscos {c.statusRiscos ? `(${STATUS_DOCUMENTO_LABEL[c.statusRiscos]})` : "— elaborar"}
                        </Link>
                        <Link href={`/consolidacao/${categoriaId}/imr/${c.id}`} className="text-slate-600 underline">
                          IMR {c.statusImr ? `(${STATUS_DOCUMENTO_LABEL[c.statusImr]})` : "— elaborar"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para ajustar Data de Entrega Consolidada e Prioridade */}
      {editandoConsolidacao && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditandoConsolidacao(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Ajustar DFD Consolidado — Processo SEI {editandoConsolidacao.processoSEI}
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Defina a data única consolidada de entrega/conclusão e o juízo técnico de prioridade
              para esta consolidação.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                executar(async () => {
                  await editarParametrosConsolidacaoAction(editandoConsolidacao.id, formData);
                  setEditandoConsolidacao(null);
                }, "Data de entrega e prioridade consolidadas atualizadas com sucesso.");
              }}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Nível de Prioridade Consolidado (Juízo Técnico)
                </label>
                <select
                  name="prioridade"
                  defaultValue={editandoConsolidacao.prioridade}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Média</option>
                  <option value="BAIXA">Baixa</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Data de Entrega / Conclusão Consolidada
                </label>
                <input
                  type="date"
                  name="dataEsperadaConclusao"
                  defaultValue={editandoConsolidacao.dataEsperadaConclusao.slice(0, 10)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
                >
                  Salvar Ajustes
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoConsolidacao(null)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {substituindo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSubstituindo(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Substituir Item</h2>
            <div className="mb-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                <b>Item atual:</b> {substituindo.nome}
              </p>
              <p>
                <b>Valor unitário atual:</b> {brl(substituindo.valorUnit ?? 0)} · <b>Quantidade:</b>{" "}
                {substituindo.quantidade}
              </p>
              <p className="mt-1 text-xs text-slate-500">A quantidade solicitada é mantida — só o item muda.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const novoItemCatalogoId = String(formData.get("novoItemCatalogoId") ?? "");
                const justificativa = String(formData.get("justificativa") ?? "");
                executar(async () => {
                  await substituirItemAction(substituindo.origem, substituindo.id, novoItemCatalogoId, justificativa);
                  setSubstituindo(null);
                }, "Item substituído com sucesso.");
              }}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Substituir por</label>
                <select
                  name="novoItemCatalogoId"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecione o item substituto…</option>
                  {itensCatalogo
                    .filter((c) => c.item !== substituindo.nome)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.item} — {brl(c.valor)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Justificativa da substituição</label>
                <textarea
                  name="justificativa"
                  required
                  placeholder="Explique por que o item original não é adequado e por que o substituto atende à necessidade"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
                >
                  Confirmar Substituição
                </button>
                <button
                  type="button"
                  onClick={() => setSubstituindo(null)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

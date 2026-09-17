"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { brl, formatarData } from "@/lib/formato";
import {
  adicionarItemTecnicoAction,
  consolidarCategoriaAction,
  substituirItemAction,
} from "@/lib/actions/consolidacao";

interface ItemPendente {
  origem: "dfd" | "tecnico";
  id: string;
  nome: string;
  unidadeNome: string;
  prioridade: string | null;
  tipoBem: string | null;
  quantidade: number;
  valorUnit: number | null;
  valorTotal: number;
  substituido: boolean;
  itemOriginalNome: string | null;
}

interface ItemCatalogoOpcao {
  id: string;
  item: string;
  valor: number;
}

interface ConsolidacaoHistorico {
  id: string;
  processoSEI: string;
  idDocumentoETP: string;
  dataETP: string;
  prioridade: string;
  tipoContratacao: string;
  dataEsperadaConclusao: string;
  codigoPca: string | null;
  totalItens: number;
  statusEtp: "RASCUNHO" | "FINALIZADO" | null;
  statusRiscos: "RASCUNHO" | "FINALIZADO" | null;
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
  fluxoContinuo,
  pcaAno,
  pendentes,
  itensCatalogo,
  historico,
}: {
  categoriaId: string;
  categoriaNome: string;
  fluxoContinuo: boolean;
  pcaAno: number | null;
  pendentes: ItemPendente[];
  itensCatalogo: ItemCatalogoOpcao[];
  historico: ConsolidacaoHistorico[];
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [substituindo, setSubstituindo] = useState<ItemPendente | null>(null);
  const [dataETP, setDataETP] = useState("");

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Categoria: {categoriaNome}</h1>
        {pcaAno && <p className="text-sm text-slate-500">PCA {pcaAno}</p>}
      </div>

      {!pcaAno && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum PCA ativo no momento.
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
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Itens Pendentes de Consolidação ({pendentes.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="w-10 py-1"></th>
                      <th className="py-1 pr-2 font-medium">Item</th>
                      <th className="py-1 pr-2 font-medium">Origem</th>
                      <th className="py-1 pr-2 font-medium">Prioridade</th>
                      <th className="py-1 pr-2 font-medium">Tipo</th>
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
                        <td className="py-1.5 pr-2 text-xs text-slate-600">{it.unidadeNome}</td>
                        <td className="py-1.5 pr-2 text-xs text-slate-600">{it.prioridade ?? "—"}</td>
                        <td className="py-1.5 pr-2 text-xs text-slate-600">
                          {it.tipoBem === "CONSUMO" ? "Consumo" : it.tipoBem === "PERMANENTE" ? "Permanente" : "—"}
                        </td>
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
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          Nenhum item pendente nesta categoria.
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
                      placeholder="Ex: 00000.000000/2026-00"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">ID do documento ETP (SEI)</label>
                    <input
                      name="idDocumentoETP"
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
                    <label className="mb-1 block text-xs font-medium text-slate-700">Nível de prioridade</label>
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
                      Data esperada de conclusão da demanda
                    </label>
                    <input
                      name="dataEsperadaConclusao"
                      type="date"
                      required
                      min={dataMinimaConclusao}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Deve ser no mínimo 60 dias após a data do ETP (prazo mínimo de licitação).
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
                  <th className="py-1 pr-2 font-medium">ETP</th>
                  <th className="py-1 pr-2 font-medium">Data ETP</th>
                  <th className="py-1 pr-2 font-medium">Prioridade</th>
                  <th className="py-1 pr-2 font-medium">Tipo</th>
                  <th className="py-1 pr-2 font-medium">Conclusão Esperada</th>
                  <th className="py-1 pr-2 font-medium">Código PCA</th>
                  <th className="py-1 pr-2 font-medium">Itens</th>
                  <th className="py-1 font-medium">Documentos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historico.map((c) => (
                  <tr key={c.id}>
                    <td className="py-1.5 pr-2 text-slate-900">{c.processoSEI}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{c.idDocumentoETP}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{formatarData(c.dataETP)}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{PRIORIDADE_LABEL[c.prioridade]}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{TIPO_CONTRATACAO_LABEL[c.tipoContratacao]}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{formatarData(c.dataEsperadaConclusao)}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{c.codigoPca ?? "—"}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{c.totalItens}</td>
                    <td className="py-1.5 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <Link href={`/consolidacao/${categoriaId}/etp/${c.id}`} className="text-slate-600 underline">
                          ETP {c.statusEtp ? `(${STATUS_DOCUMENTO_LABEL[c.statusEtp]})` : "— elaborar"}
                        </Link>
                        <Link href={`/consolidacao/${categoriaId}/riscos/${c.id}`} className="text-slate-600 underline">
                          Riscos {c.statusRiscos ? `(${STATUS_DOCUMENTO_LABEL[c.statusRiscos]})` : "— elaborar"}
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

      {substituindo && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
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

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { abrirProcessoExecucaoLoteAction } from "@/lib/actions/execucao";
import { brl } from "@/lib/formato";

interface ItemPendente {
  id: string;
  origem: "DFD" | "TECNICO";
  nome: string;
  unidadeNome: string | null;
  valorAdjudicado: number;
}

interface ItemEmExecucao {
  id: string;
  nome: string;
  unidadeNome: string | null;
  valorAdjudicado: number;
  processoExecucaoId: string;
  processoSEIExecucao: string;
}

export default function PainelHomologacaoExecucao({
  consolidacaoId,
  categoriaNome,
  processoSEI,
  pendentes,
  emExecucao,
}: {
  consolidacaoId: string;
  categoriaNome: string;
  processoSEI: string;
  pendentes: ItemPendente[];
  emExecucao: ItemEmExecucao[];
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function alternar(id: string, marcado: boolean) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function abrirProcesso(formData: FormData) {
    setErro(null);
    setMensagem(null);
    if (selecionados.size === 0) {
      setErro("Selecione ao menos um item.");
      return;
    }
    for (const it of pendentes) {
      if (!selecionados.has(it.id)) continue;
      formData.append(it.origem === "DFD" ? "itemDfdId" : "itemTecnicoId", it.id);
    }
    startTransition(async () => {
      try {
        await abrirProcessoExecucaoLoteAction(consolidacaoId, formData);
        setSelecionados(new Set());
        setMensagem("Processo de execução aberto com sucesso!");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-xs text-slate-500 underline">
          ← Voltar
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">
          {categoriaNome} — Processo SEI {processoSEI}
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Itens com Êxito Pendentes de Abertura de Processo de Execução ({pendentes.length})
        </h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum item pendente — todos já possuem processo de execução aberto.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              abrirProcesso(new FormData(e.currentTarget));
            }}
            className="space-y-3"
          >
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="w-9 px-3 py-2"></th>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Unidade Demandante</th>
                    <th className="px-3 py-2 font-medium">Valor Adjudicado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendentes.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selecionados.has(it.id)}
                          onChange={(e) => alternar(it.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-900">{it.nome}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{it.unidadeNome ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{brl(it.valorAdjudicado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Número do processo SEI de execução</label>
              <input
                name="processoSEIExecucao"
                required
                placeholder="Ex: 00000.000000/2026-00"
                className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {erro && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            {mensagem && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mensagem}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? "Abrindo..." : "Abrir Processo de Execução com os Itens Selecionados"}
            </button>
          </form>
        )}
      </div>

      {emExecucao.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Itens Já em Execução ({emExecucao.length})</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Unidade Demandante</th>
                <th className="px-3 py-2 font-medium">Valor Adjudicado</th>
                <th className="px-3 py-2 font-medium">Processo de Execução</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emExecucao.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-slate-900">{it.nome}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{it.unidadeNome ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{brl(it.valorAdjudicado)}</td>
                  <td className="px-3 py-2">
                    <Link href={`/execucao/${it.processoExecucaoId}`} className="text-xs text-slate-700 underline">
                      {it.processoSEIExecucao}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { aprovarSelecionadosAction } from "@/lib/actions/admin";
import { brl, formatarDataHora } from "@/lib/formato";
import AprovacaoAcoes from "./AprovacaoAcoes";

interface PendenteResumo {
  id: string;
  descricaoSumaria: string;
  unidadeNome: string;
  prioridadeFrase: string;
  totalItens: number;
  totalValor: number;
  enviadoParaAprovacaoEm: Date | null;
}

export default function PendentesTabela({ pendentes }: { pendentes: PendenteResumo[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function alternar(id: string, marcado: boolean) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarTodos(marcado: boolean) {
    setSelecionados(marcado ? new Set(pendentes.map((p) => p.id)) : new Set());
  }

  function aprovarLote() {
    if (selecionados.size === 0) {
      setErro("Selecione ao menos um DFD.");
      return;
    }
    if (!confirm(`Aprovar ${selecionados.size} DFD(s) selecionado(s) em lote?`)) return;
    setErro(null);
    startTransition(async () => {
      try {
        await aprovarSelecionadosAction([...selecionados]);
        setSelecionados(new Set());
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="space-y-2">
      {pendentes.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            disabled={isPending}
            onClick={aprovarLote}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Aprovar Selecionados em Lote
          </button>
          {erro && <span className="text-sm text-red-600">{erro}</span>}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={pendentes.length > 0 && selecionados.size === pendentes.length}
                  onChange={(e) => alternarTodos(e.target.checked)}
                />
              </th>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Unidade</th>
              <th className="px-4 py-2 font-medium">Prioridade</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Enviado em</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendentes.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selecionados.has(d.id)}
                    onChange={(e) => alternar(d.id, e.target.checked)}
                  />
                </td>
                <td className="px-4 py-2 text-slate-900">{d.descricaoSumaria}</td>
                <td className="px-4 py-2 text-slate-600">{d.unidadeNome}</td>
                <td className="px-4 py-2 text-slate-600">{d.prioridadeFrase}</td>
                <td className="px-4 py-2 text-slate-600">{d.totalItens}</td>
                <td className="px-4 py-2 text-slate-600">{brl(d.totalValor)}</td>
                <td className="px-4 py-2 text-slate-600">{formatarDataHora(d.enviadoParaAprovacaoEm)}</td>
                <td className="px-4 py-2">
                  <AprovacaoAcoes dfdId={d.id} />
                </td>
              </tr>
            ))}
            {pendentes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhum DFD aguardando aprovação.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

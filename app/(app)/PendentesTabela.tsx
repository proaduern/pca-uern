"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { aprovarSelecionadosAction } from "@/lib/actions/admin";
import { brl } from "@/lib/formato";
import AprovacaoAcoes from "./AprovacaoAcoes";

interface PendenteResumo {
  id: string;
  ano?: number;
  numero?: number;
  descricaoSumaria: string;
  unidadeNome: string;
  setorTecnicoNome?: string;
  processoSeiOrigem?: string | null;
  idSeiDfdOrigem?: string | null;
  codigoPncp?: string | null;
  fluxoContinuo?: boolean;
  prioridadeFrase: string;
  totalItens: number;
  totalValor: number;
  enviadoParaAprovacaoEm: Date | null;
}

export default function PendentesTabela({ pendentes }: { pendentes: PendenteResumo[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const filtrados = pendentes.filter((p) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      p.descricaoSumaria.toLowerCase().includes(q) ||
      p.unidadeNome.toLowerCase().includes(q) ||
      (p.setorTecnicoNome ?? "").toLowerCase().includes(q) ||
      (p.processoSeiOrigem ?? "").toLowerCase().includes(q) ||
      (p.idSeiDfdOrigem ?? "").toLowerCase().includes(q) ||
      (p.codigoPncp ?? "").toLowerCase().includes(q)
    );
  });

  function alternar(id: string, marcado: boolean) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  }

  function alternarTodos(marcado: boolean) {
    setSelecionados(marcado ? new Set(filtrados.map((p) => p.id)) : new Set());
  }

  function aprovarLote() {
    if (selecionados.size === 0) {
      setErro("Selecione ao menos um DFD.");
      return;
    }
    if (!confirm(`Aprovar ${selecionados.size} DFD(s) selecionado(s) em lote?`)) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await aprovarSelecionadosAction([...selecionados]);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setSelecionados(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {pendentes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={isPending}
              onClick={aprovarLote}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
            >
              Aprovar Selecionados em Lote ({selecionados.size})
            </button>
            {erro && <span className="text-sm text-red-600">{erro}</span>}
          </div>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por unidade, categoria, setor técnico, SEI ou ID PNCP..."
            className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  checked={filtrados.length > 0 && filtrados.every((p) => selecionados.has(p.id))}
                  onChange={(e) => alternarTodos(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2 font-medium">DFD / Categoria e Setores</th>
              <th className="px-3 py-2 font-medium">Unidade Demandante</th>
              <th className="px-3 py-2 font-medium">Setor Técnico</th>
              <th className="px-3 py-2 font-medium">Processo SEI / DFD SEI</th>
              <th className="px-3 py-2 font-medium">ID PNCP</th>
              <th className="px-3 py-2 font-medium">Itens</th>
              <th className="px-3 py-2 font-medium">Valor Total</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selecionados.has(d.id)}
                    onChange={(e) => alternar(d.id, e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2 text-slate-900">
                  <Link href={`/dfd/${d.id}`} className="font-medium text-[#003366] hover:underline">
                    {d.numero && d.ano ? `DFD ${String(d.numero).padStart(4, "0")}/${d.ano} — ` : ""}
                    {d.descricaoSumaria}
                  </Link>
                  <div className="text-[11px] text-slate-500">Prioridade: {d.prioridadeFrase}</div>
                </td>
                <td className="px-3 py-2 font-medium text-slate-700">{d.unidadeNome}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{d.setorTecnicoNome ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">
                  {d.processoSeiOrigem && <div>{d.processoSeiOrigem}</div>}
                  {d.idSeiDfdOrigem && <div className="text-[10px] text-slate-500">DFD SEI: {d.idSeiDfdOrigem}</div>}
                  {!d.processoSeiOrigem && !d.idSeiDfdOrigem && "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {d.fluxoContinuo ? (
                    <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                      Fluxo Contínuo
                    </span>
                  ) : d.codigoPncp ? (
                    <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      {d.codigoPncp}
                    </span>
                  ) : (
                    <Link
                      href="/admin/pca"
                      className="inline-block rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-200"
                    >
                      ⚠️ Sem ID PNCP (Incluir)
                    </Link>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{d.totalItens}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{brl(d.totalValor)}</td>
                <td className="px-3 py-2">
                  <AprovacaoAcoes dfdId={d.id} />
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
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

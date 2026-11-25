"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { aprovarSelecionadosAction } from "@/lib/actions/admin";
import { adminAtualizarProcessoSeiDfdAction } from "@/lib/actions/dfd";
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

  // Estado para Edição Rápida de Processo SEI / DFD SEI
  const [editandoSei, setEditandoSei] = useState<{
    id: string;
    processoSeiOrigem: string;
    idSeiDfdOrigem: string;
    descricao: string;
  } | null>(null);
  const [salvandoSei, setSalvandoSei] = useState(false);
  const [erroSei, setErroSei] = useState<string | null>(null);

  const filtrados = pendentes.filter((p) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      p.descricaoSumaria.toLowerCase().includes(q) ||
      p.unidadeNome.toLowerCase().includes(q) ||
      (p.setorTecnicoNome ?? "").toLowerCase().includes(q) ||
      (p.processoSeiOrigem ?? "").toLowerCase().includes(q) ||
      (p.idSeiDfdOrigem ?? "").toLowerCase().includes(q)
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
            placeholder="Filtrar por unidade, categoria, setor técnico ou processo SEI..."
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
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      {d.processoSeiOrigem && <div className="text-slate-800">{d.processoSeiOrigem}</div>}
                      {d.idSeiDfdOrigem && <div className="text-[10px] text-slate-500">DFD SEI: {d.idSeiDfdOrigem}</div>}
                      {!d.processoSeiOrigem && !d.idSeiDfdOrigem && <span className="text-slate-400">Não informado</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setErroSei(null);
                        setEditandoSei({
                          id: d.id,
                          processoSeiOrigem: d.processoSeiOrigem ?? "",
                          idSeiDfdOrigem: d.idSeiDfdOrigem ?? "",
                          descricao: (d.numero && d.ano ? `DFD ${String(d.numero).padStart(4, "0")}/${d.ano} — ` : "") + d.descricaoSumaria,
                        });
                      }}
                      title="Editar Processo SEI e ID SEI do DFD"
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                    >
                      ✏️
                    </button>
                  </div>
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
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nenhum DFD aguardando aprovação.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editandoSei && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Editar Processo SEI e ID SEI do DFD
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                {editandoSei.descricao}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Processo SEI (Origem / Referência)
                </label>
                <input
                  type="text"
                  value={editandoSei.processoSeiOrigem}
                  onChange={(e) =>
                    setEditandoSei((ant) => ant && { ...ant, processoSeiOrigem: e.target.value })
                  }
                  placeholder="Ex.: 04410158.000182/2026-56"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  ID SEI do DFD (Origem / Referência)
                </label>
                <input
                  type="text"
                  value={editandoSei.idSeiDfdOrigem}
                  onChange={(e) =>
                    setEditandoSei((ant) => ant && { ...ant, idSeiDfdOrigem: e.target.value })
                  }
                  placeholder="Ex.: 40668368"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
                />
              </div>

              {erroSei && <p className="text-xs text-red-600">{erroSei}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={salvandoSei}
                onClick={() => setEditandoSei(null)}
                className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoSei}
                onClick={async () => {
                  if (!editandoSei) return;
                  setSalvandoSei(true);
                  setErroSei(null);
                  try {
                    const res = await adminAtualizarProcessoSeiDfdAction(
                      editandoSei.id,
                      editandoSei.processoSeiOrigem,
                      editandoSei.idSeiDfdOrigem,
                    );
                    if (res.erro) {
                      setErroSei(res.erro);
                    } else {
                      const pIdx = pendentes.findIndex((p) => p.id === editandoSei.id);
                      if (pIdx >= 0) {
                        pendentes[pIdx].processoSeiOrigem = editandoSei.processoSeiOrigem.trim() || null;
                        pendentes[pIdx].idSeiDfdOrigem = editandoSei.idSeiDfdOrigem.trim() || null;
                      }
                      setEditandoSei(null);
                    }
                  } catch {
                    setErroSei("Erro ao salvar dados SEI.");
                  } finally {
                    setSalvandoSei(false);
                  }
                }}
                className="rounded-xl bg-[#003366] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#002244] disabled:opacity-50"
              >
                {salvandoSei ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

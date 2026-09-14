"use client";

import { useState } from "react";

/**
 * Seleção de unidades para regras de visibilidade (categoria/item de
 * catálogo): cada unidade escolhida vira uma etiqueta com um "x" para
 * remover — evita o <select multiple> nativo, que exige Ctrl+clique e não
 * deixa claro o que já está marcado.
 */
export default function SeletorUnidadesRestritas({
  name,
  unidades,
  selecionadosIniciais,
  disabled,
}: {
  name: string;
  unidades: { id: string; nome: string }[];
  selecionadosIniciais: string[];
  disabled?: boolean;
}) {
  const [selecionados, setSelecionados] = useState<string[]>(selecionadosIniciais);
  const mapaNomes = new Map(unidades.map((u) => [u.id, u.nome]));
  const disponiveis = unidades.filter((u) => !selecionados.includes(u.id));

  function adicionar(id: string) {
    if (!id || selecionados.includes(id)) return;
    setSelecionados((atual) => [...atual, id]);
  }
  function remover(id: string) {
    setSelecionados((atual) => atual.filter((x) => x !== id));
  }

  return (
    <div className="space-y-1.5">
      {selecionados.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      {selecionados.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selecionados.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
            >
              {mapaNomes.get(id) ?? "(unidade removida)"}
              <button
                type="button"
                disabled={disabled}
                onClick={() => remover(id)}
                className="leading-none text-slate-400 hover:text-red-600 disabled:opacity-60"
                aria-label={`Remover ${mapaNomes.get(id) ?? "unidade"}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        value=""
        disabled={disabled || disponiveis.length === 0}
        onChange={(e) => adicionar(e.target.value)}
        className="block w-52 rounded-md border border-slate-300 px-2 py-1 text-xs"
      >
        <option value="">{disponiveis.length === 0 ? "Todas as unidades já adicionadas" : "+ Adicionar unidade…"}</option>
        {disponiveis.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

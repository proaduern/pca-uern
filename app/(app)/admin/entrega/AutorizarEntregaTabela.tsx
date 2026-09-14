"use client";

import { useState, useTransition } from "react";
import { autorizarEntregaSelecionadosAction } from "@/lib/actions/entrega";
import { brl } from "@/lib/formato";
import { SUBPERFIL_ENTREGA_LABEL, type SubperfilEntrega } from "@/lib/entrega";

interface ItemPendente {
  id: string;
  itemNome: string;
  unidadeNome: string;
  subperfilBens: SubperfilEntrega;
  enquadramento: string;
  processoSEIExecucao: string;
  valor: number;
}

export default function AutorizarEntregaTabela({ pendentes }: { pendentes: ItemPendente[] }) {
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

  function autorizar() {
    if (selecionados.size === 0) {
      setErro("Selecione ao menos um item.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      try {
        await autorizarEntregaSelecionadosAction([...selecionados]);
        setSelecionados(new Set());
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          disabled={isPending}
          onClick={autorizar}
          className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Autorizar Entrega dos Itens Selecionados
        </button>
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="w-9 px-3 py-2">
                <input
                  type="checkbox"
                  checked={pendentes.length > 0 && selecionados.size === pendentes.length}
                  onChange={(e) => setSelecionados(e.target.checked ? new Set(pendentes.map((p) => p.id)) : new Set())}
                />
              </th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Destinatário</th>
              <th className="px-3 py-2 font-medium">Setor Responsável</th>
              <th className="px-3 py-2 font-medium">Enquadramento</th>
              <th className="px-3 py-2 font-medium">Processo SEI Execução</th>
              <th className="px-3 py-2 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendentes.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selecionados.has(it.id)} onChange={(e) => alternar(it.id, e.target.checked)} />
                </td>
                <td className="px-3 py-2 text-slate-900">{it.itemNome}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{it.unidadeNome}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{SUBPERFIL_ENTREGA_LABEL[it.subperfilBens]}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{it.enquadramento}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{it.processoSEIExecucao}</td>
                <td className="px-3 py-2 text-slate-600">{brl(it.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

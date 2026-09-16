"use client";

import { useState, useTransition } from "react";
import {
  enviarParaAprovacaoAction,
  enviarParaUnidadeAction,
  excluirDfdAction,
  reabrirParaSetorAction,
} from "@/lib/actions/dfd";

export default function AcoesDfd({
  dfdId,
  podeEditar,
  totalItens,
  papel,
  mensagemBloqueio,
  podeReabrirParaSetor,
}: {
  dfdId: string;
  podeEditar: boolean;
  totalItens: number;
  papel: "UNIDADE" | "SETOR_INTERNO";
  mensagemBloqueio?: string;
  podeReabrirParaSetor?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!podeEditar && !podeReabrirParaSetor) {
    if (!mensagemBloqueio) return null;
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        {mensagemBloqueio}
      </div>
    );
  }

  const rodar = (fn: () => Promise<{ erro?: string } | void>) => {
    setErro(null);
    startTransition(async () => {
      const resultado = await fn();
      if (resultado?.erro) setErro(resultado.erro);
    });
  };

  return (
    <div className="space-y-2 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
      {mensagemBloqueio && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{mensagemBloqueio}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {podeEditar && papel === "UNIDADE" && (
          <button
            disabled={isPending || totalItens === 0}
            onClick={() => rodar(() => enviarParaAprovacaoAction(dfdId))}
            className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
          >
            Enviar para aprovação da PROAD
          </button>
        )}
        {podeEditar && papel === "SETOR_INTERNO" && (
          <button
            disabled={isPending || totalItens === 0}
            onClick={() => rodar(() => enviarParaUnidadeAction(dfdId))}
            className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244] disabled:opacity-60"
          >
            Enviar para revisão da Unidade
          </button>
        )}
        {podeReabrirParaSetor && (
          <button
            disabled={isPending}
            onClick={() => rodar(() => reabrirParaSetorAction(dfdId))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Reabrir para o setor editar
          </button>
        )}
        {podeEditar && (
          <button
            disabled={isPending}
            onClick={() => {
              if (!confirm("Excluir este DFD?")) return;
              rodar(() => excluirDfdAction(dfdId));
            }}
            className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Excluir
          </button>
        )}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

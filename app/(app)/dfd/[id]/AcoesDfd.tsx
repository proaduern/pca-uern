"use client";

import { useState, useTransition } from "react";
import { enviarParaAprovacaoAction, excluirDfdAction } from "@/lib/actions/dfd";

export default function AcoesDfd({
  dfdId,
  podeEditar,
  totalItens,
}: {
  dfdId: string;
  podeEditar: boolean;
  totalItens: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (!podeEditar) return null;

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex gap-3">
        <button
          disabled={isPending || totalItens === 0}
          onClick={() => {
            setErro(null);
            startTransition(async () => {
              try {
                await enviarParaAprovacaoAction(dfdId);
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Erro inesperado.");
              }
            });
          }}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          Enviar para aprovação da PROAD
        </button>
        <button
          disabled={isPending}
          onClick={() => {
            if (!confirm("Excluir este DFD?")) return;
            setErro(null);
            startTransition(async () => {
              try {
                await excluirDfdAction(dfdId);
              } catch (e) {
                setErro(e instanceof Error ? e.message : "Erro inesperado.");
              }
            });
          }}
          className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Excluir
        </button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

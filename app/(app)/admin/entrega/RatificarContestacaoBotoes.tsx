"use client";

import { useState, useTransition } from "react";
import { ratificarContestacaoAction } from "@/lib/actions/entrega";

export default function RatificarContestacaoBotoes({ entregaId }: { entregaId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function ratificar(valor: boolean) {
    setErro(null);
    startTransition(async () => {
      try {
        await ratificarContestacaoAction(entregaId, valor);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="text-right">
      <button
        disabled={isPending}
        onClick={() => ratificar(true)}
        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Ratificar (entrega não efetivada)
      </button>
      <button
        disabled={isPending}
        onClick={() => ratificar(false)}
        className="mt-1 block rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Não Ratificar (manter entrega)
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}

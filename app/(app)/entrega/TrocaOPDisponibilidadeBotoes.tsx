"use client";

import { useState, useTransition } from "react";
import { confirmarDisponibilidadeTrocaAction, indisponivelTrocaAction } from "@/lib/actions/estoque";

export default function TrocaOPDisponibilidadeBotoes({ trocaId }: { trocaId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function agir(fn: (id: string) => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await fn(trocaId);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro inesperado.");
      }
    });
  }

  return (
    <div className="text-right">
      <button
        disabled={isPending}
        onClick={() => agir(confirmarDisponibilidadeTrocaAction)}
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Confirmar Disponibilidade
      </button>
      <button
        disabled={isPending}
        onClick={() => agir(indisponivelTrocaAction)}
        className="mt-1 block rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Sem Estoque Disponível
      </button>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
